import { ArrowUpRight } from 'lucide-react';
import { pathFor } from '@/lib/paths';
import { portfolioIdentity } from '@/lib/content/interface-text';
import type { Portfolio } from '@/lib/content/types';
export function HomeView({ data }: { data: Portfolio }) {
  const s = data.site;
  return (
    <section className="reading-overview">
      <h1>{portfolioIdentity(s)}</h1>
      <p className="hero-role">{s.title}</p>
      <nav className="reading-room-links" aria-label={s.sectionLabel}>
        {['projects', 'experience', 'about', 'contact'].map((room) => (
          <a
            key={room}
            href={pathFor(
              `/${room === 'experience' ? 'case-studies' : room}`,
              s,
            )}
          >
            <span>{s[room + 'Label']}</span>
            <ArrowUpRight size={22} />
          </a>
        ))}
      </nav>
    </section>
  );
}
