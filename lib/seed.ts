import { gridSamples } from './sample-projects.mjs';
// Initial fixtures only. Public rendering always reads persistent database records.
export const seedSite = {
  notFoundEyebrow: '404 / OFF COURSE',
  notFoundHeading: 'This page is outside the flight plan.',
  notFoundText: 'The page may have moved or is no longer published.',
  seoImageId: '',
  portraitMediaId: '',
  name: 'Mikael Vincent',
  initials: 'MV',
  domain: 'https://mikaelvincent.dev',
  title: 'Full-stack developer & systems thinker',
  headline: 'Good products.\nThoughtful engineering.',
  intro:
    'From the first interaction to the background job. Explore a small collection of product ideas, engineering decisions, and things learned along the way.',
  biography:
    'Sample biography — ready for the owner to rewrite. I enjoy turning complicated problems into products that feel simple. My interests sit where thoughtful interfaces meet dependable backend services.',
  availability: 'Open to the next good conversation',
  location: 'Location to be added',
  email: 'hello@example.com',
  brand: 'ORBITAL / PERSONAL PORTFOLIO',
  accent: '#ffb547',
  seoTitle: 'Mikael Vincent — Developer portfolio · Sample content',
  seoDescription:
    'Explore editable concept projects and sample case studies in an interactive spacecraft portfolio. Career and project details are demonstration content.',
  language: 'en',
  sampleMode: true,
  sampleNotice:
    'Demonstration content. Projects, experience, and personal copy are samples, not claims about the owner’s history.',
  homeLabel: 'Overview',
  projectsLabel: 'Projects',
  experienceLabel: 'Experience',
  aboutLabel: 'About',
  contactLabel: 'Contact',
  exploreLabel: 'Explore the ship',
  readLabel: 'Reading view',
  sceneLabel: 'Interactive view',
  inviteLabel: 'Let’s talk',
  projectCta: 'View case study',
  demoLabel: 'Open live project',
  codeLabel: 'View source',
  heroEyebrow: 'A SMALL SHIP. A WORLD OF POSSIBILITIES.',
  shipCaption: 'Choose a room. Discover what’s inside.',
  sceneLoading: 'Preparing your spacecraft…',
  sceneUnavailable:
    'Your reading view is ready. You can explore every section below.',
  sceneHelp: 'Choose a room to enter · Move the cursor to look closer',
  pauseLabel: 'Pause motion',
  resumeLabel: 'Resume motion',
  resetLabel: 'Reset view',
  projectsHeading: 'The payload rack',
  projectsIntro:
    'Useful products, examined closely. Open a locker to find the problem, the system, and the reasoning behind it.',
  experienceHeading: 'The mission log',
  experienceIntro:
    'A record of responsibilities, decisions, and lessons. These entries show the shape of a story; the real chapters are still to come.',
  aboutHeading: 'A little more human',
  aboutIntro:
    'Behind every system is a person asking questions. A few pages about how I think, work, and spend my time.',
  contactHeading: 'Good things start with a conversation.',
  contactIntro:
    'Have a role in mind or something worth building? Leave a message at the communications station.',
  projectsRoom: 'PAYLOAD BAY',
  experienceRoom: 'MISSION CONTROL',
  aboutRoom: 'CREW QUARTERS',
  contactRoom: 'COMMUNICATIONS',
  sampleLabel: 'SAMPLE / CONCEPT',
  featuredLabel: 'SELECTED PAYLOADS',
  allProjectsLabel: 'All projects',
  problemLabel: 'The problem',
  approachLabel: 'The approach',
  systemLabel: 'The system',
  decisionsLabel: 'Decisions & tradeoffs',
  outcomesLabel: 'Outcomes & lessons',
  nextLabel: 'What comes next',
  roleLabel: 'Role & context',
  periodLabel: 'Period',
  stackLabel: 'Built with',
  dossierLabel: 'PROJECT DOSSIER',
  backLabel: 'Back to projects',
  previousPageLabel: 'Previous page',
  nextPageLabel: 'Next page',
  closeReaderLabel: 'Return to room',
  backHomeLabel: 'Back to overview',
  emptyLabel: 'Nothing published here yet. Check back soon.',
  interviewLabel: 'Interview invitation',
  inquiryLabel: 'Project conversation',
  nameLabel: 'Your name',
  emailLabel: 'Email address',
  messageLabel: 'What do you have in mind?',
  sendLabel: 'Send transmission',
  sendingLabel: 'Sending…',
  sentHeading: 'Transmission received.',
  sentMessage:
    'Your message has been saved for the owner to read. Thank you for starting the conversation.',
  contactError: 'Please check your details and try again.',
  contactPrivacy:
    'Your name, email, and message are stored privately so the owner can respond. No marketing lists.',
  emailLabelCta: 'Prefer email?',
  sampleContact:
    'This is a sample portfolio. Messages reach this site’s private inbox; the sample email address is not monitored.',
  footerText: 'Built with curiosity. Designed for people.',
  studioLabel: 'Content studio',
  skipLabel: 'Skip to content',
  connectionLabel: 'CONNECTION OPEN',
  sectionLabel: 'ON BOARD',
  journalLabel: 'PERSONAL LOG',
  readAllLabel: 'Read all chapters',
  privacyLabel: 'Privacy',
  privacyText:
    'Contact submissions are stored in the owner’s private inbox until deleted by the owner. No analytics or advertising cookies are used. A session cookie is used only when accessing the content studio. Contact the published email address to request removal of a message.',
};
export const seeds: { id: string; kind: string; data: Record<string, any> }[] =
  [
    { id: 'site', kind: 'site', data: seedSite },
    {
      id: 'project-relay',
      kind: 'project',
      data: {
        slug: 'relay',
        title: 'Relay',
        subtitle: 'Background work, brought into focus.',
        summary:
          'A concept for a dependable job queue with clear retries, useful visibility, and a calmer operations experience.',
        category: 'BACKEND SERVICE',
        order: 0,
        sample: true,
        stack: 'TypeScript, PostgreSQL, Redis, Docker',
        role: 'Concept · system design & prototype',
        period: 'Sample project · 2026',
        problem:
          'A slow task should not become a slow interface. Teams also need to know when a background job failed, why it failed, and whether trying again is safe.',
        approach:
          'Accept the request quickly, record durable intent, and let an independent worker do the expensive work. Make the lifecycle visible from the beginning.',
        system:
          'API request → durable queue → worker → result\nAn idempotency key protects repeated requests. Workers acknowledge only after committing their result. Failed jobs enter a bounded retry schedule and eventually a review queue.',
        decisions:
          'At-least-once delivery is simpler to operate than promising exactly-once execution. That makes idempotency a deliberate part of the application design. A relational store provides a source of truth; the queue coordinates work.',
        outcomes:
          'Illustrative result: the design separates request latency from job duration and gives failures a place to be inspected. No production measurements or customer results are claimed.',
        next: 'Build a runnable prototype, test worker crashes and duplicate delivery, then measure queue latency under realistic load.',
        demoUrl: '',
        sourceUrl: '',
        mediaId: '',
        seoTitle: 'Relay — Sample job queue case study',
        seoDescription:
          'A clearly labeled concept study exploring durable background work, retries, and observability.',
      },
    },
    {
      id: 'project-fieldnotes',
      kind: 'project',
      data: {
        slug: 'fieldnotes',
        title: 'Fieldnotes',
        subtitle: 'A quieter home for team knowledge.',
        summary:
          'A full-stack knowledge workspace concept that makes publishing, finding, and maintaining useful notes feel natural.',
        category: 'FULL-STACK PRODUCT',
        order: 1,
        sample: true,
        stack: 'React, TypeScript, PostgreSQL',
        role: 'Concept · product & engineering',
        period: 'Sample project · 2026',
        problem:
          'Useful decisions disappear across chat messages and disconnected documents. Search alone cannot fix content that has no owner or structure.',
        approach:
          'Give every note a clear owner, revision history, and a place in a small shared library. Keep the writing flow quick, and make stale information visible.',
        system:
          'Editor → revision service → relational store → search index\nReaders always see the latest published revision. Authors work privately until a new version is ready.',
        decisions:
          'Use explicit publication rather than live collaborative editing for the first release. It reduces synchronization complexity and gives teams a predictable review boundary.',
        outcomes:
          'Illustrative result: a complete content lifecycle can be explained and tested before adding real-time collaboration. This is a sample concept, not a shipped client product.',
        next: 'Test the information architecture with a small team and validate whether revision ownership improves trust.',
        demoUrl: '',
        sourceUrl: '',
        mediaId: '',
        seoTitle: 'Fieldnotes — Sample full-stack product study',
        seoDescription:
          'A concept case study for a thoughtful team knowledge workspace.',
      },
    },
    {
      id: 'project-meter',
      kind: 'project',
      data: {
        slug: 'meter',
        title: 'Meter',
        subtitle: 'Know the cost before you ship.',
        summary:
          'An interactive estimation concept for comparing service usage and understanding the tradeoffs behind a monthly bill.',
        category: 'DEVELOPER TOOL',
        order: 2,
        sample: true,
        stack: 'TypeScript, Web APIs, SQLite',
        role: 'Concept · interface & modelling',
        period: 'Sample project · 2026',
        problem:
          'Usage-based pricing is hard to reason about when each service describes a different unit. Small assumptions can hide large differences.',
        approach:
          'Put the assumptions next to the result. Let users change workload inputs and inspect how each cost component responds.',
        system:
          'Workload inputs → versioned rate model → cost breakdown\nModel and currency dates stay visible. Saved scenarios preserve their original assumptions.',
        decisions:
          'Keep pricing data separate from calculation logic. Prefer transparent estimates with clear limitations over false precision.',
        outcomes:
          'Illustrative result: the model supports sensitivity analysis and a small set of meaningful comparisons. No current provider prices or financial promises are implied.',
        next: 'Connect verified pricing sources and publish an independent demo at a configured subdomain.',
        demoUrl: '',
        sourceUrl: '',
        mediaId: '',
        seoTitle: 'Meter — Sample developer tool study',
        seoDescription:
          'A concept for transparent service cost estimates and inspectable assumptions.',
      },
    },
    {
      id: 'experience-one',
      kind: 'experience',
      data: {
        slug: 'building-products',
        title: 'Building the whole product',
        organization: 'Example Product Studio',
        period: 'Sample chapter · 2024–present',
        role: 'Full-stack developer · sample role',
        summary: 'Connecting useful interfaces to dependable services.',
        context:
          'Sample entry: a small cross-functional team turning a complicated workflow into a focused web product. This is demonstration content, not employment history.',
        decisions:
          'Begin with the smallest complete user journey. Keep data contracts explicit, use accessible components, and ship changes that can be observed and rolled back.',
        impact:
          'Sample lessons: clear boundaries reduce coordination cost. A feature is only finished when people can use it and the team can support it.',
        order: 0,
        sample: true,
      },
    },
    {
      id: 'experience-two',
      kind: 'experience',
      data: {
        slug: 'reliable-systems',
        title: 'Making systems dependable',
        organization: 'Example Engineering Team',
        period: 'Sample chapter · 2022–2024',
        role: 'Backend engineer · sample role',
        summary: 'Looking beyond the happy path.',
        context:
          'Sample entry: improving APIs and asynchronous workflows where reliability mattered more than adding features quickly.',
        decisions:
          'Treat retries, timeouts, and partial failure as normal conditions. Add structured logs and define recovery steps before increasing traffic.',
        impact:
          'Sample lessons: the simplest system the team can operate is often the right starting point. No numerical or commercial results are claimed.',
        order: 1,
        sample: true,
      },
    },
    {
      id: 'experience-three',
      kind: 'experience',
      data: {
        slug: 'learning-by-building',
        title: 'Learning by building',
        organization: 'Independent exploration',
        period: 'Sample chapter · foundations',
        role: 'Developer · sample role',
        summary: 'Curiosity, small experiments, and better questions.',
        context:
          'Sample entry: exploring web foundations through small, complete projects and deliberate practice.',
        decisions:
          'Finish a narrow slice, explain its tradeoffs, and revisit the parts that were harder to understand than they needed to be.',
        impact:
          'Sample lessons: writing down decisions makes the next iteration better. Replace this entry with the owner’s actual experience.',
        order: 2,
        sample: true,
      },
    },
    {
      id: 'journal-story',
      kind: 'journal',
      data: {
        slug: 'my-story',
        title: 'My story',
        subtitle: 'Useful things, thoughtfully made.',
        body: 'Sample personal copy. I am interested in the space between a good idea and a product people can rely on. That means caring about the visible details and the less visible systems underneath.\n\nThis journal is a place for the owner’s real story. Replace these pages with the experiences, motivations, and perspective that make the work personal.',
        order: 0,
        sample: true,
      },
    },
    {
      id: 'journal-work',
      kind: 'journal',
      data: {
        slug: 'how-i-work',
        title: 'How I work',
        subtitle: 'Understand. Build. Learn.',
        body: '01 / Understand the constraint\nAsk what matters, who it matters to, and what a useful outcome would look like.\n\n02 / Build something useful\nChoose a small, complete path through the problem. Keep the parts easy to explain.\n\n03 / Measure, then improve\nWatch what happens, listen carefully, and let evidence shape the next decision.\n\nSample working principles, ready to personalize.',
        order: 1,
        sample: true,
      },
    },
    {
      id: 'journal-beyond',
      kind: 'journal',
      data: {
        slug: 'beyond-the-screen',
        title: 'Beyond the screen',
        subtitle: 'Room for a different perspective.',
        body: 'Sample personal copy. This page is for the things beyond work: interests, communities, books, side quests, and whatever brings a fresh perspective.\n\nNo hobbies or personal history are being attributed to the owner. Add the real details in the content studio.',
        order: 2,
        sample: true,
      },
    },
  ];

seeds.push(...gridSamples);
