'use client';
import { useSearchParams } from 'next/navigation';
import type { Portfolio } from '@/lib/content/types';
import { ImmersivePortfolio } from './immersive-portfolio';
import { requestedPortfolioView, resolvePortfolioView } from './view-policy';
export function PublicShell({
  data,
  active,
  children,
  preview = false,
  projectSlug,
  caseStudySlug,
  notebookSlug,
}: {
  data: Portfolio;
  active: string;
  children: React.ReactNode;
  preview?: boolean;
  projectSlug?: string;
  caseStudySlug?: string;
  notebookSlug?: string;
}) {
  const searchParams = useSearchParams();
  const requestedView = requestedPortfolioView(searchParams);
  return (
    <ImmersivePortfolio
      data={data}
      initialSection={active}
      initialSlug={notebookSlug || caseStudySlug || projectSlug}
      initialReading={
        resolvePortfolioView({ requested: requestedView, section: active }) ===
        'reading'
      }
      automaticView={!requestedView}
      preview={preview}
    >
      {children}
    </ImmersivePortfolio>
  );
}
