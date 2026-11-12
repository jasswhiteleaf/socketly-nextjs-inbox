import 'server-only';
import { SocketlyServer } from '@socketly/server';
export function socketly() {
  const secret = process.env.SOCKETLY_SECRET;
  if (!secret) throw new Error('Configure SOCKETLY_SECRET on the server.');
  return new SocketlyServer({
    secret,
    url: process.env.SOCKETLY_URL ?? 'https://api.socketly.co',
  });
}
