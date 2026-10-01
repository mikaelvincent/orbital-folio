import {
  Archive,
  ArrowUpRight,
  BookOpen,
  PanelsTopLeft,
  Radio,
} from 'lucide-react';
import { pathFor } from '@/lib/paths';
import {
  interfaceText as copy,
  portfolioIdentity,
} from '@/lib/content/interface-text';
import type { Portfolio } from '@/lib/content/types';

export function HomeView({ data }: { data: Portfolio }) {
  const s = data.site;
  const rooms = [
    {
      id: 'projects',
      path: 'projects',
      heading: s.projectsHeading,
      Icon: PanelsTopLeft,
    },
    {
      id: 'experience',
      path: 'case-studies',
      heading: s.experienceHeading,
      Icon: Archive,
    },
    { id: 'about', path: 'about', heading: s.aboutHeading, Icon: BookOpen },
    {
      id: 'contact',
      path: 'contact',
      heading: copy(s, 'Let’s connect.'),
      Icon: Radio,
    },
  ];
  return (
    <section className="reading-overview">
      <header className="reading-masthead">
        <div>
          <p className="reading-eyebrow">{s.readLabel}</p>
          <h1>{portfolioIdentity(s)}</h1>
          <p className="hero-role">{s.title}</p>
        </div>
        <svg
          className="reading-orbit"
          viewBox="0 0 180 180"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="90" cy="90" r="66" />
          <ellipse
            cx="90"
            cy="90"
            rx="84"
            ry="27"
            transform="rotate(-38 90 90)"
          />
          <path d="M90 14v12m0 128v12M14 90h12m128 0h12" />
          <rect x="66" y="66" width="20" height="20" rx="5" />
          <rect x="94" y="66" width="20" height="20" rx="5" />
          <rect x="66" y="94" width="20" height="20" rx="5" />
          <rect x="94" y="94" width="20" height="20" rx="5" />
          <circle className="reading-orbit-point" cx="143" cy="51" r="4" />
        </svg>
      </header>
      <nav className="reading-room-links" aria-label={s.sectionLabel}>
        {rooms.map(({ id, path, heading, Icon }) => (
          <a key={id} href={pathFor(`/${path}?view=reading`, s)}>
            <Icon
              className="reading-room-symbol"
              size={36}
              strokeWidth={1.2}
              aria-hidden="true"
            />
            <span className="reading-room-copy">
              <small>{heading || s[id + 'Label']}</small>
              <span>{s[id + 'Label']}</span>
            </span>
            <ArrowUpRight
              className="reading-room-arrow"
              size={22}
              aria-hidden="true"
            />
          </a>
        ))}
      </nav>
    </section>
  );
}
