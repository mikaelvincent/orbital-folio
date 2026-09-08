import { notFound } from 'next/navigation';
import { getPortfolio } from '@/lib/content';
import { PublicShell } from '@/components/portfolio';
import { DossierView } from '@/components/views';
import { pageMetadata } from '@/lib/metadata';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const data = await getPortfolio();
  const { slug } = await params;
  const p = data.projects.find((p) => p.slug === slug);
  if (!p) return { title: data.site.notFoundHeading, robots: { index: false } };
  return pageMetadata(data, 'projects', p);
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const data = await getPortfolio();
  const { slug } = await params;
  const p = data.projects.find((p) => p.slug === slug);
  if (!p) notFound();
  return (
    <PublicShell data={data} active="projects" projectSlug={p.slug}>
      <DossierView data={data} project={p} />
    </PublicShell>
  );
}
