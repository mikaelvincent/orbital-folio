export const SOCIAL_ICON_LIMITS = {
  pngBytes: 5 * 1024 * 1024,
  svgBytes: 1024 * 1024,
  sourceDimension: 8192,
  sourcePixels: 16 * 1024 * 1024,
  svgElements: 10000,
  outputSize: 512,
} as const;

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

export function socialIconFileKind(file: Pick<File, 'name' | 'type'>) {
  const type = file.type.toLowerCase();
  if (type === 'image/png' || /\.png$/i.test(file.name)) return 'png';
  if (type === 'image/svg+xml' || /\.svg$/i.test(file.name)) return 'svg';
  throw new Error('Choose a PNG or SVG icon.');
}

export function validatePngIcon(bytes: Uint8Array) {
  if (
    bytes.byteLength < 33 ||
    bytes.byteLength > SOCIAL_ICON_LIMITS.pngBytes ||
    !pngSignature.every((value, index) => bytes[index] === value) ||
    String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR'
  )
    throw new Error('Choose a valid PNG icon up to 5 MiB.');
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = data.getUint32(16);
  const height = data.getUint32(20);
  if (
    !width ||
    !height ||
    width > SOCIAL_ICON_LIMITS.sourceDimension ||
    height > SOCIAL_ICON_LIMITS.sourceDimension ||
    width * height > SOCIAL_ICON_LIMITS.sourcePixels
  )
    throw new Error('Use a PNG up to 8192 pixels per side and 16 megapixels.');
  return { width, height };
}

/** Resolve CSS escapes before checking resource references. XML entities are
 * decoded by DOMParser before this is applied to each attribute/style node. */
