import { PrivacyView } from '@/features/portfolio/privacy-view';
import { getPortfolio } from '@/lib/content/repository';
import { PublicShell } from '@/features/portfolio/public-shell';
import { pageMetadata } from '@/lib/metadata';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return pageMetadata(await getPortfolio(), 'privacy');
}
export default async function Page() {
  const data = await getPortfolio();
  return (
    <PublicShell data={data} active="privacy">
      <PrivacyView data={data} />
    </PublicShell>
  );
}
