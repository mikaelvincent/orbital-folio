import { DevAudit } from '@/components/dev-audit';
import { getPortfolio } from '@/lib/content';
import './globals.css';
export async function generateMetadata() {
  const { site } = await getPortfolio();
  return {
    title: site.seoTitle,
    description: site.seoDescription,
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
