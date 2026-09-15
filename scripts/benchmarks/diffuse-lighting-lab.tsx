import { startShadingComparison } from './shading-comparison-lab';
import { createDiffuseProbeSession } from './diffuse-probe-session';

startShadingComparison({
  id: 'diffuse', title: 'Diffuse lighting · baked probe lab',
  labels: { A: 'Delivered lighting', B: 'Baked shared irradiance', C: 'Baked diffuse only; live specular energy' },
  description: 'A keeps delivered lighting. B replaces the shared environment irradiance lookup with a small baked probe. C changes only diffuse lighting and retains the original specular calculation. Direct lights, reflections, GTAO and room feedback remain active. Developer candidates only.',
  createSession: createDiffuseProbeSession, baselineRooms: ['projects'],
  limitations: [
    'The probe approximates an already-filtered environment. It does not bake surface contacts, new bounce light or final material color.',
    'B also changes the irradiance used for multiple-scattering specular energy; C preserves that input but retains the PMREM lookup and adds arithmetic.',
    'No geometry, direct lights, shadows, GTAO, reflection-direction calculations, emission, color management or room feedback are removed.',
  ],
});
