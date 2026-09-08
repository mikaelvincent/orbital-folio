'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Pause, Play, Orbit } from 'lucide-react';
import type { Portfolio } from '@/lib/content-types';
import { destinationFromURL, rooms, type Destination } from '@/lib/flight';
import { pathFor } from '@/lib/paths';
import { pageMetadata } from '@/lib/metadata';
import { Spacecraft } from './spacecraft';
import { Footer } from './portfolio-parts';
import { HomeView } from './home-view';
import { ProjectsView, DossierView, ExperienceView, AboutView, ContactView } from './views';
import { PrivacyView } from './privacy-view';

export function ImmersivePortfolio({ data, initialSection, initialSlug, preview, children }: {
  data: Portfolio; initialSection: string; initialSlug?: string; preview: boolean; children: React.ReactNode;
}) {
  const s = data.site;
  const [destination, setDestination] = useState<Destination>({ section: initialSection, slug: initialSlug });
  const [enhanced, setEnhanced] = useState(false);
  const [reading, setReading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState('');
  const [arrived, setArrived] = useState(false);
  const [travel, setTravel] = useState(false);
  const [reduced, setReduced] = useState(false);
  const reader = useRef<HTMLDivElement>(null);
  const latest = useRef(destination);
  latest.current = destination;
  const immersive = enhanced && !reading;
  const project = data.projects.find(p => p.slug === destination.slug);
  const hrefFor = useCallback((d: Destination) => pathFor(d.section === 'home' ? '/' : '/' + d.section + (d.slug ? '/' + d.slug : ''), s), [s]);
  const parseURL = useCallback((url: URL) => destinationFromURL(url, preview, data.projects), [preview, data.projects]);

  const go = useCallback((next: Destination, push = true) => {
    if (next.slug && !data.projects.some(p => p.slug === next.slug)) return false;
    const same = latest.current.section === next.section && latest.current.slug === next.slug;
    if (same) return true;
    setArrived(false);
    setTravel(!reading);
    setHover('');
    latest.current = next;
    setDestination(next);
    if (push) window.history.pushState({ orbital: true }, '', hrefFor(next));
    return true;
  }, [data.projects, hrefFor, reading]);

  useEffect(() => {
    setEnhanced(true);
    const url = new URL(location.href);
    const parsed = parseURL(url);
    setDestination(parsed || { section: initialSection, slug: initialSlug });
    setReading(new URLSearchParams(location.search).get('view') === 'reading');
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches);
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, [initialSection, initialSlug, parseURL]);

  useEffect(() => {
    const pop = (event: PopStateEvent) => {
      const next = parseURL(new URL(location.href));
      if (!next) return;
      // The browser already changed the URL. Keep this scene alive rather than fetching another page tree.
      event.stopImmediatePropagation();
      go(next, false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || latest.current.section === 'home') return;
      event.preventDefault();
      const previous = latest.current.section;
      go(latest.current.slug ? { section: 'projects' } : { section: 'home' });
      document.querySelector<HTMLAnchorElement>(`[data-room-link="${previous}"]`)?.focus({ preventScroll: true });
    };
    window.addEventListener('popstate', pop, true);
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('popstate', pop, true); window.removeEventListener('keydown', escape); };
  }, [go, parseURL]);

  useEffect(() => {
    if (!enhanced) return;
    const meta = pageMetadata(data, destination.section, project);
    document.title = preview ? 'Private draft preview' : meta.title;
    if (!preview) {
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', meta.alternates.canonical);
      const updateMeta = (attribute: string, name: string, value?: string) => {
        let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
        if (!value) { element?.remove(); return; }
        if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, name); document.head.appendChild(element); }
        element.content = value;
      };
      updateMeta('name', 'description', meta.description);
      updateMeta('name', 'robots', meta.robots ? 'noindex, follow' : 'index, follow');
      for (const key of ['title', 'description', 'url', 'type'] as const) updateMeta('property', 'og:' + key, meta.openGraph[key]);
      updateMeta('property', 'og:image', meta.openGraph.images[0]?.url);
      updateMeta('property', 'og:image:alt', meta.openGraph.images[0]?.alt);
      for (const key of ['title', 'description', 'card'] as const) updateMeta('name', 'twitter:' + key, meta.twitter[key]);
      updateMeta('name', 'twitter:image', meta.twitter.images[0]);
    }
    reader.current?.scrollTo({ top: 0, behavior: 'instant' });
    if (reading) { setTravel(false); setArrived(true); window.scrollTo({ top: 0, behavior: 'instant' }); reader.current?.focus({ preventScroll: true }); }
  }, [destination, enhanced, preview, project, s, data, reading]);

  const settled = useCallback(() => {
    setTravel(false);
    setArrived(true);
  }, []);
  useEffect(() => {
    if (arrived && immersive && destination.section !== 'home') reader.current?.focus({ preventScroll: true });
  }, [arrived, immersive, destination]);

  const capture = (event: React.MouseEvent) => {
    if (!enhanced || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
    const raw = anchor.getAttribute('href') || '';
    if (raw.startsWith('#')) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) return;
    const next = parseURL(url);
    if (!next || (next.slug && !data.projects.some(p => p.slug === next.slug))) return;
    event.preventDefault();
    go(next);
  };

  const content = destination.section === 'projects'
    ? project ? <DossierView data={data} project={project} /> : <ProjectsView data={data} />
    : destination.section === 'experience' ? <ExperienceView data={data} />
    : destination.section === 'about' ? <AboutView data={data} />
    : destination.section === 'contact' ? <ContactView data={data} sent={destination.sent} error={destination.error} />
    : destination.section === 'privacy' ? <PrivacyView data={data} /> : <HomeView data={data} />;

  return <div className={`orbital-experience public-site ${immersive ? 'is-immersive' : 'is-readable'} destination-${destination.section} ${destination.slug ? 'has-dossier' : ''} ${travel ? 'is-travelling' : ''} ${paused || reduced ? 'is-motionless' : ''}`}
    lang={s.language} style={{ '--accent': s.accent } as React.CSSProperties} onClickCapture={capture}>
    {preview && <div className="preview-banner">Private draft preview · <a href="/admin">Return to studio</a></div>}
    <a className="skip-link" href={immersive && destination.section !== 'home' ? '#room-reader' : '#main'}>{s.skipLabel}</a>
    <header className="flight-header">
      <a className="flight-identity" href={hrefFor({ section: 'home' })} aria-label={`${s.name} · ${s.homeLabel}`}><span>{s.name}</span></a>
      <nav aria-label={s.sectionLabel}>
        {rooms.map(id => <a key={id} data-room-link={id} href={hrefFor({ section: id })}
          aria-current={destination.section === id ? 'page' : undefined}
          onPointerEnter={() => setHover(id)} onPointerLeave={() => setHover('')}
          onFocus={() => setHover(id)} onBlur={() => setHover('')}>{s[id + 'Label']}</a>)}
      </nav>
    </header>
    <main id="main" tabIndex={-1}>
      {!s.sampleMode && !preview && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: s.name, url: s.domain, jobTitle: s.title, description: s.biography, sameAs: data.links.map(l => l.url) }).replace(/</g, '\\u003c') }} />}
      <div className="orbital-render" hidden={!immersive}>
        <Spacecraft site={s} section={destination.section} detail={!!destination.slug} paused={paused || reduced}
          enabled={immersive} hover={hover} onHover={setHover} onNavigate={id => go({ section: id })}
          onSettled={settled} onUnavailable={() => { setReading(true); setTravel(false); }} />
      </div>
      {immersive && destination.section === 'home' && <h1 className="sr-only">{s.name} — {s.title}</h1>}
      <div className="reader-stage" hidden={immersive && (destination.section === 'home' || !arrived)}>
        <div className={`room-reader reader-${destination.section}`} id="room-reader" ref={reader} tabIndex={-1} aria-label={s[destination.section + 'Label'] || s.homeLabel}>
          <div className="reader-navigation"><a href={hrefFor({ section: 'home' })}><ArrowLeft size={16} />{s.homeLabel}</a><span>{s[destination.section + 'Room'] || s.brand}</span></div>
          {enhanced ? content : children}
        </div>
      </div>
      {immersive && destination.section === 'home' && <div className="flight-hint" aria-live="polite"><span className={hover ? 'active' : ''}>{hover ? s[hover + 'Label'] : s.shipCaption}</span></div>}
      <div className="flight-tools" hidden={!enhanced}>
        <button type="button" onClick={() => { setReading(!reading); setArrived(false); }} aria-pressed={reading}><BookOpen size={16} /><span>{reading ? s.sceneLabel : s.readLabel}</span></button>
        {!reading && !reduced && <button type="button" aria-label={paused ? s.resumeLabel : s.pauseLabel} title={paused ? s.resumeLabel : s.pauseLabel} onClick={() => setPaused(!paused)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}
      </div>
      {immersive && <div className="flight-status"><span className="status-dot" />{s.sampleMode ? s.sampleLabel : s.availability}<a href="/admin" aria-label={s.studioLabel}><Orbit size={15} /></a></div>}
      <span className="sr-only" aria-live="polite">{arrived && destination.section !== 'home' ? s[destination.section + 'Label'] : ''}</span>
    </main>
    {!immersive && <Footer site={s} />}
  </div>;
}
