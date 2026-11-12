import { failure, identity } from '@/lib/access';
import { getDb } from '@/lib/runtime';
export const runtime = 'nodejs';
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const owner = await identity(request);
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });
    const result = await getDb().query(
      'SELECT content FROM starter_exports WHERE id=$1 AND tenant_id=$2 AND user_id=$3',
      [id, owner.tenantId, owner.recipientId],
    );
    if (!result.rows[0]) return new Response('Not found', { status: 404 });
    return new Response(result.rows[0].content, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="export-${id}.csv"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
