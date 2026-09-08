import { ProjectCards } from './portfolio-parts';
import type { Portfolio } from '@/lib/content-types';
export function HomeView({ data }: { data: Portfolio }) {
  const s = data.site;
  return <section className="reading-overview">
    <p className="eyebrow">{s.brand}</p>
    <h1>{s.headline}</h1><p className="hero-role">{s.title}</p><p>{s.intro}</p>
    <h2>{s.projectsHeading}</h2><ProjectCards projects={data.projects} site={s} />
  </section>;
}
