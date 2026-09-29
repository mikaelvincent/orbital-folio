import { notFound } from 'next/navigation';
import { getPortfolio } from '@/lib/content/repository';
import { PublicShell } from '@/features/portfolio/public-shell';
import { AboutView } from '@/features/portfolio/room-views';
import { pageMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const data = await getPortfolio();
  const { slug } = await params;
  const section = data.journal.find((entry) => entry.slug === slug);
  if (!section)
    return { title: data.site.notFoundHeading, robots: { index: false } };
  return pageMetadata(data, 'about', section);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const data = await getPortfolio();
  const { slug } = await params;
  const section = data.journal.find((entry) => entry.slug === slug);
  if (!section) notFound();
  return (
    <PublicShell data={data} active="about" notebookSlug={section.slug}>
      <AboutView data={data} section={section} />
    </PublicShell>
  );
}
