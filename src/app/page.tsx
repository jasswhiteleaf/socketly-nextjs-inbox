import { headers } from 'next/headers';
import { getAuth } from '@/lib/runtime';
import { AccountForm, Dashboard } from './ui';
export const dynamic = 'force-dynamic';
export default async function Page() {
  let session, organizations;
  try {
    const auth = getAuth();
    const requestHeaders = await headers();
    session = await auth.api.getSession({ headers: requestHeaders });
    organizations = session
      ? await auth.api.listOrganizations({ headers: requestHeaders })
      : [];
  } catch {
    return (
      <main className="shell">
        <p className="eyebrow">SOCKETLY · NEXT.JS STARTER</p>
        <h1>Finish your local setup</h1>
        <p>
          Run <code>npm run setup</code>, configure your separate app database in{' '}
          <code>.env.local</code>, and run <code>npm run db:migrate</code>. See README.md
          for the complete steps.
        </p>
      </main>
    );
  }
  if (!session) return <AccountForm />;
  return (
    <Dashboard
      userId={session.user.id}
      userName={session.user.name}
      activeId={session.session.activeOrganizationId ?? null}
      organizations={organizations.map((org) => ({ id: org.id, name: org.name }))}
      configured={Boolean(
        process.env.SOCKETLY_SECRET && process.env.NEXT_PUBLIC_SOCKETLY_KEY,
      )}
    />
  );
}
