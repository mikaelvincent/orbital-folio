import type { Portfolio } from '@/lib/content/types';
import { ImmersivePortfolio } from './immersive-portfolio';
export * from './portfolio-parts';
export function PublicShell({
  data,
  active,
  children,
  preview = false,
  projectSlug,
  caseStudySlug,
}: {
  data: Portfolio;
  active: string;
  children: React.ReactNode;
  preview?: boolean;
  projectSlug?: string;
  caseStudySlug?: string;
}) {
  return (
    <ImmersivePortfolio
      data={data}
      initialSection={active}
      initialSlug={caseStudySlug || projectSlug}
      preview={preview}
    >
      {children}
    </ImmersivePortfolio>
  );
}
