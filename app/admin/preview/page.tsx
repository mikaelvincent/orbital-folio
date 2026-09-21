import { PrivacyView } from '@/features/portfolio/privacy-view';
import { HomeView } from '@/features/portfolio/home-view';
import { redirect } from 'next/navigation';
import { adminIdentity } from '@/lib/security';
import { getPortfolio } from '@/lib/content/repository';
import { CASE_STUDY_CATEGORIES } from '@/lib/content/case-study-content';
import { PublicShell } from '@/features/portfolio/public-shell';
import {
  ProjectsView,
  DossierView,
  ExperienceView,
  CaseStudyView,
  AboutView,
  ContactView,
} from '@/features/portfolio/room-views';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Private draft preview',
  robots: { index: false, follow: false },
};
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  if (!(await adminIdentity())) redirect('/admin');
  const q = await searchParams;
  const data = await getPortfolio(true);
  const section =
    q.section === 'case-studies' ? 'experience' : q.section || 'home';
  const p = data.projects.find((p) => p.id === q.id || p.slug === q.slug);
  const caseStudy = data.experience.find(
    (entry) => entry.id === q.id || entry.slug === q.slug,
  );
  const category =
    CASE_STUDY_CATEGORIES.find((item) => item.id === q.category)?.id || 'all';
  return (
    <PublicShell
      data={data}
      active={section}
      projectSlug={section === 'projects' ? p?.slug : undefined}
      caseStudySlug={section === 'experience' ? caseStudy?.slug : undefined}
      preview
    >
      {section === 'projects' ? (
        p ? (
          <DossierView data={data} project={p} />
        ) : (
          <ProjectsView data={data} />
        )
      ) : section === 'experience' ? (
        caseStudy ? (
          <CaseStudyView
            data={data}
            caseStudy={caseStudy}
            category={category}
          />
        ) : (
          <ExperienceView data={data} category={category} />
        )
      ) : section === 'about' ? (
        <AboutView data={data} />
      ) : section === 'contact' ? (
        <ContactView data={data} />
      ) : section === 'privacy' ? (
        <PrivacyView data={data} />
      ) : (
        <HomeView data={data} />
      )}
    </PublicShell>
  );
}
