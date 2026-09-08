import { TextBlocks } from './portfolio-parts';
import type { Portfolio } from '@/lib/content-types';
export function PrivacyView({ data }: { data: Portfolio }) {
  return (
    <article className="privacy-page">
      <h1>{data.site.privacyLabel}</h1>
      <TextBlocks text={data.site.privacyText} />
      <a href={'mailto:' + data.site.email}>{data.site.email}</a>
    </article>
  );
}
