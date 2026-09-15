import { getRecords } from '@/lib/content/repository';
import { requireAdmin, apiError } from '@/lib/security';
export async function GET() {
  try {
    await requireAdmin();
    return new Response(
      JSON.stringify(
        {
          format: 'orbital-folio/v1',
          exportedAt: new Date().toISOString(),
          records: await getRecords(),
        },
        null,
        2,
      ),
      {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition':
            'attachment; filename="portfolio-content.json"',
          'Cache-Control': 'private, no-store',
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
