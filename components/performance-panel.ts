type Experiment =
  | 'normal'
  | 'no-background'
  | 'no-ao'
  | 'half-resolution'
  | 'no-spacecraft'
  | 'render-once';

type SpacecraftFilter = { mode: 'all' | 'hide' | 'only'; id: string };
type SpacecraftGroup = { id: string; label: string; kind: 'room' | 'part' };

type PanelOptions = {
  collector: {
    snapshot: (includeFrames?: boolean) => any;
    reset: (reason?: string) => void;
  };
  getSettings: () => Record<string, unknown>;
  setExperiment: (experiment: Experiment) => void;
  getSpacecraftReport?: () => any;
  getSpacecraftGroups?: () => SpacecraftGroup[];
  setSpacecraftFilter?: (filter: SpacecraftFilter) => void;
  onClose?: () => void;
};

const experiments: Array<[Experiment, string]> = [
  ['normal', 'Normal rendering'],
  ['no-background', 'Skip background'],
  ['no-ao', 'Skip contact shading'],
  ['half-resolution', 'Half drawing resolution'],
  ['no-spacecraft', 'Skip spacecraft rendering'],
  ['render-once', 'Render one frame, then pause'],
];

const styles = `
.scene-perf{position:fixed;top:12px;left:12px;z-index:20000;width:min(365px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;border:1px solid #475569;border-radius:12px;background:#0b1420f5;color:#e5edf7;box-shadow:0 12px 38px #0007;font:12px/1.45 ui-sans-serif,system-ui,sans-serif;letter-spacing:normal;text-align:left;color-scheme:dark}
.scene-perf *{box-sizing:border-box}
.scene-perf header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;position:sticky;top:0;background:#0b1420;z-index:1;border-radius:12px 12px 0 0}
.scene-perf h2{font:600 13px/1.4 ui-sans-serif,system-ui,sans-serif;margin:0;color:#f3f7ff}
.scene-perf header h2{flex:1}
.scene-perf h3{font:600 12px/1.4 ui-sans-serif,system-ui,sans-serif;margin:16px 0 5px;color:#e5edf7}
.scene-perf p{margin:0 0 9px}
.scene-perf-body{padding:0 14px 14px}
.scene-perf [hidden]{display:none!important}
.scene-perf button,.scene-perf select,.scene-perf input{font:inherit;letter-spacing:normal;border:1px solid #475569;border-radius:6px;background:#182536;color:#e5edf7;padding:7px 9px;min-height:32px;max-width:100%;box-shadow:none}
.scene-perf button{cursor:pointer;text-transform:none;font-weight:500}
.scene-perf button:hover:not(:disabled){background:#263a50;border-color:#7da8c9}
.scene-perf button:disabled{opacity:.5;cursor:default}
.scene-perf :focus-visible{outline:2px solid #7dd3fc;outline-offset:2px}
.scene-perf header button{padding:2px 8px;min-width:32px;font-size:17px;line-height:24px}
.scene-perf label{display:block;margin:10px 0 4px;color:#cbd5e1;font-weight:500}
.scene-perf select,.scene-perf input{width:100%}
.scene-perf select{appearance:auto}
.scene-perf-actions{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0}
.scene-perf-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.scene-perf-primary{background:#12455b!important;border-color:#287a9e!important}
.scene-perf-muted{color:#a9bacd}
.scene-perf-status{font-variant-numeric:tabular-nums;min-height:18px;color:#c9e6f4}
.scene-perf-mode{padding:8px 9px;background:#172c25;border:1px solid #2c5948;border-radius:7px;margin-bottom:10px!important}
.scene-perf-mode[data-active=true]{background:#3a2b15;border-color:#846330;color:#ffe3a8}
.scene-perf-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0 7px}
.scene-perf-metric{border:1px solid #293c50;border-radius:7px;padding:8px}
.scene-perf-metric span{display:block;color:#a9bacd;font-size:10px}
.scene-perf-metric strong{display:block;font-size:17px;font-weight:600;font-variant-numeric:tabular-nums;color:#f3f7ff}
.scene-perf table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;margin:5px 0 8px;font-size:11px}
.scene-perf th,.scene-perf td{border-bottom:1px solid #263548;padding:5px 3px;text-align:right;font-weight:400;vertical-align:top}
.scene-perf th{color:#a9bacd;font-size:10px;font-weight:500}
.scene-perf th:first-child,.scene-perf td:first-child{text-align:left;overflow-wrap:anywhere;max-width:175px}
.scene-perf summary{cursor:pointer;color:#c9e6f4;margin:12px 0 6px}
.scene-perf ol{margin:6px 0 0;padding-left:18px;color:#a9bacd}
.scene-perf li{margin:3px 0;overflow-wrap:anywhere}
.scene-perf small{font-size:10px;line-height:1.5;display:block;color:#a9bacd}
`;

function textElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text: string,
  className?: string,
) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function number(value: unknown, digits = 1) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : '—';
}

function stat(value: any, key: 'mean' | 'p95', digits = 2) {
  if (!value || value.n === 0 || value.samples === 0 || value.count === 0)
    return '—';
  return number(value[key], digits);
}

function phaseName(name: string) {
  return name.replace(/[._-]+/g, ' ').replace(/^./, (s) => s.toUpperCase());
}

function table(headers: string[]) {
  const element = document.createElement('table');
  const row = element.createTHead().insertRow();
  for (const header of headers) {
    const cell = textElement('th', header);
    cell.scope = 'col';
    row.appendChild(cell);
  }
  const body = element.createTBody();
  return { element, body };
}

function fillRows(body: HTMLTableSectionElement, rows: string[][]) {
  const fragment = document.createDocumentFragment();
  for (const values of rows) {
    const row = document.createElement('tr');
    for (const value of values) row.appendChild(textElement('td', value));
    fragment.appendChild(row);
  }
  body.replaceChildren(fragment);
}

/** Local diagnostics; the host controls when profiling is enabled and mounted. */
export function mountPerformancePanel({
  collector,
  getSettings,
  setExperiment,
  getSpacecraftReport,
  getSpacecraftGroups,
  setSpacecraftFilter,
  onClose,
}: PanelOptions): () => void {
  const style = textElement('style', styles);
  document.head.appendChild(style);
  const panel = textElement('aside', '', 'scene-perf');
  panel.dataset.scenePerf = '';
  panel.setAttribute('aria-label', 'Scene performance diagnostics');
  const heading = document.createElement('header');
  const panelTitle = textElement('h2', 'Scene diagnostics');
  panelTitle.tabIndex = -1;
  heading.appendChild(panelTitle);
  const collapse = textElement('button', '−');
  collapse.type = 'button';
  collapse.setAttribute('aria-label', 'Collapse scene diagnostics');
  collapse.setAttribute('aria-expanded', 'true');
  heading.appendChild(collapse);
  const close = textElement('button', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close diagnostics');
  close.hidden = !onClose;
  heading.appendChild(close);
  const body = textElement('div', '', 'scene-perf-body');
  body.id = `scene-perf-${crypto.randomUUID()}`;
  collapse.setAttribute('aria-controls', body.id);
  panel.appendChild(heading);
  panel.appendChild(body);

  body.appendChild(
    textElement(
      'p',
      'Hold the same view, record a baseline, then try one change. Keep this panel collapsed during captures.',
      'scene-perf-muted',
    ),
  );
  const mode = textElement('p', '', 'scene-perf-mode');
  body.appendChild(mode);
  const experimentLabel = textElement('label', 'Temporary diagnostic');
  const experiment = document.createElement('select');
  experiment.id = `${body.id}-experiment`;
  experimentLabel.htmlFor = experiment.id;
  for (const [value, label] of experiments) {
    const option = textElement('option', label);
    option.value = value;
    experiment.appendChild(option);
  }
  body.appendChild(experimentLabel);
  body.appendChild(experiment);
  const restore = textElement('button', 'Restore normal');
  restore.type = 'button';
  const restoreRow = textElement('div', '', 'scene-perf-actions');
  restoreRow.appendChild(restore);
  body.appendChild(restoreRow);
  const settingsDetails = document.createElement('details');
  settingsDetails.appendChild(textElement('summary', 'Environment and scene'));
  const settingsTable = table(['Setting', 'Current value']);
  settingsDetails.appendChild(settingsTable.element);
  const browserLabel = textElement('small', '');
  settingsDetails.appendChild(browserLabel);
  body.appendChild(settingsDetails);

  const nameLabel = textElement('label', 'Capture name');
  const name = document.createElement('input');
  name.type = 'text';
  name.id = `${body.id}-name`;
  name.maxLength = 80;
  name.placeholder = 'For example: overview, pointer still';
  nameLabel.htmlFor = name.id;
  body.appendChild(nameLabel);
  body.appendChild(name);
  const actions = textElement('div', '', 'scene-perf-actions');
  const record = textElement(
    'button',
    'Record 10 seconds',
    'scene-perf-primary',
  );
  const cancel = textElement('button', 'Cancel');
  const download = textElement('button', 'Download JSON');
  const viewReport = textElement('button', 'View JSON');
  for (const button of [record, cancel, download, viewReport])
    button.type = 'button';
  cancel.hidden = true;
  for (const button of [record, cancel, download, viewReport])
    actions.appendChild(button);
  body.appendChild(actions);
  const reportText = document.createElement('textarea');
  reportText.setAttribute('aria-label', 'Performance report JSON');
  reportText.readOnly = true;
  reportText.wrap = 'off';
  reportText.hidden = true;
  reportText.rows = 7;
  reportText.style.cssText =
    'width:100%;resize:vertical;font:11px/1.4 monospace;background:#101d2d;color:#e5edf7;border:1px solid #475569;border-radius:6px';
  body.appendChild(reportText);
  const status = textElement(
    'p',
    'Ready · 3 second warmup before each capture.',
    'scene-perf-status',
  );
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  body.appendChild(status);

  const metrics = textElement('div', '', 'scene-perf-metrics');
  const metricValue = (label: string) => {
    const card = textElement('div', '', 'scene-perf-metric');
    card.appendChild(textElement('span', label));
    const value = textElement('strong', '—');
    card.appendChild(value);
    metrics.appendChild(card);
    return value;
  };
  const fps = metricValue('Rendered FPS');
  const cpu = metricValue('Mean CPU · ms');
  const interval = metricValue('p95 frame · ms');
  body.appendChild(metrics);
  const windowLabel = textElement('p', '', 'scene-perf-muted');
  body.appendChild(windowLabel);
  // Put the overview and actionable spacecraft attribution ahead of the tools.
  body.insertBefore(metrics, body.firstChild);
  body.insertBefore(windowLabel, metrics.nextSibling);
  const spacecraftSection = document.createElement('section');
  spacecraftSection.setAttribute('aria-label', 'Spacecraft workload');
  spacecraftSection.hidden = !getSpacecraftReport;
  spacecraftSection.appendChild(textElement('h3', 'Spacecraft workload'));
  spacecraftSection.appendChild(
    textElement(
      'small',
      'Actual draw calls and triangles per pass. Choose the workload to rank; counts are not GPU time.',
    ),
  );
  const labelledSelect = (
    parent: HTMLElement,
    label: string,
    suffix: string,
    options: Array<[string, string]>,
  ) => {
    const wrapper = document.createElement('div');
    const caption = textElement('label', label);
    const select = document.createElement('select');
    select.id = `${body.id}-${suffix}`;
    caption.htmlFor = select.id;
    for (const [value, text] of options) {
      const option = textElement('option', text);
      option.value = value;
      select.appendChild(option);
    }
    wrapper.appendChild(caption);
    wrapper.appendChild(select);
    parent.appendChild(wrapper);
    return select;
  };
  const breakdownControls = textElement('div', '', 'scene-perf-pair');
  spacecraftSection.appendChild(breakdownControls);
  const breakdown = labelledSelect(
    breakdownControls,
    'Breakdown',
    'breakdown',
    [
      ['parts', 'Parts'],
      ['rooms', 'Rooms'],
    ],
  );
  const renderPass = labelledSelect(
    breakdownControls,
    'Render pass',
    'render-pass',
    [['spacecraft', 'Main spacecraft']],
  );
  const rankBy = labelledSelect(breakdownControls, 'Rank by', 'rank-by', [
    ['drawsPerPass', 'Draw calls'],
    ['trianglesPerPass', 'Triangles'],
  ]);
  const spacecraftTable = table(['Group', 'Draw calls', 'Triangles']);
  spacecraftSection.appendChild(spacecraftTable.element);
  const workloadSummary = textElement('p', '', 'scene-perf-muted');
  spacecraftSection.appendChild(workloadSummary);
  const showGroups = textElement('button', 'Show all groups');
  showGroups.type = 'button';
  showGroups.setAttribute('aria-expanded', 'false');
  spacecraftSection.appendChild(showGroups);
  const filterControls = document.createElement('div');
  filterControls.hidden = !setSpacecraftFilter;
  const filterMode = labelledSelect(
    filterControls,
    'Spacecraft visibility',
    'spacecraft-visibility',
    [
      ['all', 'Show all groups'],
      ['hide', 'Hide selected group'],
      ['only', 'Show only selected group'],
    ],
  );
  const filterGroup = labelledSelect(
    filterControls,
    'Spacecraft group',
    'spacecraft-group',
    [],
  );
  spacecraftSection.appendChild(filterControls);
  spacecraftSection.appendChild(
    textElement(
      'small',
      'Record the full scene, hide one group, then record again at the same view and settings. Compare elapsed CPU and spacecraft GPU time in Saved captures; repeat the full scene to check the result.',
    ),
  );
  body.insertBefore(spacecraftSection, windowLabel.nextSibling);
  body.appendChild(textElement('h3', 'Largest CPU phases'));
  body.appendChild(
    textElement(
      'small',
      'Ranked by CPU time per rendered frame; p95 is per execution.',
    ),
  );
  const cpuTable = table(['Phase', 'ms/frame', 'p95 ms', 'Samples']);
  body.appendChild(cpuTable.element);
  body.appendChild(textElement('h3', 'GPU phases'));
  const gpuStatus = textElement('p', '', 'scene-perf-muted');
  const gpuTable = table(['Phase', 'Mean ms', 'p95 ms', 'Samples']);
  body.appendChild(gpuStatus);
  body.appendChild(gpuTable.element);

  const passDetails = document.createElement('details');
  passDetails.appendChild(
    textElement('summary', 'Draw calls and scene workload'),
  );
  const passTable = table(['Pass', 'Mean calls', 'Mean triangles']);
  const counterSummary = textElement('p', '', 'scene-perf-muted');
  passDetails.appendChild(passTable.element);
  passDetails.appendChild(counterSummary);
  body.appendChild(passDetails);
  const saved = document.createElement('details');
  const savedSummary = textElement('summary', 'Saved captures (0 of 6)');
  const savedList = document.createElement('ol');
  const captureTable = table([
    'Capture / filter',
    'FPS',
    'CPU ms',
    'Ship GPU ms',
  ]);
  saved.appendChild(savedSummary);
  saved.appendChild(captureTable.element);
  saved.appendChild(
    textElement(
      'small',
      'Means for each capture. Ship GPU is the whole spacecraft pass, not time attributed to an individual group. Compare matching views and render settings.',
    ),
  );
  saved.appendChild(savedList);
  body.appendChild(saved);
  body.appendChild(
    textElement(
      'small',
      'CPU measures JavaScript and render submission, not GPU time. Browser metrics do not measure temperature or power. Diagnostics add overhead. Compare normal → one change → normal at the same viewport and browser profile. Captures stay in this session until downloaded; closing diagnostics or reloading clears them.',
    ),
  );
  document.body.appendChild(panel);
  panelTitle.focus({ preventScroll: true });

  let destroyed = false;
  let sequence = 0;
  let capture:
    | {
        phase: 'warmup' | 'recording';
        label: string;
        experiment: Experiment;
        deadline: number;
        started: number;
        startedAt: string;
        settings: Record<string, unknown>;
        spacecraftFilter: SpacecraftFilter;
      }
    | undefined;
  let captureTimer: ReturnType<typeof setTimeout> | undefined;
  const captures: any[] = [];
  const urls = new Set<string>();
  const revokeTimers = new Set<ReturnType<typeof setTimeout>>();

  const currentExperiment = () => {
    const value = getSettings().experiment;
    return experiments.find(([key]) => key === value)?.[0] || 'normal';
  };
  let selectedExperiment = currentExperiment();
  let selectedFilter: SpacecraftFilter = { mode: 'all', id: '' };
  let groupChoices: SpacecraftGroup[] = [];
  let groupSignature = '';
  let passSignature = '';
  let showAllGroups = false;
  const filterKey = (value: SpacecraftFilter) => `${value.mode}:${value.id}`;
  const currentFilter = (): SpacecraftFilter => {
    const candidate = getSettings().spacecraftFilter;
    if (candidate && typeof candidate === 'object') {
      const value = candidate as Record<string, unknown>;
      if (value.mode === 'all') return { mode: 'all', id: '' };
      if (
        (value.mode === 'hide' || value.mode === 'only') &&
        typeof value.id === 'string'
      )
        return { mode: value.mode, id: value.id };
    }
    return { ...selectedFilter };
  };
  selectedFilter = currentFilter();

  function filterLabel(value: SpacecraftFilter, groups = groupChoices) {
    if (value.mode === 'all') return 'Full spacecraft';
    const label =
      groups.find((group) => group.id === value.id)?.label || value.id;
    return `${value.mode === 'hide' ? 'Hidden' : 'Only'}: ${label}`;
  }

  function updateCaptureControls() {
    record.disabled = !!capture || document.hidden;
    cancel.hidden = !capture;
    name.disabled = !!capture;
  }

  function cancelCapture(message: string) {
    if (captureTimer !== undefined) clearTimeout(captureTimer);
    captureTimer = undefined;
    capture = undefined;
    status.textContent = message;
    updateCaptureControls();
  }

  function changeExperiment(value: Experiment) {
    if (capture) cancelCapture('Capture cancelled: diagnostic changed.');
    setExperiment(value);
    selectedExperiment = currentExperiment();
    update();
  }

  function changeFilter(value: SpacecraftFilter) {
    if (!setSpacecraftFilter) return;
    if (capture) cancelCapture('Capture cancelled: spacecraft filter changed.');
    setSpacecraftFilter(value);
    selectedFilter = { ...value };
    update();
  }

  function updateSpacecraft(report: any) {
    if (!getSpacecraftReport) return;
    const groups = getSpacecraftGroups?.() || report?.groups || [];
    const signature = groups
      .map(
        (group: SpacecraftGroup) => `${group.kind}:${group.id}:${group.label}`,
      )
      .join('|');
    groupChoices = groups;
    if (signature !== groupSignature) {
      const previous = filterGroup.value;
      const options = document.createDocumentFragment();
      for (const kind of ['room', 'part'] as const) {
        const category = document.createElement('optgroup');
        category.label = kind === 'room' ? 'Rooms' : 'Parts';
        for (const group of groupChoices.filter((item) => item.kind === kind)) {
          const option = textElement('option', group.label);
          option.value = group.id;
          category.appendChild(option);
        }
        if (category.children.length) options.appendChild(category);
      }
      filterGroup.replaceChildren(options);
      if (groupChoices.some((group) => group.id === previous))
        filterGroup.value = previous;
      groupSignature = signature;
    }
    filterMode.value = selectedFilter.mode;
    if (selectedFilter.mode !== 'all') filterGroup.value = selectedFilter.id;
    filterMode.disabled = !groupChoices.length;
    filterGroup.disabled = !groupChoices.length;
    const passes = Object.keys(report?.passes || {});
    const nextPassSignature = passes.join('|');
    if (passes.length && nextPassSignature !== passSignature) {
      const previous = renderPass.value;
      renderPass.replaceChildren(
        ...passes.map((pass) => {
          const option = textElement(
            'option',
            pass === 'spacecraft'
              ? 'Main spacecraft'
              : pass === 'ao-refresh'
                ? 'Contact shading'
                : phaseName(pass),
          );
          option.value = pass;
          return option;
        }),
      );
      renderPass.value = passes.includes(previous)
        ? previous
        : passes.includes('spacecraft')
          ? 'spacecraft'
          : passes[0];
      passSignature = nextPassSignature;
    }
    const pass = report?.passes?.[renderPass.value];
    const rows = [...(pass?.[breakdown.value] || [])]
      .filter((row) => row.drawsPerPass > 0)
      .sort(
        (a, b) =>
          b[rankBy.value] - a[rankBy.value] ||
          b.drawsPerPass - a.drawsPerPass ||
          b.trianglesPerPass - a.trianglesPerPass,
      );
    fillRows(
      spacecraftTable.body,
      (showAllGroups ? rows : rows.slice(0, 8)).map((row) => [
        row.label,
        number(row.drawsPerPass, 1),
        number(row.trianglesPerPass, 0),
      ]),
    );
    showGroups.hidden = rows.length <= 8;
    const missing = pass?.unattributed;
    workloadSummary.textContent = pass?.samples
      ? `${number(pass.samples, 0)} pass samples · ${number(pass.total?.drawsPerPass, 1)} total calls / ${number(pass.total?.trianglesPerPass, 0)} triangles per pass.${missing === null ? ' Unattributed counts are unavailable for this pass.' : missing?.drawsPerPass > 0 ? ` Unattributed: ${number(missing.drawsPerPass, 1)} calls.` : ''}${!showAllGroups && rows.length > 8 ? ` Top 8 of ${rows.length} groups shown.` : ''}`
      : 'No draws recorded for this pass in the current window.';
  }

  function phaseRows(phases: Record<string, any> = {}, totalFrames?: number) {
    const samples = (value: any) => value.samples ?? value.n ?? value.count;
    const cost = (value: any) =>
      totalFrames ? (value.mean * samples(value)) / totalFrames : value.mean;
    return Object.entries(phases)
      .filter(([, value]) => value && Number.isFinite(cost(value)))
      .sort(([, a], [, b]) => cost(b) - cost(a))
      .map(([key, value]) => [
        phaseName(key),
        totalFrames ? number(cost(value), 2) : stat(value, 'mean'),
        stat(value, 'p95'),
        number(samples(value), 0),
      ]);
  }

  function cancelInvalidCapture(report: any) {
    if (!capture) return false;
    if (
      ['disposed', 'context-lost', 'contextlost'].includes(report.gpu?.status)
    ) {
      cancelCapture('Capture cancelled: the renderer became unavailable.');
      return true;
    }
    if (
      capture.phase === 'recording' &&
      report.resetReason !== 'capture started'
    ) {
      cancelCapture(
        `Capture cancelled: measurements restarted (${report.resetReason || 'unknown reason'}).`,
      );
      return true;
    }
    return false;
  }

  function update() {
    if (destroyed) return;
    const activeExperiment = currentExperiment();
    if (selectedExperiment !== activeExperiment) {
      if (capture) cancelCapture('Capture cancelled: diagnostic changed.');
      selectedExperiment = activeExperiment;
    }
    const activeFilter = currentFilter();
    if (filterKey(selectedFilter) !== filterKey(activeFilter)) {
      if (capture)
        cancelCapture('Capture cancelled: spacecraft filter changed.');
      selectedFilter = activeFilter;
    }
    if (capture) {
      const remaining = Math.max(
        0,
        Math.ceil((capture.deadline - performance.now()) / 1000),
      );
      status.textContent =
        capture.phase === 'warmup'
          ? `Warming up · recording starts in ${remaining}s.`
          : `Recording “${capture.label}” · ${remaining}s remaining.`;
    }
    updateCaptureControls();
    // Capture deadlines and visibility cancellation remain active while closed.
    // Defer snapshot aggregation and hidden table work until expansion or export.
    if (body.hidden || document.hidden) return;
    experiment.value = activeExperiment;
    const activeLabel = experiments.find(
      ([key]) => key === activeExperiment,
    )![1];
    mode.textContent =
      activeExperiment === 'normal' && selectedFilter.mode === 'all'
        ? 'Normal rendering · baseline'
        : `Diagnostic active: ${activeLabel.toLowerCase()} · ${filterLabel(selectedFilter)}. Restore normal when finished.`;
    mode.dataset.active = String(
      activeExperiment !== 'normal' || selectedFilter.mode !== 'all',
    );
    restore.disabled =
      activeExperiment === 'normal' && selectedFilter.mode === 'all';
    const report = collector.snapshot();
    cancelInvalidCapture(report);
    updateSpacecraft(getSpacecraftReport?.());
    const settings = getSettings();
    const dimensions = (value: unknown) =>
      Array.isArray(value) ? value.join(' × ') : '—';
    const settingLabel = (value: unknown) =>
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '—';
    fillRows(settingsTable.body, [
      [
        'Build / Three.js',
        `${settingLabel(settings.build)} / r${settingLabel(settings.threeRevision)}`,
      ],
      ['Viewport', dimensions(settings.viewport)],
      ['Drawing buffer', dimensions(settings.drawingBuffer)],
      [
        'DPR / device DPR',
        `${number(settings.pixelRatio, 2)} / ${number(settings.nativePixelRatio, 2)}`,
      ],
      [
        'Contact shading',
        settings.aoEnabled === undefined
          ? '—'
          : `${settings.aoEnabled ? 'On' : 'Off'} · ${dimensions(settings.aoBuffer)}`,
      ],
      ['Room', settingLabel(settings.room)],
    ]);
    browserLabel.textContent =
      typeof settings.userAgent === 'string' ? settings.userAgent : '';
    const frames = report.window?.frames || 0;
    fps.textContent = frames ? number(report.window?.renderedFps) : '—';
    cpu.textContent = frames ? stat(report.cpuTotal, 'mean') : '—';
    interval.textContent = frames ? stat(report.frameInterval, 'p95') : '—';
    windowLabel.textContent = frames
      ? `${number(frames, 0)} frames across ${number((report.window?.durationMs || 0) / 1000)} seconds.${activeExperiment === 'render-once' ? ' Rendering is paused; these are retained samples.' : ''}`
      : 'No frames in this measurement window.';
    fillRows(cpuTable.body, frames ? phaseRows(report.cpuPhases, frames) : []);
    const gpuRows = frames ? phaseRows(report.gpu?.phases) : [];
    fillRows(gpuTable.body, gpuRows);
    gpuTable.element.hidden = gpuRows.length === 0;
    const gpuState = String(report.gpu?.status || 'unavailable');
    gpuStatus.textContent = gpuRows.length
      ? `Time per sampled execution · ${gpuState} · ${number(report.gpu?.pending, 0)} pending. GPU means are not amortized across all frames.`
      : `GPU timing: ${gpuState}. No valid GPU samples; CPU time is not a substitute.`;
    fillRows(
      passTable.body,
      frames
        ? Object.entries(report.passes || {})
            .sort(
              ([, a]: any, [, b]: any) =>
                (b.calls?.mean || 0) - (a.calls?.mean || 0),
            )
            .map(([key, value]: any) => [
              phaseName(key),
              stat(value.calls, 'mean', 1),
              stat(value.triangles, 'mean', 0),
            ])
        : [],
    );
    counterSummary.textContent = Object.entries(report.counters || {})
      .filter(([, value]) => typeof value === 'number')
      .map(([key, value]) => `${phaseName(key)}: ${number(value, 0)}`)
      .join(' · ');
    updateCaptureControls();
  }

  function finishCapture() {
    if (!capture || destroyed) return;
    if (
      document.hidden ||
      currentExperiment() !== capture.experiment ||
      filterKey(currentFilter()) !== filterKey(capture.spacecraftFilter)
    ) {
      cancelCapture(
        'Capture cancelled: visibility, diagnostic or spacecraft filter changed.',
      );
      return;
    }
    const actualDurationMs = performance.now() - capture.started;
    const report = collector.snapshot(true);
    if (cancelInvalidCapture(report)) return;
    captures.push({
      name: capture.label,
      startedAt: capture.startedAt,
      completedAt: new Date().toISOString(),
      requestedDurationMs: 10_000,
      actualDurationMs,
      warmupMs: 3_000,
      settings: capture.settings,
      spacecraftFilter: capture.spacecraftFilter,
      spacecraft: getSpacecraftReport?.(),
      context: report.context,
      report,
    });
    if (captures.length > 6) captures.shift();
    const label = capture.label;
    cancelCapture(
      `Saved “${label}” · ${number(actualDurationMs / 1000)}s, ${number(report.window?.frames || 0, 0)} frames.`,
    );
    savedSummary.textContent = `Saved captures (${captures.length} of 6)`;
    fillRows(
      captureTable.body,
      captures.map((item) => [
        `${item.name} · ${filterLabel(item.spacecraftFilter, item.spacecraft?.groups || groupChoices)} · ${item.settings.experiment || 'normal'}`,
        item.report.window?.frames
          ? number(item.report.window.renderedFps)
          : '—',
        stat(item.report.cpuTotal, 'mean'),
        stat(item.report.gpu?.phases?.spacecraft, 'mean'),
      ]),
    );
    savedList.replaceChildren(
      ...captures.map((item) =>
        textElement(
          'li',
          `${item.name} · ${item.settings.experiment || 'normal'} · ${number(item.actualDurationMs / 1000)}s`,
        ),
      ),
    );
    update();
  }

  function startCapture() {
    if (capture || document.hidden) return;
    sequence += 1;
    capture = {
      phase: 'warmup',
      label: name.value.trim() || `Capture ${sequence}`,
      experiment: currentExperiment(),
      deadline: performance.now() + 3_000,
      started: 0,
      startedAt: '',
      settings: {},
      spacecraftFilter: currentFilter(),
    };
    captureTimer = setTimeout(() => {
      if (!capture || destroyed) return;
      if (
        document.hidden ||
        currentExperiment() !== capture.experiment ||
        filterKey(currentFilter()) !== filterKey(capture.spacecraftFilter)
      ) {
        cancelCapture(
          'Capture cancelled: visibility, diagnostic or spacecraft filter changed.',
        );
        return;
      }
      collector.reset('capture started');
      capture.phase = 'recording';
      capture.started = performance.now();
      capture.startedAt = new Date().toISOString();
      capture.settings = { ...getSettings() };
      capture.deadline = capture.started + 10_000;
      captureTimer = setTimeout(finishCapture, 10_000);
      update();
    }, 3_000);
    update();
  }

  function serializeReports(includeFrames = true) {
    const spacecraftReport = (report: any) =>
      includeFrames || !report ? report : { ...report, batches: undefined };
    return JSON.stringify(
      {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        rawFramesIncluded: includeFrames,
        captures: includeFrames
          ? captures
          : captures.map((capture) => ({
              ...capture,
              spacecraft: spacecraftReport(capture.spacecraft),
              report: { ...capture.report, frames: undefined },
            })),
        current: {
          settings: getSettings(),
          spacecraftFilter: currentFilter(),
          spacecraft: spacecraftReport(getSpacecraftReport?.()),
          report: collector.snapshot(includeFrames),
        },
        notes:
          'Local diagnostics; no temperature or power readings. Compare the same viewport and browser profile. Captures include instrumentation overhead.',
      },
      null,
      2,
    );
  }
  function exportReports() {
    const url = URL.createObjectURL(
      new Blob([serializeReports()], {
        type: 'application/json',
      }),
    );
    urls.add(url);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `orbital-performance-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      urls.delete(url);
      revokeTimers.delete(timer);
    }, 1_000);
    revokeTimers.add(timer);
    if (!capture)
      status.textContent = `Downloaded ${captures.length} saved capture${captures.length === 1 ? '' : 's'} and the current snapshot.`;
  }

  const stopEvent = (event: Event) => event.stopPropagation();
  const blockedEvents = [
    'pointerdown',
    'pointerup',
    'pointermove',
    'pointercancel',
    'mousedown',
    'mouseup',
    'mousemove',
    'click',
    'dblclick',
    'wheel',
    'touchstart',
    'touchmove',
    'touchend',
    'keydown',
    'keyup',
  ];
  for (const event of blockedEvents) panel.addEventListener(event, stopEvent);
  collapse.addEventListener('click', () => {
    body.hidden = !body.hidden;
    collapse.textContent = body.hidden ? '+' : '−';
    collapse.setAttribute('aria-expanded', String(!body.hidden));
    collapse.setAttribute(
      'aria-label',
      `${body.hidden ? 'Expand' : 'Collapse'} scene diagnostics`,
    );
    if (!body.hidden) update();
  });
  experiment.addEventListener('change', () =>
    changeExperiment(experiment.value as Experiment),
  );
  restore.addEventListener('click', () => {
    if (capture) cancelCapture('Capture cancelled: normal rendering restored.');
    setExperiment('normal');
    setSpacecraftFilter?.({ mode: 'all', id: '' });
    selectedExperiment = 'normal';
    selectedFilter = { mode: 'all', id: '' };
    update();
  });
  close.addEventListener('click', () => {
    if (capture) cancelCapture('Capture cancelled: diagnostics closed.');
    onClose?.();
  });
  breakdown.addEventListener('change', update);
  renderPass.addEventListener('change', update);
  rankBy.addEventListener('change', update);
  showGroups.addEventListener('click', () => {
    showAllGroups = !showAllGroups;
    showGroups.textContent = showAllGroups
      ? 'Show top 8 groups'
      : 'Show all groups';
    showGroups.setAttribute('aria-expanded', String(showAllGroups));
    update();
  });
  filterMode.addEventListener('change', () => {
    const mode = filterMode.value as SpacecraftFilter['mode'];
    if (mode === 'all' || filterGroup.value)
      changeFilter({ mode, id: mode === 'all' ? '' : filterGroup.value });
  });
  filterGroup.addEventListener('change', () => {
    if (filterMode.value !== 'all')
      changeFilter({
        mode: filterMode.value as 'hide' | 'only',
        id: filterGroup.value,
      });
  });
  record.addEventListener('click', startCapture);
  cancel.addEventListener('click', () => cancelCapture('Capture cancelled.'));
  download.addEventListener('click', exportReports);
  viewReport.addEventListener('click', () => {
    if (!reportText.hidden) {
      reportText.hidden = true;
      reportText.value = '';
      viewReport.textContent = 'View JSON';
      return;
    }
    // Keep the on-screen copy small; the download retains full raw samples.
    reportText.value = serializeReports(false);
    reportText.hidden = false;
    viewReport.textContent = 'Hide JSON';
    reportText.focus();
    reportText.select();
    if (!capture)
      status.textContent =
        'Summary ready. Copy the selected JSON; Download JSON includes raw frames and batch inventory.';
  });
  const visibilityChanged = () => {
    if (document.hidden && capture)
      cancelCapture(
        'Capture cancelled: page was hidden. Keep it visible for a complete recording.',
      );
    update();
  };
  document.addEventListener('visibilitychange', visibilityChanged);
  update();
  const refresh = setInterval(update, 1_000);

  return () => {
    destroyed = true;
    captures.length = 0;
    clearInterval(refresh);
    if (captureTimer !== undefined) clearTimeout(captureTimer);
    for (const timer of revokeTimers) clearTimeout(timer);
    for (const url of urls) URL.revokeObjectURL(url);
    document.removeEventListener('visibilitychange', visibilityChanged);
    for (const event of blockedEvents)
      panel.removeEventListener(event, stopEvent);
    panel.remove();
    style.remove();
  };
}
