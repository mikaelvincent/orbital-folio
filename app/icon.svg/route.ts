import { PALETTE, paletteAccent } from '@/lib/palette';
import { getPortfolio } from '@/lib/content/repository';
export async function GET() {
  const { site: s } = await getPortfolio();
  const initials = String(s.initials)
    .slice(0, 4)
    .replace(/[<>&"']/g, '');
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${PALETTE.carbon}"/><circle cx="32" cy="32" r="26" fill="none" stroke="${/^#[0-9a-f]{6}$/i.test(s.accent) ? paletteAccent(s.accent) : PALETTE.bronze}"/><text x="32" y="40" font-family="Arial,sans-serif" font-size="22" text-anchor="middle" fill="${PALETTE.ivory}">${initials}</text></svg>`,
    {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
