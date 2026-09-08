import { ArrowUpRight, ArrowDown, Radio } from 'lucide-react';
import { ProjectCards } from './portfolio';
import { Spacecraft } from './spacecraft';
import { pathFor } from '@/lib/paths';
import type { Portfolio } from '@/lib/content-types';
export function HomeView({ data }: { data: Portfolio }) {
  const s = data.site;
  return (
    <>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" />
            {s.heroEyebrow}
          </p>
          <h1 id="home-title">
            {s.headline.split('\n').map((line: string, i: number) => (
              <span key={i}>{line}</span>
            ))}
          </h1>
          <p className="hero-role">{s.title}</p>
          <p className="hero-intro">{s.intro}</p>
          <div className="hero-actions">
            <a className="text-link" href="#ship">
              {s.exploreLabel}
              <ArrowDown size={16} />
            </a>
            <a className="text-link" href={pathFor('/contact', s)}>
              {s.inviteLabel}
              <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        <div className="orbital-coordinate" aria-hidden="true">
          {s.brand}
        </div>
        <Spacecraft site={s} />
        <div className="hero-bottom">
          <span>
            <span className="status-dot" />
            {s.availability}
          </span>
          <a href="#selected">
            {s.featuredLabel}
            <ArrowDown size={16} />
          </a>
        </div>
      </section>
      <section className="selected-section" id="selected">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / {s.projectsRoom}</p>
            <h2>{s.projectsHeading}</h2>
          </div>
          <a className="text-link" href={pathFor('/projects', s)}>
            {s.allProjectsLabel}
            <ArrowUpRight size={18} />
          </a>
        </div>
        <ProjectCards projects={data.projects.slice(0, 3)} site={s} />
      </section>
      <section className="home-contact">
        <div>
          <p className="eyebrow">
            <Radio size={16} />
            {s.contactRoom}
          </p>
          <h2>{s.contactHeading}</h2>
        </div>
        <a className="button amber" href={pathFor('/contact', s)}>
          {s.inviteLabel}
          <ArrowUpRight size={20} />
        </a>
      </section>
    </>
  );
}
