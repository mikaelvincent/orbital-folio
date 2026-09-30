import { TextBlocks } from './portfolio-parts';
import type { Portfolio } from '@/lib/content/types';
import { ArrowLeft } from 'lucide-react';
import { interfaceText as copy } from '@/lib/content/interface-text';
import { destinationHref } from '@/features/spacecraft/navigation/flight';
import './privacy-view.css';

export function PrivacyView({
  data,
  backHref = destinationHref(
    { section: 'contact', open: true },
    data.site,
    true,
  ),
}: {
  data: Pick<Portfolio, 'site'>;
  backHref?: string;
}) {
  return (
    <article className="privacy-page">
      <a className="privacy-back" href={backHref}>
        <ArrowLeft size={16} aria-hidden="true" />
        {copy(data.site, 'Back to form')}
      </a>
      <h1 tabIndex={-1}>{data.site.privacyLabel}</h1>
      <TextBlocks text={data.site.privacyText} />
      <a href={'mailto:' + data.site.email}>{data.site.email}</a>
    </article>
  );
}
