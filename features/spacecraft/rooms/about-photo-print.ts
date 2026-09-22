import {
  imageCropRect,
  type ImageCrop,
} from '../../../lib/content/about-photos.ts';
import {
  socialIcon,
  type SocialLink,
} from '../../../lib/content/social-links.ts';
import { drawStudyArtwork } from './about-study-artwork.ts';

/** Four static paper textures. Original uploads are never modified; each print
 * is composed once on load (and social lettering once per responsive change).
 * Missing/failed images preserve the authored fallback, including a real link's
 * platform identity. No asynchronous work survives scene disposal.
 */
export function createAboutPhotoPrints(THREE: any, onChange = () => {}) {
  let disposed = false;
  let compact = false;
  const pending: Promise<void>[] = [];
  const cancelLoads: (() => void)[] = [];
  const repaints: (() => void)[] = [];
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
    photo?: { media: Record<string, any>; crop: ImageCrop } | null,
    link?: SocialLink,
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
      if (!link) {
        // The landscape fallback has a different source aspect from the frame.
        ctx.save();
        const fallbackWidth = height * 1.6;
        ctx.translate((width - fallbackWidth) / 2, 0);
        ctx.scale(fallbackWidth / width, 1);
        drawStudyArtwork(ctx, kind);
        ctx.restore();
      } else {
        ctx.fillStyle = '#eadfc9';
        ctx.fillRect(0, 0, width, height);
      }
      const photoHeight = link ? height * 0.72 : height;
      if (image && photo) {
        const crop = imageCropRect(
          image.naturalWidth,
          image.naturalHeight,
          width / photoHeight,
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
          photoHeight,
        );
      }
      if (link) {
        const icon = socialIcon(link.platform);
        // One dominant, high-contrast mark remains identifiable at room scale.
        const badge = width * (compact ? 0.59 : 0.49);
        const badgeX = (width - badge) / 2;
        const badgeY = (photoHeight - badge) / 2;
        ctx.fillStyle = '#203147';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badge, badge, width * 0.055);
        ctx.fill();
        const inset = badge * 0.17;
        const [vx, vy, vw, vh] = icon.viewBox.split(' ').map(Number);
        ctx.save();
        ctx.translate(badgeX + inset, badgeY + inset);
        ctx.scale((badge - inset * 2) / vw, (badge - inset * 2) / vh);
        ctx.translate(-vx, -vy);
        ctx.fillStyle = ctx.strokeStyle = '#faf1de';
        ctx.lineWidth = 1.7;
        ctx.lineCap = ctx.lineJoin = 'round';
        const path = new Path2D(icon.path);
        if (icon.filled) ctx.fill(path);
        else ctx.stroke(path);
        ctx.restore();
        // Do not leave microscopic text on phone-size prints. The native link
        // retains its full name, and focus/hover supplies a viewport-size label.
        if (!compact) {
          ctx.fillStyle = '#203147';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label = icon.id === 'custom' ? 'Website' : icon.label;
          let fontSize = width * 0.135;
          do {
            ctx.font = `600 ${fontSize}px Arial, sans-serif`;
            if (ctx.measureText(label).width <= width * 0.88) break;
            fontSize -= 1;
          } while (fontSize > width * 0.085);
          ctx.fillText(label, width / 2, height * 0.86);
        } else {
          // A printed external arrow is the sole secondary mark at small sizes.
          ctx.strokeStyle = '#203147';
          ctx.lineWidth = width * 0.018;
          const x = width * 0.45,
            y = height * 0.91,
            span = width * 0.11;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + span, y - span);
          ctx.moveTo(x, y - span);
          ctx.lineTo(x + span, y - span);
          ctx.lineTo(x + span, y);
          ctx.stroke();
        }
      }
      map.needsUpdate = true;
    };
    paint();
    if (link) repaints.push(paint);
    if (photo)
      pending.push(
        load(photo.media.url).then((loaded) => {
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
    setCompact(value: boolean) {
      if (compact === value || disposed) return;
      compact = value;
      repaints.forEach((paint) => paint());
    },
    dispose() {
      disposed = true;
      cancelLoads.forEach((cancel) => cancel());
      images.clear();
      repaints.length = 0;
    },
  };
}
