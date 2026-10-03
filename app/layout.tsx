import { DevAudit } from '@/features/diagnostics/dev-audit';
import { getPortfolio } from '@/lib/content/repository';
import { searchMetadata } from '@/lib/content/search-metadata';
import './globals.css';
export async function generateMetadata() {
  const { site } = await getPortfolio();
  const { title, description } = searchMetadata(site, 'home');
  return {
    title,
    description,
    icons: { icon: '/icon.svg' },
    metadataBase: new URL(site.domain),
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { site } = await getPortfolio();
  return (
    <html lang={site.language}>
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && <DevAudit />}
      </body>
    </html>
  );
}
