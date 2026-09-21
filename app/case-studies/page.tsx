import { getPortfolio } from '@/lib/content/repository';
import { PublicShell } from '@/features/portfolio/public-shell';
import { ExperienceView } from '@/features/portfolio/room-views';
import { pageMetadata } from '@/lib/metadata';
import { CASE_STUDY_CATEGORIES } from '@/lib/content/case-study-content';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return pageMetadata(await getPortfolio(), 'experience');
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const data = await getPortfolio();
  const q = await searchParams;
  const category =
    CASE_STUDY_CATEGORIES.find((item) => item.id === q.category)?.id || 'all';
  return (
    <PublicShell data={data} active="experience">
      <ExperienceView data={data} category={category} />
    </PublicShell>
  );
}
