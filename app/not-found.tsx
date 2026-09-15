import { getPortfolio } from '@/lib/content/repository';
export default async function NotFound() {
  const { site: s } = await getPortfolio();
  return (
    <main className="not-found">
      <p className="eyebrow">{s.notFoundEyebrow}</p>
      <h1>{s.notFoundHeading}</h1>
      <p>{s.notFoundText}</p>
      <a className="button amber" href="/">
        {s.backHomeLabel}
      </a>
    </main>
  );
}
