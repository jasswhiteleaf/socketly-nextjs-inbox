import 'server-only';
import { getAuth, appOrigin } from './runtime';

export function sameOrigin(request: Request) {
  if (
    request.headers.get('origin') !== appOrigin() ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    throw Response.json(
      { error: 'Use this app to perform this action.' },
      { status: 403 },
    );
  }
}
export async function identity(request: Request) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw Response.json({ error: 'Sign in to continue.' }, { status: 401 });
  const tenantId = session.session.activeOrganizationId;
  if (!tenantId)
    throw Response.json(
      { error: 'Create or select a workspace first.' },
      { status: 403 },
    );
  // A session's active ID alone is insufficient: membership can have been revoked.
  const member = await auth.api
    .getActiveMember({ headers: request.headers })
    .catch(() => null);
  if (
    !member ||
    member.userId !== session.user.id ||
    member.organizationId !== tenantId
  ) {
    throw Response.json(
      { error: 'Workspace access is no longer available.' },
      { status: 403 },
    );
  }
  return { tenantId, recipientId: session.user.id };
}
export function failure(error: unknown) {
  return error instanceof Response
    ? error
    : Response.json(
        {
          error:
            'The service is unavailable. Check your server configuration and try again.',
        },
        { status: 503 },
      );
}
