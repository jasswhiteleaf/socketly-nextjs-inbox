import { randomUUID } from 'node:crypto';
import { failure, identity, sameOrigin } from '@/lib/access';
import { getDb } from '@/lib/runtime';
import { socketly } from '@/lib/socketly';
export const runtime = 'nodejs';
type ExportRow = {
  id: string;
  request_key: string;
  content: string;
  created_at: Date;
  notification_id: string | null;
};
export async function GET(request: Request) {
  try {
    const { tenantId, recipientId } = await identity(request);
    const result = await getDb().query(
      'SELECT id, request_key, created_at, notification_id FROM starter_exports WHERE tenant_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 20',
      [tenantId, recipientId],
    );
    return Response.json(result.rows);
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const owner = await identity(request);
    const body = await request.json().catch(() => null);
    const key = body?.requestKey;
    if (
      typeof key !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key,
      ) ||
      Object.keys(body).some((name) => name !== 'requestKey')
    ) {
      return Response.json({ error: 'Send a UUID requestKey only.' }, { status: 400 });
    }
    const db = getDb();
    const client = await db.connect();
    let row: ExportRow;
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        JSON.stringify(owner),
      ]);
      const previous = await client.query<ExportRow>(
        'SELECT * FROM starter_exports WHERE tenant_id=$1 AND user_id=$2 AND request_key=$3',
        [owner.tenantId, owner.recipientId, key],
      );
      if (previous.rows[0]) row = previous.rows[0];
      else {
        const recent = await client.query(
          "SELECT count(*)::int AS n FROM starter_exports WHERE tenant_id=$1 AND user_id=$2 AND created_at > now()-interval '1 minute'",
          [owner.tenantId, owner.recipientId],
        );
        if (recent.rows[0].n >= 10)
          throw Response.json(
            { error: 'Try another export in a minute.' },
            { status: 429 },
          );
        const history = await client.query(
          'SELECT id, created_at FROM starter_exports WHERE tenant_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 100',
          [owner.tenantId, owner.recipientId],
        );
        const id = randomUUID();
        // A real CSV of this user's export history, generated and committed before notify.
        const content =
          'export_id,created_at\r\n' +
          history.rows
            .map((item) => `${item.id},${item.created_at.toISOString()}\r\n`)
            .join('');
        const inserted = await client.query<ExportRow>(
          'INSERT INTO starter_exports(id,tenant_id,user_id,request_key,content) VALUES($1,$2,$3,$4,$5) RETURNING *',
          [id, owner.tenantId, owner.recipientId, key, content],
        );
        row = inserted.rows[0];
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    if (!row.notification_id) {
      // Do not retry beyond the service's 24-hour idempotency window.
      if (Date.now() - row.created_at.getTime() >= 23 * 60 * 60 * 1000)
        return Response.json(
          {
            error: 'Export saved. This notification needs manual reconciliation.',
            id: row.id,
          },
          { status: 409 },
        );
      try {
        const result = await socketly().notify(
          {
            ...owner,
            title: 'Your export is ready',
            body: 'Download your workspace export history as a CSV.',
            category: 'Exports',
            link: `/api/exports/${row.id}`,
          },
          { idempotencyKey: `starter-export:${row.id}` },
        );
        await db.query(
          'UPDATE starter_exports SET notification_id=$1, notified_at=now() WHERE id=$2 AND tenant_id=$3 AND user_id=$4',
          [result.notification.id, row.id, owner.tenantId, owner.recipientId],
        );
      } catch {
        return Response.json({ id: row.id, notificationPending: true }, { status: 202 });
      }
    }
    return Response.json({ id: row.id, notificationPending: false });
  } catch (error) {
    return failure(error);
  }
}
