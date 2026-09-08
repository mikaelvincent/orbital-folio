import { getPortfolio } from '@/lib/content';
export async function GET() {
  const { site: s } = await getPortfolio();
  const initials = String(s.initials)
    .slice(0, 4)
    .replace(/[<>&"']/g, '');
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0c2034"/><circle cx="32" cy="32" r="26" fill="none" stroke="${/^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : '#ffb547'}"/><text x="32" y="40" font-family="Arial,sans-serif" font-size="22" text-anchor="middle" fill="#f4f0e6">${initials}</text></svg>`,
    {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
