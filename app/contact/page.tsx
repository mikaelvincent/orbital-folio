import { getPortfolio } from '@/lib/content';
import { PublicShell } from '@/components/portfolio';
import { ContactView } from '@/components/views';
import { pageMetadata } from '@/lib/metadata';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return pageMetadata(await getPortfolio(), 'contact');
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const data = await getPortfolio();
  const q = await searchParams;
  return (
    <PublicShell data={data} active="contact">
      <ContactView data={data} sent={q.sent === '1'} error={q.error === '1'} />
    </PublicShell>
  );
}
