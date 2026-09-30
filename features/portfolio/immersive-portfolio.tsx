'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ContactDraft, ContactSubmission } from './contact-form';
import { SceneLoader } from '../spacecraft/scene-loader';
import { ContactComputerWindow } from './contact-computer-window';
import { AboutNotebook } from './about-notebook';
import {
  notebookPageOffset,
  notebookSpreadCount,
} from '@/lib/content/notebook-pages';
import {
  ProjectLibraryWindow,
  type ProjectFilter,
} from './project-library-window';
import { ArrowLeft, BookOpen, ChevronUp, Home } from 'lucide-react';
import type { Portfolio } from '@/lib/content/types';
import { projectCategoryCount } from '@/lib/content/project-content';
import { CaseStudyLibraryWindow } from './case-study-library-window';
import type { SceneAudit } from '../diagnostics/scene-audit';
import {
  applicationDestination,
  destinationFromURL,
  destinationHref,
  rooms,
  type Destination,
} from '@/features/spacecraft/navigation/flight';
import { paletteAccent } from '@/lib/palette';
import { pageMetadata } from '@/lib/metadata';
import { Spacecraft } from '../spacecraft/spacecraft';
import {
  interfaceText as copy,
  portfolioIdentity,
} from '@/lib/content/interface-text';
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
import {
  DEFAULT_RENDERING_SETTINGS,
  type RenderingObserver,
} from '../spacecraft/rendering-settings';
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
  const portfolioName = portfolioIdentity(s);
  const [destination, setDestination] = useState<Destination>({
    section: initialSection,
    slug: initialSlug,
  });
  const [enhanced, setEnhanced] = useState(false);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
  const sceneToolsToggle = useRef<HTMLButtonElement>(null);
  const [renderingSettings, setRenderingSettings] = useState(
    DEFAULT_RENDERING_SETTINGS,
  );
  const [renderingObserver, setRenderingObserver] =
    useState<RenderingObserver | null>(null);
  const [earthPlayback, setEarthPlayback] =
    useState<EarthPlaybackController | null>(null);
  const [reading, setReading] = useState(false);
  const [selectedChapter, setNotebookChapter] = useState(0);
  const notebookSection =
    destination.section === 'about'
      ? data.journal.find((entry) => entry.slug === destination.slug)
      : undefined;
  const notebookChapter = Math.min(
    notebookSection ? data.journal.indexOf(notebookSection) : selectedChapter,
    Math.max(0, data.journal.length - 1),
  );
  const [notebookPages, setNotebookPages] = useState<Record<string, number>>(
    {},
  );
  const [measuredNotebookCounts, setNotebookCounts] = useState<
    Record<string, number>
  >({});
  const notebookKey = useCallback(
    (index: number) =>
      JSON.stringify([
        data.journal[index]?.id || index,
        data.journal[index]?.title,
        data.journal[index]?.subtitle,
        data.journal[index]?.body,
        index === 0 ? data.site.biography : '',
        data.media,
      ]),
    [data.journal, data.site.biography, data.media],
  );
  const notebookCounts = data.journal.map(
    (_entry, index) => measuredNotebookCounts[notebookKey(index)] || 1,
  );
  // Content counts printed pages; the physical scene advances one facing spread per leaf.
  const notebookSpreads = notebookCounts.map(notebookSpreadCount);
  const notebookPage = Math.min(
    notebookSection
      ? destination.page || 0
      : notebookPages[notebookKey(notebookChapter)] || 0,
    (notebookSpreads[notebookChapter] || 1) - 1,
  );
  const notebookJournal = useMemo(
    () =>
      data.journal.map((entry, index) => ({
        ...entry,
        pageCount: notebookSpreadCount(
          measuredNotebookCounts[notebookKey(index)] || 1,
        ),
      })),
    [data.journal, measuredNotebookCounts, notebookKey],
  );
  const notebookPageCount = (section: number, count: number) => {
    const key = notebookKey(section);
    setNotebookCounts((previous) =>
      previous[key] === count ? previous : { ...previous, [key]: count },
    );
  };
  // Keep the selected place when closing the notebook or visiting another room.
  // The route owns it while open, including browser Back/Forward and refresh.
  useEffect(() => {
    if (!notebookSection) return;
    setNotebookChapter(notebookChapter);
    const key = notebookKey(notebookChapter);
    const page = destination.page || 0;
    setNotebookPages((previous) =>
      previous[key] === page ? previous : { ...previous, [key]: page },
    );
  }, [notebookSection, notebookChapter, notebookKey, destination.page]);
  const returnToNotebook = useRef(false);
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
  const [notebookSurface, setNotebookSurface] = useState<HTMLDivElement | null>(
    null,
  );
  const [selectedProjectScreen, setProjectScreen] =
    useState<ProjectFilter>('all');
  const projectScreen = projectCategoryCount(
    data.projects,
    selectedProjectScreen,
  )
    ? selectedProjectScreen
    : 'all';
  const caseStudyScreen = destination.category || 'all';
  const reader = useRef<HTMLDivElement>(null);
  const latest = useRef(destination);
  latest.current = destination;
  const immersive = enhanced && !reading;
  const sceneDestination = applicationDestination(destination);
  const readingSurface =
    !!(sceneDestination.slug || sceneDestination.open) &&
    (destination.section !== 'projects' || data.projects.length > 0);
  const project =
    destination.section === 'projects'
      ? data.projects.find((p) => p.slug === destination.slug)
      : undefined;
  const caseStudy =
    destination.section === 'experience'
      ? data.experience.find((entry) => entry.slug === destination.slug)
      : undefined;
  const hrefFor = useCallback(
    (d: Destination) => destinationHref(d, s, reading),
    [s, reading],
  );
  const parseURL = useCallback(
    (url: URL) =>
      destinationFromURL(
        url,
        preview,
        data.projects,
        data.experience,
        data.journal,
      ),
    [preview, data.projects, data.experience, data.journal],
  );
  const isKnownDestination = useCallback(
    (next: Destination) =>
      !next.slug ||
      (next.section === 'about'
        ? data.journal
        : next.section === 'experience'
          ? data.experience
          : data.projects
      ).some((entry) => entry.slug === next.slug),
    [data.journal, data.experience, data.projects],
  );

  const go = useCallback(
    (next: Destination, push = true) => {
      if (!isKnownDestination(next)) return false;
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
        (latest.current.page || 0) === (next.page || 0) &&
        latest.current.category === next.category &&
        !!latest.current.open === !!next.open &&
        !!latest.current.sent === !!next.sent &&
        !!latest.current.error === !!next.error;
      if (same) {
        if (next.section !== 'about' || !(next.slug || next.open))
          navigationToggle.current?.focus({ preventScroll: true });
        return true;
      }
      const currentApplication = applicationDestination(latest.current);
      const nextApplication = applicationDestination(next);
      const withinApplication =
        rooms.includes(currentApplication.section as (typeof rooms)[number]) &&
        nextApplication.section === currentApplication.section &&
        !!(currentApplication.slug || currentApplication.open) &&
        !!(nextApplication.slug || nextApplication.open);
      setArrived(withinApplication);
      setTravel(!reading && !withinApplication);
      returnToNotebook.current =
        latest.current.section === 'about' &&
        !!(latest.current.open || latest.current.slug) &&
        next.section === 'about' &&
        !next.open &&
        !next.slug;
      latest.current = next;
      setDestination(next);
      if (push) window.history.pushState({ orbital: true }, '', hrefFor(next));
      return true;
    },
    [isKnownDestination, hrefFor, reading, immersive],
  );

  const openNotebookSection = (section: number, page?: number) => {
    const entry = data.journal[section];
    go(
      entry
        ? {
            section: 'about',
            slug: entry.slug,
            page: page ?? notebookPages[notebookKey(section)] ?? 0,
          }
        : { section: 'about', open: true },
    );
  };

  useEffect(() => {
    // Pagination needs loaded fonts/content before an oversized page can be clamped.
    if (
      !notebookSection ||
      measuredNotebookCounts[notebookKey(notebookChapter)] === undefined ||
      (destination.page || 0) === notebookPage
    )
      return;
    const next = { ...destination, page: notebookPage };
    latest.current = next;
    setDestination(next);
    window.history.replaceState(window.history.state, '', hrefFor(next));
  }, [
    destination,
    notebookSection,
    notebookChapter,
    notebookPage,
    measuredNotebookCounts,
    notebookKey,
    hrefFor,
  ]);

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
      const url = new URL(location.href);
      const next = parseURL(url);
      if (!next) return;
      // The browser already changed the URL. Keep this scene alive rather than fetching another page tree.
      event.stopImmediatePropagation();
      go(next, false);
      const nextReading =
        url.searchParams.get('view') === 'reading' ||
        url.hash === '#room-reader' ||
        innerHeight < 480;
      if (nextReading !== reading) {
        setReading(nextReading);
        setArrived(false);
      }
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
        previous === 'privacy'
          ? { section: 'contact', open: true }
          : latest.current.slug || latest.current.open
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
  }, [go, parseURL, navigationOpen, immersive, reading]);

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
    const meta = pageMetadata(
      data,
      destination.section,
      notebookSection || caseStudy || project,
    );
    document.title = preview ? copy(s, 'Private draft preview') : meta.title;
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
  }, [
    destination,
    enhanced,
    preview,
    project,
    caseStudy,
    notebookSection,
    s,
    data,
    reading,
  ]);

  const settled = useCallback(() => {
    setTravel(false);
    setArrived(true);
  }, []);
  useEffect(() => {
    if (!arrived || !immersive || destination.section === 'home') return;
    // A visitor may be choosing a new destination as the current flight ends.
    if (navigation.current?.querySelector('nav')) return;
    if (
      returnToNotebook.current &&
      destination.section === 'about' &&
      !readingSurface
    ) {
      document
        .querySelector<HTMLButtonElement>('.world-notebook-target')
        ?.focus({ preventScroll: true });
      returnToNotebook.current = false;
      return;
    }
    if (readingSurface) {
      // The notebook owns focus on the visible spread; its title may be off-page.
      if (destination.section === 'about') return;
      const appHeading = ['projects', 'experience', 'privacy'].includes(
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
    if (!next || !isKnownDestination(next)) return;
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
      <AboutView data={data} section={notebookSection} />
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
      <PrivacyView
        data={data}
        backHref={hrefFor({ section: 'contact', open: true })}
      />
    ) : (
      <HomeView data={data} />
    );

  return (
    <div
      className={`orbital-experience public-site ${immersive ? 'is-immersive' : 'is-readable'} destination-${destination.section} ${destination.slug ? 'has-dossier' : ''} ${travel ? 'is-travelling' : ''} ${reduced ? 'is-motionless' : ''}`}
      lang={s.language}
      style={{ '--accent': paletteAccent(s.accent) } as React.CSSProperties}
      onClickCapture={capture}
    >
      {!enhanced && <SceneLoader site={s} boot />}
      <noscript>
        <style>{`.boot-loader { display: none !important; }`}</style>
      </noscript>
      {preview && (
        <div className="preview-banner">
          {copy(s, 'Private draft preview')} ·{' '}
          <a href="/admin">{copy(s, 'Return to studio')}</a>
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
            <div className="orbital-identity-sizing" aria-hidden="true">
              <span className="orbital-identity-text">{portfolioName}</span>
            </div>
            <div className="orbital-identity-flight">
              {destination.section === 'home' ? (
                <h1>
                  <a href={hrefFor({ section: 'home' })}>
                    <span className="orbital-identity-text">
                      {portfolioName}
                    </span>
                    <span className="sr-only"> — {s.name}</span>
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
              <p className="orbital-identity-role" title={s.title}>
                {s.title}
              </p>
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
            journal={notebookJournal}
            notebookChapter={
              notebookPageOffset(notebookSpreads, notebookChapter) +
              notebookPage
            }
            onOpenNotebook={() =>
              openNotebookSection(notebookChapter, notebookPage)
            }
            onCloseNotebook={() => go({ section: 'about' })}
            links={data.links}
            media={data.media}
            section={sceneDestination.section}
            slug={destination.slug}
            readingSurface={readingSurface}
            projectPage={0}
            projectScreen={projectScreen}
            caseStudyScreen={caseStudyScreen}
            onOpenCaseStudies={(category) => {
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
            renderingSettings={renderingSettings}
            onRenderingReady={setRenderingObserver}
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
            onNotebookSurfaceReady={setNotebookSurface}
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
            {destination.section === 'contact'
              ? copy(s, 'Let’s connect.')
              : s[destination.section + 'Heading'] ||
                s[destination.section + 'Label']}
          </h1>
        )}
        {immersive &&
          readingSurface &&
          destination.section !== 'about' &&
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
              <ContactComputerWindow
                site={s}
                privacy={destination.section === 'privacy'}
                backHref={hrefFor({ section: 'contact', open: true })}
                initialSent={destination.sent}
                initialError={destination.error}
                submission={contactSubmission}
                onSubmissionChange={setContactSubmission}
                draft={contactDraft}
                onDraftChange={setContactDraft}
                onClose={() => go({ section: 'contact' })}
              />
            ),
            surface,
          )}
        {immersive &&
          notebookSurface &&
          createPortal(
            <AboutNotebook
              data={data}
              interactive={
                destination.section === 'about' &&
                readingSurface &&
                arrived &&
                !travel
              }
              section={notebookChapter}
              ready={data.journal.every(
                (_, index) =>
                  measuredNotebookCounts[notebookKey(index)] !== undefined,
              )}
              page={notebookPage}
              pageCounts={notebookCounts}
              onSectionChange={(section) => openNotebookSection(section)}
              onPageChange={(page) =>
                openNotebookSection(notebookChapter, page)
              }
              onPageCount={notebookPageCount}
              onClose={() => go({ section: 'about' })}
            />,
            notebookSurface,
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
              <span>{s[destination.section + 'Label'] || s.homeLabel}</span>
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
              renderingSettings={renderingSettings}
              renderingObserver={renderingObserver}
              onRenderingChange={setRenderingSettings}
            />
          )}
          <button
            className="flight-view-toggle"
            type="button"
            onClick={() => {
              const url = new URL(location.href);
              if (reading) {
                url.searchParams.delete('view');
                if (url.hash === '#room-reader') url.hash = '';
              } else url.searchParams.set('view', 'reading');
              window.history.replaceState(window.history.state, '', url);
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
    </div>
  );
}
