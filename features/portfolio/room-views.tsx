import { pathFor } from '@/lib/paths';
import {
  ArrowLeft,
  ArrowUpRight,
  Radio,
  ArrowRight,
  FileText,
  BookOpen,
  Layers,
} from 'lucide-react';
import { ProjectCards, RoomIntro, Sample, TextBlocks } from './portfolio-parts';
import type { Portfolio } from '@/lib/content/types';
import {
  ContactForm,
  type ContactDraft,
  type ContactSubmission,
} from './contact-form';
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
      <ProjectCards projects={data.projects} site={data.site} />
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
  return (
    <>
      <a className="back-link" href={pathFor('/projects', s)}>
        <ArrowLeft size={16} />
        {s.backLabel}
      </a>
      <div className="dossier-layout">
        <article className="dossier-paper">
          <div className="clipboard-clip" aria-hidden="true" />
          <div className="paper-top">
            <p className="eyebrow">{p.category}</p>
            <Sample site={s} sample={p.sample} />
          </div>
          <h1>{p.title}</h1>
          <p className="dossier-subtitle">{p.subtitle}</p>
          <p className="dossier-summary">{p.summary}</p>
          {media && (
            <figure className="project-media">
              <img
                src={media.url}
                alt={media.alt}
                width="900"
                height="560"
                loading="lazy"
              />
              <figcaption>{media.title}</figcaption>
            </figure>
          )}
          {[
            'problem',
            'approach',
            'system',
            'decisions',
            'outcomes',
            'next',
          ].map((id, i) => (
            <section id={id} key={id}>
              <h2>
                <span>0{i + 1}</span>
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
          ))}
          <a className="paper-cta" href={pathFor('/contact', s)}>
            {s.inviteLabel}
            <ArrowUpRight size={20} />
          </a>
        </article>
        <aside className="dossier-index">
          <p className="eyebrow">
            <FileText size={16} />
            {s.dossierLabel}
          </p>
          <h2>{p.title}</h2>
          <nav aria-label={s.dossierLabel}>
            {[
              'problem',
              'approach',
              'system',
              'decisions',
              'outcomes',
              'next',
            ].map((id, i) => (
              <a href={'#' + id} key={id}>
                <span>0{i + 1}</span>
                {s[id + 'Label']}
              </a>
            ))}
          </nav>
          <div className="dossier-meta">
            <p>{s.roleLabel}</p>
            <strong>{p.role}</strong>
            <p>{s.periodLabel}</p>
            <strong>{p.period}</strong>
            <p>{s.stackLabel}</p>
            <strong>{p.stack}</strong>
          </div>
          {p.demoUrl && (
            <a
              className="button amber"
              href={p.demoUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {s.demoLabel}
              <ArrowUpRight size={16} />
            </a>
          )}
          {p.sourceUrl && (
            <a
              className="text-link"
              href={p.sourceUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {s.codeLabel}
              <ArrowUpRight size={16} />
            </a>
          )}
        </aside>
      </div>
    </>
  );
}
export function ExperienceView({ data }: { data: Portfolio }) {
  const s = data.site;
  return (
    <>
      <RoomIntro site={s} section="experience" number="02" />
      <div className="mission-console">
        <div className="console-top">
          <span className="eyebrow">
            <span className="status-dot" />
            {s.experienceRoom}
          </span>
          <span>{s.connectionLabel}</span>
        </div>
        <nav className="chapter-navigation" aria-label={s.readAllLabel}>
          {data.experience.map((e, i) => (
            <a key={e.id} href={'#' + e.slug}>
              <span>0{i + 1}</span>
              {e.title}
            </a>
          ))}
        </nav>
        <div className="mission-entries">
          {data.experience.map((e, i) => (
            <article id={e.slug} className="mission-entry" key={e.id}>
              <div className="entry-marker" aria-hidden="true">
                0{i + 1}
              </div>
              <div className="entry-content">
                <div className="entry-head">
                  <p className="eyebrow">{e.period}</p>
                  <Sample site={s} sample={e.sample} />
                </div>
                <h2>{e.title}</h2>
                <p className="entry-org">
                  {e.role} / {e.organization}
                </p>
                <p className="entry-summary">{e.summary}</p>
                <section>
                  <h3>{s.roleLabel}</h3>
                  <TextBlocks text={e.context} />
                </section>
                <section>
                  <h3>{s.decisionsLabel}</h3>
                  <TextBlocks text={e.decisions} />
                </section>
                <section>
                  <h3>{s.outcomesLabel}</h3>
                  <TextBlocks text={e.impact} />
                </section>
              </div>
            </article>
          ))}
          {!data.experience.length && <p>{s.emptyLabel}</p>}
        </div>
        <div className="console-bottom">
          <i />
          <span>{s.experienceLabel}</span>
          <i />
        </div>
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
            {data.media.find((m) => m.id === s.portraitMediaId) ? (
              <img
                className="portrait"
                src={data.media.find((m) => m.id === s.portraitMediaId)!.url}
                alt={data.media.find((m) => m.id === s.portraitMediaId)!.alt}
                width="300"
                height="300"
              />
            ) : (
              <BookOpen size={32} />
            )}
            <p className="eyebrow">{s.journalLabel}</p>
            <h2>{s.name}</h2>
            <p>{s.biography}</p>
          </div>
          <nav aria-label={s.aboutLabel}>
            {data.journal.map((j, i) => (
              <a href={'#' + j.slug} key={j.id}>
                <span>0{i + 1}</span>
                {j.title}
                <ArrowUpRight size={15} />
              </a>
            ))}
          </nav>
          <span className="journal-strap" aria-hidden="true" />
        </aside>
        <div className="journal-pages">
          {data.journal.map((j, i) => (
            <article key={j.id} id={j.slug}>
              <div className="paper-top">
                <p className="eyebrow">
                  {s.journalLabel} / 0{i + 1}
                </p>
                <Sample site={s} sample={j.sample} />
              </div>
              <h2>{j.title}</h2>
              <p className="journal-subtitle">{j.subtitle}</p>
              <TextBlocks text={j.body} />
            </article>
          ))}
          {!data.journal.length && <p>{s.emptyLabel}</p>}
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
          {s.sampleMode && <p className="contact-sample">{s.sampleContact}</p>}
        </div>
      </div>
      <div className="comms-housing">
        <div className="comms-nameplate">
          <Radio size={18} />
          <span>{s.contactRoom}</span>
          <span className="status-dot" />
        </div>
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
        <div className="comms-bottom">
          <span />
          {s.connectionLabel}
          <span />
        </div>
      </div>
    </div>
  );
}
