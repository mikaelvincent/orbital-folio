import { startShadingComparison } from './shading-comparison-lab';
import { createContactBakeSession } from './contact-surface-bake';

startShadingComparison({
  id: 'contact', title: 'Contact shading · surface-bake lab',
  labels: { A: 'Delivered live GTAO', B: 'Baked static surfaces', C: 'Bake with live contact zones' },
  description: 'A keeps delivered GTAO. B bakes static Projects surfaces while other surfaces retain live shading. C also keeps live contact shading around doors and the reader. These are developer candidates, not portfolio settings.',
  createSession: createContactBakeSession, compactFallback: true,
  limitations: [
    'B loses moving contacts onto baked surfaces; C restores bounded live zones but may show zone seams or missing contacts outside them.',
    'Screen-space GTAO and surface AO are different images; pixel differences need artistic review, not an exactness claim.',
  ],
});
