'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ContactDraft, ContactSubmission } from './contact-form';
import { SceneLoader } from '../spacecraft/scene-loader';
import { WorldReader } from './world-reader';
import {
  ProjectLibraryWindow,
  type ProjectFilter,
} from './project-library-window';
import { ArrowLeft, BookOpen, ChevronUp, Home } from 'lucide-react';
import type { Portfolio } from '@/lib/content/types';
import { projectCategoryCount } from '@/lib/content/project-content';
import { caseStudyCategoryCount } from '@/lib/content/case-study-content';
import { CaseStudyLibraryWindow } from './case-study-library-window';
import type { SceneAudit } from '../diagnostics/scene-audit';
import {
  destinationFromURL,
  rooms,
  type Destination,
} from '@/features/spacecraft/navigation/flight';
import { pathFor } from '@/lib/paths';
import { pageMetadata } from '@/lib/metadata';
import { Spacecraft } from '../spacecraft/spacecraft';
import { Footer } from './portfolio-parts';
import { HomeView } from './home-view';
import {
  ProjectsView,
  DossierView,
  ExperienceView,
  CaseStudyView,
  AboutView,
  ContactView,
} from './room-views';
import { PrivacyView } from './privacy-view';
import { SceneToolsMenu } from './scene-tools-menu';
import type { EarthPlaybackController } from '../orbit/earth-playback';

