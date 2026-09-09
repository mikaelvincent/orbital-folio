import { getPortfolio } from '@/lib/content';
export async function GET() {
  const d = await getPortfolio();
  const paths = [
    '',
    '/case-studies',
    '/projects',
    '/about',
    '/contact',
    '/privacy',
    ...d.projects.map((p) => '/projects/' + p.slug),
  ];
  const escape = (v: string) =>
    v
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('"', '&quot;');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${escape(d.site.domain + p)}</loc></url>`).join('')}</urlset>`,
    {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}
