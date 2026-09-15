import { getPortfolio } from '@/lib/content/repository';
export async function GET() {
  const { site } = await getPortfolio();
  return new Response(
    `User-agent: *\n${site.sampleMode ? 'Disallow: /' : 'Allow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /signin-with-chatgpt\nDisallow: /signout-with-chatgpt'}\nSitemap: ${site.domain}/sitemap.xml\n`,
    {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}