export function ImmersivePortfolio({
  data,
  initialSection,
  initialSlug,
  preview,
  children,
  sceneAudit,
}: {
  data: Portfolio;
  initialSection: string;
  initialSlug?: string;
  preview: boolean;
  children: React.ReactNode;
  /** Explicit local performance fixtures only; absent in normal routes. */
  sceneAudit?: SceneAudit;
}) {
  const s = data.site;
  let portfolioName = s.name;
  try {
    portfolioName = new URL(s.domain).hostname || s.name;
  } catch {
    // An unfinished domain setting still leaves the editable owner name visible.
  }
  const [destination, setDestination] = useState<Destination>({
    section: initialSection,
    slug: initialSlug,
  });
  const [enhanced, setEnhanced] = useState(false);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
  const sceneToolsToggle = useRef<HTMLButtonElement>(null);
  const [earthPlayback, setEarthPlayback] =
    useState<EarthPlaybackController | null>(null);
  const [reading, setReading] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigation = useRef<HTMLDivElement>(null);
  const navigationToggle = useRef<HTMLButtonElement>(null);
  const requestSceneNavigation = useRef<((section: string) => boolean) | null>(
    null,
  );
  const [arrived, setArrived] = useState(false);
  const [travel, setTravel] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [contactDraft, setContactDraft] = useState<ContactDraft>({});
  const [contactSubmission, setContactSubmission] = useState<ContactSubmission>(
    { status: 'idle', error: '' },
  );
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const [selectedProjectScreen, setProjectScreen] =
    useState<ProjectFilter>('all');
  const projectScreen = projectCategoryCount(
    data.projects,
    selectedProjectScreen,
  )
    ? selectedProjectScreen
    : 'all';
  const caseStudyScreen =
    destination.category &&
    caseStudyCategoryCount(data.experience, destination.category)
      ? destination.category
      : 'all';
  const reader = useRef<HTMLDivElement>(null);
  const latest = useRef(destination);
  latest.current = destination;
  const immersive = enhanced && !reading && destination.section !== 'privacy';
  const readingSurface =
    !!(destination.slug || destination.open) &&
    (destination.section !== 'projects' || data.projects.length > 0) &&
    (destination.section !== 'experience' || data.experience.length > 0);
  const project =
    destination.section === 'projects'
      ? data.projects.find((p) => p.slug === destination.slug)
      : undefined;
  const caseStudy =
    destination.section === 'experience'
      ? data.experience.find((entry) => entry.slug === destination.slug)
      : undefined;
  const hrefFor = useCallback(
    (d: Destination) => {
      const path = pathFor(
        d.section === 'home'
          ? '/'
          : '/' + d.section + (d.slug ? '/' + d.slug : ''),
        s,
      );
      const query = new URLSearchParams();
      if (d.open) query.set('open', '1');
      if (d.section === 'experience' && d.category && d.category !== 'all')
        query.set('category', d.category);
      return (
        path + (query.size ? (path.includes('?') ? '&' : '?') + query : '')
      );
    },
    [s],
  );
  const parseURL = useCallback(
    (url: URL) =>
      destinationFromURL(url, preview, data.projects, data.experience),
    [preview, data.projects, data.experience],
  );

  const go = useCallback(
    (next: Destination, push = true) => {
      if (
        next.slug &&
        !(next.section === 'experience' ? data.experience : data.projects).some(
          (p) => p.slug === next.slug,
        )
      )
        return false;
      setNavigationOpen(false);
      // Leave the URL and current destination unchanged until the camera
      // arrives. Every ordinary door, menu item, and Home shares this slot.
      if (
        push &&
        immersive &&
        !next.slug &&
        !next.open &&
        !next.sent &&
        !next.error &&
        (next.section === 'home' ||
          rooms.some((room) => room === next.section)) &&
        requestSceneNavigation.current?.(next.section)
      )
        return true;
      const same =
        latest.current.section === next.section &&
        latest.current.slug === next.slug &&
        latest.current.category === next.category &&
        !!latest.current.open === !!next.open &&
        !!latest.current.sent === !!next.sent &&
        !!latest.current.error === !!next.error;
      if (same) {
        navigationToggle.current?.focus({ preventScroll: true });
        return true;
      }
      const withinApplication =
        ['projects', 'experience'].includes(latest.current.section) &&
        next.section === latest.current.section &&
        !!(latest.current.slug || latest.current.open) &&
        !!(next.slug || next.open);
      setArrived(withinApplication);
      setTravel(!reading && !withinApplication);
      latest.current = next;
      setDestination(next);
      if (push) window.history.pushState({ orbital: true }, '', hrefFor(next));
      return true;
    },
    [data.projects, data.experience, hrefFor, reading, immersive],
  );

  useEffect(() => {
    setEnhanced(true);
    setDiagnosticsEnabled(
      new URLSearchParams(location.search).get('perf') === '1',
    );
    const url = new URL(location.href);
    const parsed = parseURL(url);
    setDestination(parsed || { section: initialSection, slug: initialSlug });
    setReading(
      new URLSearchParams(location.search).get('view') === 'reading' ||
        location.hash === '#room-reader' ||
        innerHeight < 480,
    );
    const viewportChange = () => {
      if (
        document.activeElement?.matches('input,textarea,[contenteditable=true]')
      )
        return;
      if (innerHeight < 480 || (window.visualViewport?.scale || 1) > 1.15)
        setReading(true);
    };
    window.addEventListener('resize', viewportChange);
    window.visualViewport?.addEventListener('resize', viewportChange);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches);
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => {
      media.removeEventListener('change', change);
      window.removeEventListener('resize', viewportChange);
      window.visualViewport?.removeEventListener('resize', viewportChange);
    };
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
      if (event.defaultPrevented) return;
      if (event.key === 'Escape' && navigationOpen) {
        event.preventDefault();
        setNavigationOpen(false);
        navigationToggle.current?.focus({ preventScroll: true });
        return;
      }
      if (event.key !== 'Escape' || latest.current.section === 'home') return;
      event.preventDefault();
      const previous = latest.current.section;
      go(
        latest.current.slug || latest.current.open
          ? { section: previous }
          : { section: 'home' },
      );
      (immersive
        ? navigationToggle.current
        : document.querySelector<HTMLAnchorElement>(
            `[data-room-link="${previous}"]`,
          )
      )?.focus({ preventScroll: true });
    };
    window.addEventListener('popstate', pop, true);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('popstate', pop, true);
      window.removeEventListener('keydown', escape);
    };
  }, [go, parseURL, navigationOpen, immersive]);

  useEffect(() => {
    if (!navigationOpen) return;
    const outside = (event: Event) => {
      if (!navigation.current?.contains(event.target as Node)) {
        setNavigationOpen(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
    };
  }, [navigationOpen]);

  useEffect(() => {
    if (!enhanced) return;
    const meta = pageMetadata(data, destination.section, caseStudy || project);
    document.title = preview ? 'Private draft preview' : meta.title;
    if (!preview) {
      document
        .querySelector<HTMLLinkElement>('link[rel="canonical"]')
        ?.setAttribute('href', meta.alternates.canonical);
      const updateMeta = (attribute: string, name: string, value?: string) => {
        let element = document.head.querySelector<HTMLMetaElement>(
          `meta[${attribute}="${name}"]`,
        );
        if (!value) {
          element?.remove();
          return;
        }
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute(attribute, name);
          document.head.appendChild(element);
        }
        element.content = value;
      };
      updateMeta('name', 'description', meta.description);
      updateMeta(
        'name',
        'robots',
        meta.robots ? 'noindex, follow' : 'index, follow',
      );
      for (const key of ['title', 'description', 'url', 'type'] as const)
        updateMeta('property', 'og:' + key, meta.openGraph[key]);
      updateMeta('property', 'og:image', meta.openGraph.images[0]?.url);
      updateMeta('property', 'og:image:alt', meta.openGraph.images[0]?.alt);
      for (const key of ['title', 'description', 'card'] as const)
        updateMeta('name', 'twitter:' + key, meta.twitter[key]);
      updateMeta('name', 'twitter:image', meta.twitter.images[0]);
    }
    reader.current?.scrollTo({ top: 0, behavior: 'instant' });
    if (reading) {
      setTravel(false);
      setArrived(true);
      window.scrollTo({ top: 0, behavior: 'instant' });
      reader.current?.focus({ preventScroll: true });
    }
  }, [destination, enhanced, preview, project, caseStudy, s, data, reading]);

  const settled = useCallback(() => {
    setTravel(false);
    setArrived(true);
  }, []);
  useEffect(() => {
    if (!arrived || !immersive || destination.section === 'home') return;
    // A visitor may be choosing a new destination as the current flight ends.
    if (navigation.current?.querySelector('nav')) return;
    if (readingSurface) {
      const appHeading = ['projects', 'experience'].includes(
        destination.section,
      )
        ? document.querySelector<HTMLElement>('#world-reader h1')
        : null;
      (
        appHeading || document.querySelector<HTMLElement>('#world-reader')
      )?.focus({ preventScroll: true });
    } else
      // Announce arrival without selecting a door or moving the camera toward
      // an arbitrary neighbor. Tab still reaches every visible scene control.
      document
        .querySelector<HTMLElement>('#main')
        ?.focus({ preventScroll: true });
  }, [arrived, immersive, destination, readingSurface]);

  const capture = (event: React.MouseEvent) => {
    if (
      !enhanced ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>(
      'a[href]',
    );
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
    // The library saves its scroll position before handling its own project links.
    if (anchor.closest('[data-project-interface], [data-case-study-interface]'))
      return;
    const raw = anchor.getAttribute('href') || '';
    if (raw.startsWith('#')) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) return;
    const next = parseURL(url);
    if (
      !next ||
      (next.slug &&
        !(next.section === 'experience' ? data.experience : data.projects).some(
          (p) => p.slug === next.slug,
        ))
    )
      return;
    event.preventDefault();
    go(next);
  };

  const content =
    destination.section === 'projects' ? (
      project ? (
        <DossierView data={data} project={project} />
      ) : (
        <ProjectsView data={data} />
      )
    ) : destination.section === 'experience' ? (
      caseStudy ? (
        <CaseStudyView
          data={data}
          caseStudy={caseStudy}
          category={caseStudyScreen}
        />
      ) : (
        <ExperienceView
          data={data}
          category={caseStudyScreen}
          onCategoryChange={(category) =>
            go({ section: 'experience', category })
          }
        />
      )
    ) : destination.section === 'about' ? (
      <AboutView data={data} />
    ) : destination.section === 'contact' ? (
      <ContactView
        data={data}
        sent={destination.sent}
        error={destination.error}
        submission={contactSubmission}
        onSubmissionChange={setContactSubmission}
        draft={contactDraft}
        onDraftChange={setContactDraft}
      />
    ) : destination.section === 'privacy' ? (
      <PrivacyView data={data} />
    ) : (
      <HomeView data={data} />
    );

  return (
    <div
      className={`orbital-experience public-site ${immersive ? 'is-immersive' : 'is-readable'} destination-${destination.section} ${destination.slug ? 'has-dossier' : ''} ${travel ? 'is-travelling' : ''} ${reduced ? 'is-motionless' : ''}`}
      lang={s.language}
      style={{ '--accent': s.accent } as React.CSSProperties}
      onClickCapture={capture}
    >
      {!enhanced && <SceneLoader site={s} boot />}
      <noscript>
        <style>{`.boot-loader { display: none !important; }`}</style>
      </noscript>
      {preview && (
        <div className="preview-banner">
          Private draft preview · <a href="/admin">Return to studio</a>
        </div>
      )}
      <a
        className="skip-link"
        href={immersive && readingSurface ? '#world-reader' : '#main'}
      >
        {s.skipLabel}
      </a>
      <header className="flight-header" hidden={immersive}>
        <a
          className="flight-identity"
          href={hrefFor({ section: 'home' })}
          aria-label={`${s.name} · ${s.homeLabel}`}
        >
          <span>{s.name}</span>
        </a>
        <nav aria-label={s.sectionLabel}>
          {rooms.map((id) => (
            <a
              key={id}
              data-room-link={id}
              data-scene-room={id}
              title={s[id + 'Label']}
              href={hrefFor({ section: id })}
              aria-current={destination.section === id ? 'page' : undefined}
            >
              {s[id + 'Label']}
            </a>
          ))}
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        {immersive && (
          <div className="orbital-identity">
            <div className="orbital-identity-flight">
              {destination.section === 'home' ? (
                <h1>
                  <a href={hrefFor({ section: 'home' })}>
                    <span className="orbital-identity-text">
                      {portfolioName}
                    </span>
                    <span className="sr-only">
                      {' '}
                      — {s.name} · {s.title}
                    </span>
                  </a>
                </h1>
              ) : (
                <a
                  href={hrefFor({ section: 'home' })}
                  aria-label={`${portfolioName} · ${s.homeLabel}`}
                >
                  <span className="orbital-identity-text">{portfolioName}</span>
                </a>
              )}
            </div>
          </div>
        )}
        {!s.sampleMode && !preview && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Person',
                name: s.name,
                url: s.domain,
                jobTitle: s.title,
                description: s.biography,
                sameAs: data.links.map((l) => l.url),
              }).replace(/</g, '\\u003c'),
            }}
          />
        )}
        <div className="orbital-render" hidden={!immersive}>
          <Spacecraft
            audit={sceneAudit}
            site={s}
            projects={data.projects}
            caseStudies={data.experience}
            links={data.links}
            section={destination.section}
            slug={destination.slug}
            readingSurface={readingSurface}
            projectPage={0}
            projectScreen={projectScreen}
            caseStudyScreen={caseStudyScreen}
            onOpenCaseStudies={(category) => {
              if (!caseStudyCategoryCount(data.experience, category)) return;
              go({ section: 'experience', open: true, category });
            }}
            onCloseCaseStudies={() => go({ section: 'experience' })}
            onOpenProjects={(category) => {
              if (!projectCategoryCount(data.projects, category)) return;
              setProjectScreen(category);
              const monitorChanged = category !== projectScreen;
              const current = latest.current;
              if (
                !(
                  current.section === 'projects' &&
                  current.open &&
                  !current.slug
                )
              )
                go({ section: 'projects', open: true });
              if (monitorChanged) {
                setArrived(false);
                setTravel(true);
              }
            }}
            onCloseProjects={() => go({ section: 'projects' })}
            paused={reduced}
            enabled={immersive}
            diagnosticsEnabled={diagnosticsEnabled}
            onDiagnosticsClose={() => {
              setDiagnosticsEnabled(false);
              sceneToolsToggle.current?.focus({ preventScroll: true });
            }}
            onNavigate={(id) => go({ section: id })}
            onOpenContact={() => go({ section: 'contact', open: true })}
            onCloseContact={() => go({ section: 'contact' })}
            onNavigationReady={(request) => {
              requestSceneNavigation.current = request;
            }}
            onSurfaceReady={setSurface}
            onEarthPlaybackReady={setEarthPlayback}
            onSettled={settled}
            onUnavailable={() => {
              setReading(true);
              setTravel(false);
            }}
          />
        </div>
        {immersive && !readingSurface && destination.section !== 'home' && (
          <h1 className="sr-only">
            {destination.section === 'home'
              ? `${s.name} — ${s.title}`
              : s[destination.section + 'Heading'] ||
                s[destination.section + 'Label']}
          </h1>
        )}
        {immersive &&
          readingSurface &&
          surface &&
          createPortal(
            destination.section === 'projects' ? (
              <ProjectLibraryWindow
                key="projects"
                data={data}
                category={projectScreen}
                project={project}
                onProjectSelect={(item) =>
                  go({ section: 'projects', slug: item.slug })
                }
                onBack={() => go({ section: 'projects', open: true })}
                onClose={() => go({ section: 'projects' })}
              />
            ) : destination.section === 'experience' ? (
              <CaseStudyLibraryWindow
                key="case-studies"
                data={data}
                category={caseStudyScreen}
                caseStudy={caseStudy}
                onCaseStudySelect={(item) =>
                  go({
                    section: 'experience',
                    slug: item.slug,
                    category: caseStudyScreen,
                  })
                }
                onBack={() =>
                  go({
                    section: 'experience',
                    open: true,
                    category: caseStudyScreen,
                  })
                }
                onClose={() => go({ section: 'experience' })}
              />
            ) : (
              <WorldReader
                key={destination.section}
                data={data}
                section={destination.section}
                sent={destination.sent}
                error={destination.error}
                submission={contactSubmission}
                onSubmissionChange={setContactSubmission}
                draft={contactDraft}
                onDraftChange={setContactDraft}
                onClose={() => go({ section: destination.section })}
              />
            ),
            surface,
          )}
        <div className="reader-stage" hidden={immersive}>
          <div
            className={`room-reader reader-${destination.section}`}
            id="room-reader"
            ref={reader}
            tabIndex={-1}
            aria-label={s[destination.section + 'Label'] || s.homeLabel}
          >
            <div className="reader-navigation">
              <a href={hrefFor({ section: 'home' })}>
                <ArrowLeft size={16} />
                {s.homeLabel}
              </a>
              <span>{s[destination.section + 'Room'] || s.brand}</span>
            </div>
            {!immersive && (enhanced ? content : children)}
          </div>
        </div>
        {immersive && (
          <div className="flight-navigation" ref={navigation}>
            <a
              className="flight-home"
              href={hrefFor({ section: 'home' })}
              aria-label={s.homeLabel}
              title={s.homeLabel}
              aria-current={destination.section === 'home' ? 'page' : undefined}
            >
              <Home size={18} aria-hidden="true" />
            </a>
            <button
              className="flight-navigation-toggle"
              ref={navigationToggle}
              type="button"
              aria-expanded={navigationOpen}
              aria-controls="flight-destinations"
              aria-label={`${s.sectionLabel} · ${s[destination.section + 'Label'] || s.homeLabel}`}
              onClick={() => {
                setNavigationOpen(!navigationOpen);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  setNavigationOpen(true);
                  requestAnimationFrame(() =>
                    navigation.current
                      ?.querySelector<HTMLAnchorElement>('nav a')
                      ?.focus(),
                  );
                }
              }}
            >
              <span>{s[destination.section + 'Label'] || s.homeLabel}</span>
              <ChevronUp size={14} />
            </button>
            {navigationOpen && (
              <nav
                id="flight-destinations"
                className="flight-destinations"
                aria-label={s.sectionLabel}
              >
                <span className="flight-menu-identity">{s.name}</span>
                {(['home', ...rooms] as const).map((id) => (
                  <a
                    key={id}
                    data-room-link={id}
                    data-scene-room={id}
                    href={hrefFor({ section: id })}
                    aria-current={
                      destination.section === id ? 'page' : undefined
                    }
                  >
                    <span>{id === 'home' ? s.homeLabel : s[id + 'Label']}</span>
                    <span aria-hidden="true">{id === 'home' ? '◎' : '↗'}</span>
                  </a>
                ))}
              </nav>
            )}
          </div>
        )}
        <div className="flight-tools" hidden={!enhanced}>
          {immersive && (
            <SceneToolsMenu
              launcherRef={sceneToolsToggle}
              earthPlayback={earthPlayback}
              motionPaused={reduced}
              diagnosticsEnabled={diagnosticsEnabled}
              onDiagnosticsChange={setDiagnosticsEnabled}
              studioLabel={s.studioLabel}
            />
          )}
          <button
            className="flight-view-toggle"
            type="button"
            onClick={() => {
              setReading(!reading);
              setNavigationOpen(false);
              setArrived(false);
            }}
            aria-pressed={reading}
            aria-label={reading ? s.sceneLabel : s.readLabel}
            title={reading ? s.sceneLabel : s.readLabel}
          >
            <BookOpen size={16} />
            <span>{reading ? s.sceneLabel : s.readLabel}</span>
          </button>
        </div>
        {immersive && !s.sampleMode && (
          <div className="flight-status">
            <span className="status-dot" />
            {s.availability}
          </div>
        )}
        <span className="sr-only" aria-live="polite">
          {arrived && destination.section !== 'home'
            ? s[destination.section + 'Label']
            : ''}
        </span>
      </main>
      {!immersive && <Footer site={s} />}
    </div>
  );
}
