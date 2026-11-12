import { Pool } from 'pg';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { organization } from 'better-auth/plugins';

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.local before starting.`);
  return value;
}
export function appOrigin() {
  const url = new URL(required('BETTER_AUTH_URL'));
  if (
    process.env.NODE_ENV === 'production' &&
    url.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(url.hostname)
  ) {
    throw new Error('BETTER_AUTH_URL must use HTTPS in production.');
  }
  return url.origin;
}
let pool: Pool | undefined;
export function getDb() {
  // Explicit connectionString: never put a connection URL into PGDATABASE.
  return (pool ??= new Pool({
    connectionString: required('DATABASE_URL'),
    max: 5,
    connectionTimeoutMillis: 5000,
  }));
}
export function authOptions() {
  const secret = required('BETTER_AUTH_SECRET');
  if (secret.length < 32)
    throw new Error('Generate a session secret of at least 32 characters.');
  return {
    appName: 'Socketly Inbox Starter',
    baseURL: appOrigin(),
    secret,
    database: getDb(),
    trustedOrigins: [appOrigin()],
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    session: { expiresIn: 60 * 60 * 24 * 7 },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 100 },
    plugins: [organization({ organizationLimit: 5 })],
  } satisfies BetterAuthOptions;
}
function createAuth() {
  return betterAuth(authOptions());
}
let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (auth ??= createAuth());
}
