import { normalizeNotebookBody } from '@/lib/content/notebook-pages';
import { pathFor } from '@/lib/paths';
import { AboutPortrait, AboutSocialLinks } from './about-personal-content';
import {
  ArrowLeft,
  ArrowUpRight,
  Radio,
  ArrowRight,
  FileText,
  Layers,
} from 'lucide-react';
import { RoomIntro, TextBlocks } from './portfolio-parts';
import type { Portfolio } from '@/lib/content/types';
import { projectBody } from '@/lib/content/project-content';
import {
  caseStudyBody,
  type CaseStudyFilter,
} from '@/lib/content/case-study-content';
import {
  CaseStudyStory,
  ReadingCaseStudyLibrary,
} from './case-study-library-window';
import { ReadingProjectLibrary, ProjectLinks } from './project-library-window';
import { ProjectMarkdown, ProjectMedia } from './project-markdown';
import { parseProjectMarkdown } from './project-markdown-content';
import {
  ContactForm,
  type ContactDraft,
  type ContactSubmission,
} from './contact-form';
import './reading-views.css';
function ReadingContents({
  headings,
  label,
}: {
  headings: { id: string; text: string }[];
  label: string;
}) {
  const links = (
    <nav aria-label={label}>
      {headings.map((heading, index) => (
        <a href={'#' + heading.id} key={heading.id}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          {heading.text}
        </a>
      ))}
    </nav>
  );
  return (
    <>
      <div className="reading-contents-wide">
        <h2 className="reading-contents-title">Contents</h2>
        {links}
      </div>
      <details className="reading-contents-compact">
        <summary>
          Contents <span>{headings.length} sections</span>
        </summary>
        {links}
      </details>
    </>
  );
}
export function ProjectsView({ data }: { data: Portfolio }) {
  return (
    <>
      <RoomIntro site={data.site} section="projects" number="01" />
      <div className="rack-label">
        <span>{data.site.projectsRoom}</span>
        <span>
          {String(data.projects.length).padStart(2, '0')} /{' '}
          {data.site.allProjectsLabel}
        </span>
      </div>
      <ReadingProjectLibrary data={data} />
    </>
  );
}
export function DossierView({
  data,
  project: p,
}: {
  data: Portfolio;
  project: Record<string, any>;
}) {
  const s = data.site;
  const media = data.media.find((m) => m.id === p.mediaId);
  const body = projectBody(p);
  const legacySections = [
    'problem',
    'approach',
    'system',
    'decisions',
    'outcomes',
    'next',
  ];
  const isMarkdown = typeof p.body === 'string';
  const headings = isMarkdown
    ? parseProjectMarkdown(body).headings
    : legacySections.map((id) => ({ id, text: s[id + 'Label'] }));
  return (
    <>
      <a className="back-link" href={pathFor('/projects', s)}>
        <ArrowLeft size={16} />
        {s.backLabel}
      </a>
      <div className="dossier-layout">
        {!!headings.length && (
          <aside className="dossier-index">
            <p className="eyebrow">
              <FileText size={16} />
              {s.dossierLabel}
            </p>
            <ReadingContents headings={headings} label={s.dossierLabel} />
          </aside>
        )}
        <article className="dossier-paper">
          <div className="paper-top">
            <p className="eyebrow">{p.category}</p>
          </div>
          <h1>{p.title}</h1>
          {p.subtitle && <p className="dossier-subtitle">{p.subtitle}</p>}
          <p className="dossier-summary">{p.summary}</p>
          <ProjectLinks project={p} site={s} />
          {(p.role || p.stack) && (
            <dl className="dossier-meta">
              {p.role && (
                <div>
                  <dt>{s.roleLabel}</dt>
                  <dd>{p.role}</dd>
                </div>
              )}
              {p.stack && (
                <div>
                  <dt>{s.stackLabel}</dt>
                  <dd>{p.stack}</dd>
                </div>
              )}
            </dl>
          )}
          {media && <ProjectMedia item={media} media={data.media} />}
          {isMarkdown ? (
            <ProjectMarkdown body={body} media={data.media} />
          ) : (
            legacySections.map((id, index) => (
              <section id={id} key={id}>
                <h2>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {s[id + 'Label']}
                </h2>
                {id === 'system' && (
                  <div className="system-flow" aria-hidden="true">
                    <FileText />
                    <ArrowRight />
                    <Layers />
                    <ArrowRight />
                    <Radio />
                  </div>
                )}
                <TextBlocks text={p[id]} />
              </section>
            ))
          )}
          <a className="paper-cta" href={pathFor('/contact', s)}>
            {s.inviteLabel}
            <ArrowUpRight size={20} />
          </a>
        </article>
      </div>
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
    <>
      <RoomIntro site={data.site} section="experience" number="02" />
      <ReadingCaseStudyLibrary
        data={data}
        category={category}
        onCategoryChange={onCategoryChange}
      />
    </>
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
  const headings = parseProjectMarkdown(caseStudyBody(caseStudy)).headings;
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
        Back to case studies
      </a>
      <div className="dossier-layout">
        {!!headings.length && (
          <aside className="dossier-index">
            <p className="eyebrow">
              <FileText size={16} />
              Case study
            </p>
            <ReadingContents headings={headings} label="Case study contents" />
          </aside>
        )}
        <article className="dossier-paper case-study-reading-paper">
          <CaseStudyStory data={data} caseStudy={caseStudy} />
        </article>
      </div>
    </>
  );
}
export function AboutView({ data }: { data: Portfolio }) {
  const s = data.site;
  return (
    <>
      <RoomIntro site={s} section="about" number="03" />
      <div className="journal">
        <aside className="journal-cover">
          <div>
            <AboutPortrait data={data} />
            <p className="eyebrow">{s.journalLabel}</p>
            <h2>{s.name}</h2>
            <p>{s.biography}</p>
            <AboutSocialLinks data={data} />
          </div>
          {!!data.journal.length && (
            <nav aria-label={s.aboutLabel}>
              {data.journal.map((j, i) => (
                <a href={'#' + j.slug} key={j.id}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {j.title}
                  <ArrowUpRight size={15} />
                </a>
              ))}
            </nav>
          )}
        </aside>
        <div className="journal-pages">
          {data.journal.map((j, i) => (
            <article key={j.id} id={j.slug}>
              <div className="paper-top">
                <p className="eyebrow">
                  {s.journalLabel} / {String(i + 1).padStart(2, '0')}
                </p>
              </div>
              <h2>{j.title}</h2>
              {j.subtitle && <p className="journal-subtitle">{j.subtitle}</p>}
              <ProjectMarkdown
                body={normalizeNotebookBody(j.body || '')}
                media={data.media}
                headingIdPrefix={`journal-${j.id}-`}
                preserveSoftBreaks
              />
            </article>
          ))}
          {!data.journal.length && (
            <p className="reading-empty" role="status">
              {s.emptyLabel}
            </p>
          )}
          <a className="paper-cta" href={pathFor('/contact', s)}>
            {s.inviteLabel}
            <ArrowUpRight size={20} />
          </a>
        </div>
      </div>
    </>
  );
}
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
  const s = data.site;
  return (
    <div className="contact-layout">
      <div>
        <RoomIntro site={s} section="contact" number="04" />
        <div className="contact-details">
          <p className="eyebrow">{s.emailLabelCta}</p>
          <a className="contact-email" href={'mailto:' + s.email}>
            {s.email}
            <ArrowUpRight size={20} />
          </a>
          <p>
            <span className="status-dot" />
            {s.availability}
          </p>
          <div className="social-links">
            {data.links.map((l) => (
              <a
                href={l.url}
                key={l.id}
                rel="noopener noreferrer"
                target="_blank"
              >
                {l.title}
                <ArrowUpRight size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="reading-contact-form">
        <ContactForm
          site={s}
          initialSent={sent}
          initialError={error}
          draft={draft}
          onDraftChange={onDraftChange}
          onSent={onSent}
          submission={submission}
          onSubmissionChange={onSubmissionChange}
        />
      </div>
    </div>
  );
}
