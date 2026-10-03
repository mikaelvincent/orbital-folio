'use client';
import { useSearchParams } from 'next/navigation';
import type { Portfolio } from '@/lib/content/types';
import { ImmersivePortfolio } from './immersive-portfolio';
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
  return (
    <ImmersivePortfolio
      data={data}
      initialSection={active}
      initialSlug={notebookSlug || caseStudySlug || projectSlug}
      initialReading={searchParams.get('view') === 'reading'}
      preview={preview}
    >
      {children}
    </ImmersivePortfolio>
  );
}
