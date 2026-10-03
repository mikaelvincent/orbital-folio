import { pathFor } from '@/lib/paths';
import { resolveSocialScreens } from '@/lib/content/social-links';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { Portfolio } from '@/lib/content/types';
import type { CaseStudyFilter } from '@/lib/content/case-study-content';
import { interfaceText as copy } from '@/lib/content/interface-text';
import {
  CaseStudyStory,
  ReadingCaseStudyLibrary,
} from './case-study-library-window';
import { ReadingProjectLibrary, ProjectStory } from './project-library-window';
import {
  ContactForm,
  type ContactDraft,
  type ContactSubmission,
} from './contact-form';
import './reading-views.css';

export function ProjectsView({ data }: { data: Portfolio }) {
  return <ReadingProjectLibrary data={data} />;
}
export function DossierView({
  data,
  project,
}: {
  data: Portfolio;
  project: Record<string, any>;
}) {
  return (
    <>
      <a className="back-link" href={pathFor('/projects', data.site)}>
        <ArrowLeft size={16} />
        {data.site.backLabel || copy(data.site, 'Back to projects')}
      </a>
      <article className="dossier-paper">
        <ProjectStory data={data} project={project} />
      </article>
    </>
  );
}
export function ExperienceView({
  data,
  category,
  onCategoryChange,
}: {
  data: Portfolio;
  category?: CaseStudyFilter;
  onCategoryChange?: (category: CaseStudyFilter) => void;
}) {
  return (
    <ReadingCaseStudyLibrary
      data={data}
      category={category}
      onCategoryChange={onCategoryChange}
    />
  );
}
export function CaseStudyView({
  data,
  caseStudy,
  category = 'all',
}: {
  data: Portfolio;
  caseStudy: Record<string, any>;
  category?: CaseStudyFilter;
}) {
  return (
    <>
      <a
        className="back-link"
        href={pathFor(
          `/case-studies${category === 'all' ? '' : `?category=${category}`}`,
          data.site,
        )}
      >
        <ArrowLeft size={16} />
        {copy(data.site, 'Back to case studies')}
      </a>
      <article className="dossier-paper case-study-reading-paper">
        <CaseStudyStory data={data} caseStudy={caseStudy} />
      </article>
    </>
  );
}
export { AboutView } from './about-reading-view';

export function ContactView({
  data,
  sent = false,
  error = false,
  draft,
  onDraftChange,
  onSent,
  submission,
  onSubmissionChange,
}: {
  data: Portfolio;
  sent?: boolean;
  error?: boolean;
  submission?: ContactSubmission;
  onSubmissionChange?: (value: ContactSubmission) => void;
  draft?: ContactDraft;
  onDraftChange?: (draft: ContactDraft) => void;
  onSent?: () => void;
}) {
  const links = Object.values(resolveSocialScreens(data.links)).filter(
    (link) => link !== null,
  );
  return (
    <div className="reading-contact-form">
      {!!links.length && (
        <div className="social-links">
          {links.map((link) => (
            <a
              href={link.url}
              key={link.id}
              rel={
                link.url.startsWith('mailto:')
                  ? undefined
                  : 'noopener noreferrer'
              }
              target={link.url.startsWith('mailto:') ? undefined : '_blank'}
            >
              <span>
                {link.title}
                <small>
                  {link.description || copy(data.site, 'Connect with me')}
                </small>
              </span>
              <ArrowUpRight size={16} />
            </a>
          ))}
        </div>
      )}
      <ContactForm
        site={data.site}
        initialSent={sent}
        initialError={error}
        draft={draft}
        onDraftChange={onDraftChange}
        onSent={onSent}
        submission={submission}
        onSubmissionChange={onSubmissionChange}
      />
    </div>
  );
}
