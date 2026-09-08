import { pageMetadata } from '@/lib/metadata';
import { getPortfolio } from '@/lib/content';
import { PublicShell } from '@/components/portfolio';
import { HomeView } from '@/components/home-view';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const data = await getPortfolio();
  return pageMetadata(data, 'home');
}
export default async function Home() {
  const data = await getPortfolio();
  return (
    <PublicShell data={data} active="home">
      <HomeView data={data} />
    </PublicShell>
  );
}
