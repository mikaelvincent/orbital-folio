import { getPortfolio } from '@/lib/content/repository';
import { PublicShell } from '@/features/portfolio/public-shell';
import { AboutView } from '@/features/portfolio/room-views';
import { pageMetadata } from '@/lib/metadata';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return pageMetadata(await getPortfolio(), 'about');
}
export default async function Page() {
  const data = await getPortfolio();
  return (
    <PublicShell data={data} active="about">
      <AboutView data={data} />
    </PublicShell>
  );
}
