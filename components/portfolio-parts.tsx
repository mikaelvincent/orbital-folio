import { pathFor } from '@/lib/paths';
import {
  ArrowUpRight,
  Box,
  Orbit,
  Radio,
  BookOpen,
  ChartNoAxesCombined,
  ArrowLeft,
} from 'lucide-react';
export const sectionIds = ['projects', 'experience', 'about', 'contact'];
const icons = [Box, ChartNoAxesCombined, BookOpen, Radio];
export function Header({
  site: s,
  active,
}: {
  site: Record<string, any>;
  active?: string;
}) {
  return (
    <>
      <a className="skip-link" href="#main">
        {s.skipLabel}
      </a>
      <header className="site-header">
        <a
          className="identity"
          href={pathFor('/', s)}
          aria-label={`${s.name} · ${s.homeLabel}`}
        >
          <span className="identity-mark" aria-hidden="true">
            {s.initials}
          </span>
          <span>
            {s.name}
            <small>{s.title}</small>
          </span>
        </a>
        <nav aria-label={s.sectionLabel} className="desktop-nav">
          {sectionIds.map((id) => (
            <a
              key={id}
              href={pathFor(`/${id}`, s)}
              aria-current={active === id ? 'page' : undefined}
            >
              {s[id + 'Label']}
            </a>
          ))}
        </nav>
        <a className="header-contact" href={pathFor('/contact', s)}>
          {s.inviteLabel}
          <ArrowUpRight size={16} />
        </a>
      </header>
      <nav className="mobile-nav" aria-label={s.sectionLabel}>
        {sectionIds.map((id, i) => {
          const Icon = icons[i];
          return (
            <a
              key={id}
              href={pathFor(`/${id}`, s)}
              aria-current={active === id ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{s[id + 'Label']}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
export function Footer({ site: s }: { site: Record<string, any> }) {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <a className="identity" href={pathFor('/', s)}>
          <Orbit size={22} />
          {s.name}
        </a>
        <span>{s.footerText}</span>
        <a href="/admin">
          {s.studioLabel}
          <ArrowUpRight size={14} />
        </a>
      </div>
      {s.sampleMode && <p className="sample-notice">{s.sampleNotice}</p>}
      <div className="footer-meta">
        <span>
          © {new Date().getFullYear()} {s.name}
        </span>
        <span>{s.location}</span>
        <a href={pathFor('/privacy', s)}>{s.privacyLabel}</a>
      </div>
    </footer>
  );
}
export function Sample({
  site: s,
  sample,
}: {
  site: Record<string, any>;
  sample?: boolean;
}) {
  return sample && (s.sampleMode || s._preview) ? (
    <span className="sample-badge">{s.sampleLabel}</span>
  ) : null;
}
export function ProjectCards({
  projects,
  site: s,
}: {
  projects: Record<string, any>[];
  site: Record<string, any>;
}) {
  return (
    <div className="project-grid">
      {projects.map((p, i) => (
        <a
          className="project-locker"
          aria-label={`${s.projectCta}: ${p.title}${p.sample && (s.sampleMode || s._preview) ? ' · ' + s.sampleLabel : ''}`}
          href={pathFor(`/projects/${p.slug}`, s)}
          key={p.id}
        >
          <div className="locker-top">
            <span className="locker-number">
              {String(i + 1).padStart(2, '0')}
            </span>
            <ArrowUpRight size={22} />
          </div>
          <div className={`project-art art-${i % 3}`} aria-hidden="true">
            {i % 3 === 0 ? (
              <>
                <span className="diagram-node">↗</span>
                <i />
                <span className="diagram-node node-center">≋</span>
                <i />
                <span className="diagram-node">✓</span>
              </>
            ) : i % 3 === 1 ? (
              <div className="note-stack">
                <span />
                <span />
                <span />
              </div>
            ) : (
              <div className="meter-bars">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            )}
          </div>
          <div className="locker-content">
            <p className="eyebrow">{p.category}</p>
            <h3>{p.title}</h3>
            <p>{p.summary}</p>
            <div className="locker-foot">
              <Sample site={s} sample={p.sample} />
              <span className="locker-handle" aria-hidden="true" />
            </div>
          </div>
        </a>
      ))}
      {!projects.length && <p>{s.emptyLabel}</p>}
    </div>
  );
}
export function RoomIntro({
  site: s,
  section,
  number,
}: {
  site: Record<string, any>;
  section: string;
  number: string;
}) {
  return (
    <div className="room-intro">
      <a className="back-link" href={pathFor('/', s)}>
        <ArrowLeft size={16} />
        {s.backHomeLabel}
      </a>
      <p className="eyebrow">
        <span className="status-dot" />
        {number} / {s[section + 'Room']}
      </p>
      <h1>{s[section + 'Heading']}</h1>
      <p>{s[section + 'Intro']}</p>
    </div>
  );
}
export function TextBlocks({ text }: { text: string }) {
  return (
    <>
      {text?.split('\n\n').map((p, i) => (
        <p className="text-block" key={i}>
          {p}
        </p>
      ))}
    </>
  );
}
