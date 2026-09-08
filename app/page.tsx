import { socialImage } from '@/lib/metadata';
import { getPortfolio } from '@/lib/content';
import { PublicShell } from '@/components/portfolio';
import { HomeView } from '@/components/home-view';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const data = await getPortfolio();
  const s = data.site;
  return {
    title: s.seoTitle,
    description: s.seoDescription,
    alternates: { canonical: s.domain },
    robots: s.sampleMode ? { index: false, follow: true } : undefined,
    openGraph: {
      title: s.seoTitle,
      description: s.seoDescription,
      url: s.domain,
      type: 'website',
      images: socialImage(data, s.seoImageId),
    },
  };
}
export default async function Home() {
  const data = await getPortfolio();
  return (
    <PublicShell data={data} active="home">
      <HomeView data={data} />
    </PublicShell>
  );
}
