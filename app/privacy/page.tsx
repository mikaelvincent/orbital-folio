import { PrivacyView } from '@/components/privacy-view';
import { getPortfolio } from '@/lib/content';
import { PublicShell } from '@/components/portfolio';
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