export function assertLocalSvgResources(value: string, attribute = '') {
  const decoded = value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\\([\da-f]{1,6})\s?/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/\\(?:\r\n|\r|\n|\f)/g, '')
    .replace(/\\([^\r\n\f])/g, '$1');
  if (
    /@(?:-[\w]+-)?keyframes\b|(?:^|[;{])\s*(?:-[\w]+-)?(?:animation|transition)(?:-[\w]+)?\s*:/i.test(
      decoded,
    )
  )
    throw new Error(
      'Choose a static SVG icon without animation, or upload a PNG.',
    );
  if (
    /@import\b|@font-face\b|expression\s*\(|javascript\s*:/i.test(decoded) ||
    (/^(?:href|src|base)$/i.test(attribute) &&
      decoded.trim() &&
      !/^#[^\s]+$/.test(decoded.trim()))
  )
    throw new Error(
      'Use a self-contained SVG without linked files or fonts, or upload a PNG.',
    );
  for (const match of decoded.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi))
    if (!/^#[^\s'"()]+$/.test(match[2].trim()))
      throw new Error(
        'Use a self-contained SVG without linked files or fonts, or upload a PNG.',
      );
}

export function normalizeSvgIconSource(source: string) {
  if (
    !source.trim() ||
    new TextEncoder().encode(source).byteLength > SOCIAL_ICON_LIMITS.svgBytes
  )
    throw new Error('Choose a nonempty SVG icon up to 1 MiB.');
  if (/<!ENTITY\b|<!DOCTYPE[^>]*\[/i.test(source))
    throw new Error('Use an SVG without document entities, or upload a PNG.');
  // Ordinary SVG 1.1 exports may include a public doctype. It is unnecessary
  // for image decoding; remove it rather than resolving a remote DTD.
  const cleaned = source
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\?xml\s[^?]*\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  if (
    /<\?/.test(cleaned) ||
    /<\s*(?:[\w.-]+:)?(?:script|foreignObject|iframe|object|embed|audio|video|animate|animateMotion|animateTransform|set|discard)\b/i.test(
      cleaned,
    )
  )
    throw new Error(
      'Choose a static SVG icon without scripts or embedded web content.',
    );
  if (
    (cleaned.match(/<\s*[A-Za-z_]/g) || []).length >
    SOCIAL_ICON_LIMITS.svgElements
  )
    throw new Error(
      'This SVG is too complex for an icon. Upload a PNG instead.',
    );
  assertLocalSvgResources(cleaned);
  return cleaned;
}

export function socialIconRasterSize(
  width: number,
  height: number,
  maximum: number = SOCIAL_ICON_LIMITS.outputSize,
) {
  if (
    ![width, height, maximum].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  )
    throw new Error(
      'This icon has invalid dimensions. Choose another PNG or SVG.',
    );
  const scale = Math.min(1, maximum / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function svgDimension(value: string | null, fallback: number) {
  if (!value) return fallback;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(px|pt|pc|mm|cm|in)?$/i);
  if (!match) return fallback;
  const scale: Record<string, number> = {
    px: 1,
    pt: 96 / 72,
    pc: 16,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
    in: 96,
  };
  const result =
    Number(match[1]) * (scale[(match[2] || 'px').toLowerCase()] || 1);
  return Number.isFinite(result) && result > 0 ? result : fallback;
}

export function svgIconViewport(
  widthAttribute: string | null,
  heightAttribute: string | null,
  viewBoxAttribute: string | null,
) {
  const viewBox = (viewBoxAttribute || '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const hasViewBox =
    viewBox.length === 4 &&
    viewBox.every(Number.isFinite) &&
    viewBox[2] > 0 &&
    viewBox[3] > 0;
  const explicitWidth = svgDimension(widthAttribute, Number.NaN);
  const explicitHeight = svgDimension(heightAttribute, Number.NaN);
  const width =
    explicitWidth ||
    (hasViewBox
      ? explicitHeight
        ? (explicitHeight * viewBox[2]) / viewBox[3]
        : viewBox[2]
      : 300);
  const height =
    explicitHeight ||
    (hasViewBox
      ? explicitWidth
        ? (explicitWidth * viewBox[3]) / viewBox[2]
        : viewBox[3]
      : 150);
  if (
    ![width, height].every(
      (dimension) => Number.isFinite(dimension) && dimension > 0,
    )
  )
    throw new Error(
      'This SVG has invalid dimensions. Choose another SVG or a PNG.',
    );
  return { width, height, hasViewBox };
}

function rasterSvgSource(source: string) {
  const document = new DOMParser().parseFromString(
    normalizeSvgIconSource(source),
    'image/svg+xml',
  );
  const svg = document.documentElement;
  if (
    svg.localName !== 'svg' ||
    (svg.namespaceURI && svg.namespaceURI !== 'http://www.w3.org/2000/svg') ||
    document.querySelector('parsererror')
  )
    throw new Error('This SVG could not be read. Choose another SVG or a PNG.');
  const elements = [svg, ...Array.from(svg.querySelectorAll('*'))];
  if (elements.length > SOCIAL_ICON_LIMITS.svgElements)
    throw new Error(
      'This SVG is too complex for an icon. Upload a PNG instead.',
    );
  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.localName))
        throw new Error('Choose a static SVG icon without scripts.');
      assertLocalSvgResources(attribute.value, attribute.localName);
    }
    if (element.localName === 'style')
      assertLocalSvgResources(element.textContent || '');
  }
  const { width, height, hasViewBox } = svgIconViewport(
    svg.getAttribute('width'),
    svg.getAttribute('height'),
    svg.getAttribute('viewBox'),
  );
  if (!hasViewBox) svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const scale = SOCIAL_ICON_LIMITS.outputSize / Math.max(width, height);
  const renderedWidth = Math.max(1, Math.round(width * scale));
  const renderedHeight = Math.max(1, Math.round(height * scale));
  svg.setAttribute('width', String(renderedWidth));
  svg.setAttribute('height', String(renderedHeight));
  svg.setAttribute(
    'style',
    `${svg.getAttribute('style') || ''};width:${renderedWidth}px!important;height:${renderedHeight}px!important`,
  );
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(svg);
}

/** Decode both formats before upload. SVG stays in the restricted image context;
 * small PNG output also avoids oversized multipart requests for large PNG icons. */
export async function prepareSocialIconUpload(file: File): Promise<File> {
  const kind = socialIconFileKind(file);
  const limit =
    kind === 'png' ? SOCIAL_ICON_LIMITS.pngBytes : SOCIAL_ICON_LIMITS.svgBytes;
  if (!file.size || file.size > limit)
    throw new Error(
      kind === 'png'
        ? 'Choose a nonempty PNG icon up to 5 MiB.'
        : 'Choose a nonempty SVG icon up to 1 MiB.',
    );
  if (kind === 'png') validatePngIcon(new Uint8Array(await file.arrayBuffer()));
  const source =
    kind === 'svg'
      ? new Blob([rasterSvgSource(await file.text())], {
          type: 'image/svg+xml',
        })
      : new Blob([file], { type: 'image/png' });
  // The existing img-src policy allows data: images, but intentionally excludes
  // blob:. Keep decoding inside Image without changing that application policy.
  const sourceUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const finish = (error?: Error) => {
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
      if (error) reject(error);
      else if (typeof reader.result === 'string') resolve(reader.result);
      else
        reject(
          new Error('This icon could not be read. Choose another PNG or SVG.'),
        );
    };
    reader.onload = () => finish();
    reader.onerror = reader.onabort = () =>
      finish(
        new Error('This icon could not be read. Choose another PNG or SVG.'),
      );
    reader.readAsDataURL(source);
  });
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        image.src = '';
        reject(
          new Error(
            'This icon took too long to load. Choose a simpler SVG or a smaller PNG.',
          ),
        );
      }, 5000);
      image.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      image.onerror = () => {
        clearTimeout(timer);
        reject(
          new Error('This icon could not be read. Choose another PNG or SVG.'),
        );
      };
      image.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    const size = socialIconRasterSize(image.naturalWidth, image.naturalHeight);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error(
        'Image conversion is unavailable in this browser. Upload a PNG.',
      );
    const encode = () =>
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(
                  new Error('This icon could not be prepared for upload.'),
                ),
          'image/png',
        ),
      );
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let png = await encode();
    // A noisy 512px RGBA PNG can exceed a transport's 1 MiB multipart cap.
    if (png.size > 768 * 1024) {
      const smaller = socialIconRasterSize(
        image.naturalWidth,
        image.naturalHeight,
        384,
      );
      canvas.width = smaller.width;
      canvas.height = smaller.height;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      png = await encode();
    }
    return new File([png], file.name.replace(/\.(?:svg|png)$/i, '') + '.png', {
      type: 'image/png',
    });
  } finally {
    image.onload = null;
    image.onerror = null;
    image.src = '';
  }
}
