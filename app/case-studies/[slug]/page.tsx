import { notFound } from 'next/navigation';
import { getPortfolio } from '@/lib/content/repository';
import { PublicShell } from '@/features/portfolio/public-shell';
import { CaseStudyView } from '@/features/portfolio/room-views';
import { pageMetadata } from '@/lib/metadata';
import { CASE_STUDY_CATEGORIES } from '@/lib/content/case-study-content';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const data = await getPortfolio();
  const { slug } = await params;
  const caseStudy = data.experience.find((entry) => entry.slug === slug);
  if (!caseStudy)
    return { title: data.site.notFoundHeading, robots: { index: false } };
  return pageMetadata(data, 'experience', caseStudy);
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const data = await getPortfolio();
  const { slug } = await params;
  const q = await searchParams;
  const category =
    CASE_STUDY_CATEGORIES.find((item) => item.id === q.category)?.id || 'all';
  const caseStudy = data.experience.find((entry) => entry.slug === slug);
  if (!caseStudy) notFound();
  return (
    <PublicShell data={data} active="experience" caseStudySlug={caseStudy.slug}>
      <CaseStudyView data={data} caseStudy={caseStudy} category={category} />
    </PublicShell>
  );
}
