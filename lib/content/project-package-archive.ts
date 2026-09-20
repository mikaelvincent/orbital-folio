import { Unzip, UnzipInflate } from 'fflate';
import { HttpError } from '../http-error.ts';
import { mimeForFilename } from './media-upload.ts';

export const PROJECT_PACKAGE_LIMITS = {
  compressed: 16 * 1024 * 1024,
  expanded: 24 * 1024 * 1024,
  entries: 100,
  document: 256 * 1024,
} as const;
const documentName = 'project.md';
const decoder = new TextDecoder('utf-8', { fatal: true });
function invalid(message: string): never {
  throw new HttpError(400, message);
}

export function safePackagePath(path: string, directory = false) {
  if (
    path.length > 200 ||
    path.includes('\\') ||
    path
      .split('')
      .some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ) ||
    path.startsWith('/') ||
    path.includes('%') ||
    path.includes(':')
  )
    return false;
  const parts = (directory ? path.replace(/\/$/, '') : path).split('/');
  if (parts.some((p) => !p || p === '.' || p === '..' || p.trim() !== p))
    return false;
  return (
    path === documentName || path === 'assets/' || path.startsWith('assets/')
  );
}

/** Validate central/local ZIP headers before inflating. ZIP64/encryption/symlinks
 * are unnecessary for these small document packages and are rejected. */
function archiveDirectory(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (
      view.getUint32(i, true) === 0x06054b50 &&
      i + 22 + view.getUint16(i + 20, true) === bytes.length
    ) {
      end = i;
      break;
    }
  }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true))
    invalid('Use a complete, single-disk ZIP package.');
  const count = view.getUint16(end + 10, true);
  const size = view.getUint32(end + 12, true);
  let offset = view.getUint32(end + 16, true);
  if (
    !count ||
    count > PROJECT_PACKAGE_LIMITS.entries ||
    count !== view.getUint16(end + 8, true) ||
    offset + size !== end
  )
    invalid('The ZIP has too many entries or unsupported ZIP metadata.');
  const files = new Map<string, { size: number; crc: number }>();
  let total = 0;
  const occupied: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50)
      invalid('Invalid ZIP directory.');
    const flags = view.getUint16(offset + 8, true);
    const compression = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true);
    const expanded = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > end || local + 30 > view.getUint32(end + 16, true))
      invalid('Invalid ZIP entry.');
    const name = decoder.decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );
    const isDirectory = name.endsWith('/');
    const unixType = (view.getUint32(offset + 38, true) >>> 16) & 0xf000;
    if (
      flags & 1 ||
      ![0, 8].includes(compression) ||
      (unixType && unixType !== 0x8000 && unixType !== 0x4000)
    )
      invalid(
        'Encrypted files, links and this compression method are not supported.',
      );
    if (!safePackagePath(name, isDirectory) || files.has(name))
      invalid(
        'ZIP paths must be unique project.md or files inside assets/; traversal and unsafe names are not allowed.',
      );
    if (isDirectory && expanded) invalid('ZIP directories must be empty.');
    if (!isDirectory && name !== documentName && !mimeForFilename(name))
      invalid(
        `Unsupported asset: ${name}. Use PNG, JPEG, WebP, GIF, MP4, WebM or WebVTT.`,
      );
    if (
      view.getUint32(local, true) !== 0x04034b50 ||
      view.getUint16(local + 6, true) !== flags ||
      view.getUint16(local + 8, true) !== compression
    )
      invalid('ZIP local and directory headers disagree.');
    const localNameLength = view.getUint16(local + 26, true);
    const start =
      local + 30 + localNameLength + view.getUint16(local + 28, true);
    if (
      start + compressed > view.getUint32(end + 16, true) ||
      decoder.decode(
        bytes.subarray(local + 30, local + 30 + localNameLength),
      ) !== name
    )
      invalid('ZIP local paths or sizes disagree.');
    if (occupied.some(([a, b]) => local < b && start + compressed > a))
      invalid('ZIP entries overlap.');
    occupied.push([local, start + compressed]);
    total += expanded;
    if (
      total > PROJECT_PACKAGE_LIMITS.expanded ||
      (name === documentName && expanded > PROJECT_PACKAGE_LIMITS.document)
    )
      throw new HttpError(413, 'The expanded project package is too large.');
    files.set(name, { size: expanded, crc: view.getUint32(offset + 16, true) });
    offset = next;
  }
  if (offset !== end || !files.has(documentName))
    invalid('The ZIP must contain project.md at its root.');
  return files;
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++)
    crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  return crc >>> 0;
});
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function readProjectArchive(bytes: Uint8Array): Map<string, Uint8Array> {
  if (!bytes.length || bytes.length > PROJECT_PACKAGE_LIMITS.compressed)
    throw new HttpError(413, 'Choose a project ZIP no larger than 16 MiB.');
  try {
    const directory = archiveDirectory(bytes);
    const files = new Map<string, Uint8Array>();
    let expanded = 0;
    const encountered = new Set<string>();
    const unzip = new Unzip((file) => {
      const expected = directory.get(file.name);
      if (!expected || encountered.has(file.name))
        invalid('ZIP entry is missing or repeated in the directory.');
      encountered.add(file.name);
      const chunks: Uint8Array[] = [];
      let length = 0;
      file.ondata = (error, data, final) => {
        if (error) throw error;
        length += data.length;
        expanded += data.length;
        if (
          length > expected.size ||
          expanded > PROJECT_PACKAGE_LIMITS.expanded
        ) {
          file.terminate();
          throw new HttpError(413, 'The ZIP expands beyond its declared size.');
        }
        chunks.push(data);
        if (final) {
          if (length !== expected.size)
            invalid('ZIP asset length does not match its directory.');
          const output = new Uint8Array(length);
          let cursor = 0;
          for (const chunk of chunks) {
            output.set(chunk, cursor);
            cursor += chunk.length;
          }
          if (crc32(output) !== expected.crc)
            invalid('A ZIP asset is damaged (checksum mismatch).');
          if (!file.name.endsWith('/')) files.set(file.name, output);
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    // A 1 KiB compressed chunk also bounds a malicious DEFLATE burst before the
    // emitted length can be checked; never allocate from untrusted header sizes.
    for (let offset = 0; offset < bytes.length; offset += 1024)
      unzip.push(
        bytes.subarray(offset, offset + 1024),
        offset + 1024 >= bytes.length,
      );
    if (
      encountered.size !== directory.size ||
      [...directory.keys()].some(
        (name) => !name.endsWith('/') && !files.has(name),
      )
    )
      invalid('The ZIP is incomplete.');
    return files;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      400,
      'The ZIP could not be read. Use a valid UTF-8 project package.',
    );
  }
}
