import { getMigrations } from 'better-auth/db/migration';
import { authOptions, getDb } from '../src/lib/runtime';

let db: ReturnType<typeof getDb> | undefined;
try {
  db = getDb();
  const { rows } = await db.query(
    "select to_regclass('public.apps') as apps, to_regclass('public.api_keys') as keys, to_regclass('public.product_events') as events",
  );
  if (Object.values(rows[0]).some(Boolean))
    throw new Error(
      'Refusing a Socketly service database. Use a separate database for this starter.',
    );
  const { runMigrations } = await getMigrations(authOptions());
  await runMigrations();
  await db.query(`CREATE TABLE IF NOT EXISTS starter_exports (
    id uuid PRIMARY KEY, tenant_id text NOT NULL, user_id text NOT NULL,
    request_key uuid NOT NULL, content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    notification_id text, notified_at timestamptz,
    UNIQUE(tenant_id, user_id, request_key)
  )`);
  await db.query(
    'CREATE INDEX IF NOT EXISTS starter_exports_owner ON starter_exports(tenant_id, user_id, created_at DESC)',
  );
  console.log('Starter auth, workspaces and export tables are ready.');
} catch {
  // Driver errors may include connection details. Keep diagnostics credential-free.
  console.error(
    'Migration stopped. Check the separate starter database, connection, and auth settings. No connection values are printed.',
  );
  process.exitCode = 1;
} finally {
  await db?.end();
}
