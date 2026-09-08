import { getPortfolio } from '@/lib/content';
import { PublicShell } from '@/components/portfolio';
import { AboutView } from '@/components/views';
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
