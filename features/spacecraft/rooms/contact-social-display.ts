import { socialIcon, type SocialLink } from '../../../lib/content/social-links.ts';

/** Screen graphics only; no photograph, HTML or frame-dependent drawing. */
export function drawSocialChannel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  link: SocialLink | null,
  side: 'left' | 'right',
) {
  ctx.save();
  const pad = width * 0.1;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#91b3c9';
  ctx.font = `500 ${width * 0.037}px monospace`;
  ctx.fillText(`COM / ${side === 'left' ? '02' : '03'}`, pad, height * 0.082);
  ctx.fillStyle = link ? '#ffd18a' : '#7290a0';
  ctx.beginPath();
  ctx.arc(width - pad, height * 0.082, width * 0.009, 0, Math.PI * 2);
  ctx.fill();
  const icon = socialIcon(link?.platform || 'custom');
  const iconSize = width * 0.3;
  ctx.save();
  ctx.translate((width - iconSize) / 2, height * 0.16);
  ctx.scale(iconSize / 24, iconSize / 24);
  ctx.fillStyle = '#e8f2f7';
  ctx.strokeStyle = '#e8f2f7';
  ctx.lineWidth = 1.55;
  ctx.lineCap = ctx.lineJoin = 'round';
  const path = new Path2D(icon.path);
  if (icon.filled) ctx.fill(path);
  else ctx.stroke(path);
  ctx.restore();
  const text = (
    value: string,
    y: number,
    size: number,
    color: string,
    weight: number,
    maxLines = 2,
  ) => {
    const words = value.split(/\s+/);
    let lines: string[] = [];
    // Fit complete words and long custom names without cropped letters.
    do {
      ctx.font = `${weight} ${size}px Arial, sans-serif`;
      lines = [''];
      for (const word of words) {
        const line = lines[lines.length - 1];
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > width - pad * 2)
          lines.push(word);
        else lines[lines.length - 1] = next;
      }
      if (
        lines.length <= maxLines &&
        lines.every((l) => ctx.measureText(l).width <= width - pad * 2)
      )
        break;
      size *= 0.94;
    } while (size > 9);
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    lines.forEach((line, i) =>
      ctx.fillText(
        line,
        width / 2,
        y + (i - (lines.length - 1) / 2) * size * 1.25,
      ),
    );
  };
  text(
    link?.title || 'Unassigned',
    height * 0.56,
    width * 0.148,
    '#f0f5f8',
    600,
  );
  text(
    link?.description || (link ? 'Connect with me' : 'Channel standby'),
    height * 0.75,
    width * 0.061,
    '#a8c6d8',
    400,
  );
  ctx.strokeStyle = '#406278';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, height * 0.815);
  ctx.lineTo(width - pad, height * 0.815);
  ctx.stroke();
  text(
    link ? 'Open link' : 'NO LINK ASSIGNED',
    height * 0.905,
    width * (link ? 0.071 : 0.038),
    '#cee4ed',
    500,
    1,
  );
  if (link) {
    const size = width * 0.06,
      x = width * 0.77,
      y = height * 0.905;
    ctx.strokeStyle = '#ffd18a';
    ctx.lineWidth = width * 0.005;
    ctx.beginPath();
    ctx.moveTo(x, y + size / 2);
    ctx.lineTo(x + size, y - size / 2);
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x + size, y - size / 2);
    ctx.lineTo(x + size, y + size / 2);
    ctx.stroke();
  }
  ctx.restore();
}
