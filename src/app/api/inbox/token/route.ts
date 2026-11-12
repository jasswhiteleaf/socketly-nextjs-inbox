import { failure, identity, sameOrigin } from '@/lib/access';
import { socketly } from '@/lib/socketly';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    // No body/query identity is accepted. The server owns tenant and recipient.
    const owner = await identity(request);
    const token = await socketly().createInboxToken(owner);
    return Response.json(token, {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Inbox-Identity': JSON.stringify([owner.tenantId, owner.recipientId]),
      },
    });
  } catch (error) {
    return failure(error);
  }
}
