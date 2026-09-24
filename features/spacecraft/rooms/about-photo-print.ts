import { PALETTE } from '../../../lib/palette.ts';
import {
  imageCropRect,
  type AboutPhoto,
  type AboutIcon,
} from '../../../lib/content/about-photos.ts';
import {
  socialIcon,
  type SocialLink,
} from '../../../lib/content/social-links.ts';
import { drawStudyArtwork } from './about-study-artwork.ts';

/** Four static paper textures. Original uploads are never modified; each print
 * is composed once initially and again when its selected image loads.
 * Missing/failed images preserve the authored fallback, including a real link's
 * platform identity. No asynchronous work survives scene disposal.
 */
export function createAboutPhotoPrints(THREE: any, onChange = () => {}) {
  let disposed = false;
  const pending: Promise<void>[] = [];
  const cancelLoads: (() => void)[] = [];
  const images = new Map<string, Promise<HTMLImageElement | null>>();
  function load(url: string) {
    if (!images.has(url)) {
      images.set(
        url,
        new Promise((resolve) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          let done = false;
          const finish = (loaded: boolean) => {
            if (done) return;
            done = true;
            clearTimeout(timeout);
            image.onload = image.onerror = null;
            if (!loaded) image.removeAttribute('src');
            resolve(loaded && !disposed ? image : null);
          };
          const timeout = setTimeout(() => finish(false), 8000);
          cancelLoads.push(() => finish(false));
          image.onload = () =>
            finish(image.naturalWidth > 0 && image.naturalHeight > 0);
          image.onerror = () => finish(false);
          image.src = url;
        }),
      );
    }
    return images.get(url)!;
  }
  function texture(
    kind: string,
    width: number,
    height: number,
    photo?: AboutPhoto | null,
    social?: { link: SocialLink; icon: AboutIcon | null },
  ) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const map = new THREE.CanvasTexture(canvas);
    map.name = `personal-study-${kind}-texture`;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    let image: HTMLImageElement | null = null;
    const paint = () => {
      if (disposed) return;
      ctx.clearRect(0, 0, width, height);
      if (!social) {
        // The landscape fallback has a different source aspect from the frame.
        ctx.save();
        const fallbackWidth = height * 1.6;
        ctx.translate((width - fallbackWidth) / 2, 0);
        ctx.scale(fallbackWidth / width, 1);
        drawStudyArtwork(ctx, kind);
        ctx.restore();
      } else {
        ctx.fillStyle = PALETTE.ivory;
        ctx.fillRect(0, 0, width, height);
      }
      if (social) {
        // The mark and destination are printed on the same matte paper.
        // Custom icons retain their complete aspect and transparency.
        // Half a 0.38-unit card closely matches Contact's 0.186-unit mark.
        const size = Math.min(width, height) * 0.5;
        const x = (width - size) / 2;
        const y = height * 0.14;
        if (image) {
          const scale =
            size / Math.max(image.naturalWidth, image.naturalHeight);
          const iw = image.naturalWidth * scale;
          const ih = image.naturalHeight * scale;
          ctx.drawImage(image, (width - iw) / 2, y + (size - ih) / 2, iw, ih);
        } else {
          const icon = socialIcon(social.link.platform);
          const [vx, vy, vw, vh] = icon.viewBox.split(' ').map(Number);
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(size / vw, size / vh);
          ctx.translate(-vx, -vy);
          ctx.fillStyle = ctx.strokeStyle = PALETTE.carbon;
          ctx.lineWidth = 1.7;
          ctx.lineCap = ctx.lineJoin = 'round';
          const path = new Path2D(icon.path);
          if (icon.filled) ctx.fill(path);
          else ctx.stroke(path);
          ctx.restore();
        }
        // Keep long owner-authored names legible instead of squeezing the type.
        // The native anchor retains the complete accessible destination name.
        ctx.fillStyle = ctx.strokeStyle = PALETTE.carbon;
        const fontSize = width * 0.12;
        ctx.font = `600 ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const arrow = width * 0.07;
        const gap = width * 0.028;
        const external = !social.link.url.startsWith('mailto:');
        const suffix = external ? arrow + gap : 0;
        const available = width * 0.82 - suffix;
        let label =
          social.link.title.trim() || socialIcon(social.link.platform).label;
        if (ctx.measureText(label).width > available) {
          const characters = Array.from(label);
          while (
            characters.length &&
            ctx.measureText(`${characters.join('')}…`).width > available
          )
            characters.pop();
          label = `${characters.join('')}…`;
        }
        const textWidth = ctx.measureText(label).width;
        const labelX = (width - textWidth - suffix) / 2;
        const labelY = height * 0.81;
        ctx.fillText(label, labelX, labelY);
        if (external) {
          const ax = labelX + textWidth + gap;
          const ay = labelY - arrow / 2;
          ctx.lineWidth = width * 0.006;
          ctx.lineCap = ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(ax, ay + arrow);
          ctx.lineTo(ax + arrow, ay);
          ctx.moveTo(ax + arrow * 0.18, ay);
          ctx.lineTo(ax + arrow, ay);
          ctx.lineTo(ax + arrow, ay + arrow * 0.82);
          ctx.stroke();
        }
      } else if (image && photo) {
        const crop = imageCropRect(
          image.naturalWidth,
          image.naturalHeight,
          width / height,
          photo.crop,
        );
        ctx.drawImage(
          image,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          width,
          height,
        );
      }
      map.needsUpdate = true;
    };
    paint();
    const source = social ? social.icon : photo;
    if (source)
      pending.push(
        load(source.media.url).then((loaded) => {
          image = loaded;
          paint();
          if (!disposed) onChange();
        }),
      );
    return map;
  }
  return {
    texture,
    ready: () => Promise.all(pending),
    dispose() {
      disposed = true;
      cancelLoads.forEach((cancel) => cancel());
      images.clear();
    },
  };
}
