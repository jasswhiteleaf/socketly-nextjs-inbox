'use client';
import { useEffect, useState } from 'react';
import {
  InboxProvider,
  InboxTheme,
  NotificationBell,
  NotificationInbox,
  type InboxThemeTokens,
} from '@socketly/react-ui';
import { useInbox } from '@socketly/react/inbox';
import { authClient } from '@/lib/auth-client';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function announce() {
  const channel = new BroadcastChannel('starter-auth');
  channel.postMessage('changed');
  channel.close();
}
export function AccountForm() {
  const [signup, setSignup] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <main className="shell narrow">
      <p className="eyebrow">SOCKETLY · NEXT.JS STARTER</p>
      <h1>{signup ? 'Make room for your updates.' : 'Welcome back.'}</h1>
      <p>Sign in to your own workspace and notification inbox.</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          const values = new FormData(event.currentTarget);
          try {
            const credentials = {
              email: String(values.get('email')),
              password: String(values.get('password')),
            };
            const result = signup
              ? await authClient.signUp.email({
                  ...credentials,
                  name: String(values.get('name')),
                })
              : await authClient.signIn.email(credentials);
            if (result.error) throw Error(result.error.message || 'Could not sign in.');
            announce();
            window.location.assign('/');
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Could not sign in.');
            setBusy(false);
          }
        }}
      >
        {signup && (
          <Label>
            Name
            <Input name="name" required maxLength={100} autoComplete="name" />
          </Label>
        )}
        <Label>
          Email
          <Input name="email" type="email" required autoComplete="email" />
        </Label>
        <Label>
          Password
          <Input
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete={signup ? 'new-password' : 'current-password'}
          />
        </Label>
        <p className="hint">Use at least 12 characters.</p>
        {error && <p role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
        </Button>
      </form>
      <Button
        variant="link"
        disabled={busy}
        onClick={() => {
          setSignup(!signup);
          setError('');
        }}
      >
        {signup ? 'Already have an account? Sign in' : 'Create an account'}
      </Button>
      <p className="hint">
        Starter auth uses your app database. Your Socketly dashboard login is separate.
      </p>
    </main>
  );
}
const themes: Record<string, { appearance: 'light' | 'dark'; tokens: InboxThemeTokens }> =
  {
    studio: {
      appearance: 'light',
      tokens: { fontFamily: 'var(--app-font)', accent: '#4338ca', radius: '16px' },
    },
    midnight: {
      appearance: 'dark',
      tokens: {
        fontFamily: 'var(--app-font)',
        background: '#17152b',
        foreground: '#f4f0ff',
        border: '#494160',
        mutedForeground: '#c4bdd6',
        unreadBackground: '#29213e',
        unreadForeground: '#f4f0ff',
        selectedBackground: '#40345d',
        selectedForeground: '#f4f0ff',
        buttonForeground: '#f4f0ff',
        buttonHoverBackground: '#40345d',
        radius: '16px',
      },
    },
    editorial: {
      appearance: 'light',
      tokens: {
        fontFamily: 'Georgia, serif',
        background: '#fffaf2',
        foreground: '#38271b',
        border: '#d8bfa5',
        unreadBackground: '#fcf0df',
        unreadForeground: '#38271b',
        selectedBackground: '#f5e7d4',
        selectedForeground: '#38271b',
        buttonForeground: '#38271b',
        radius: '6px',
      },
    },
  };
export function Dashboard({
  userId,
  userName,
  activeId,
  organizations,
  configured,
}: {
  userId: string;
  userName: string;
  activeId: string | null;
  organizations: { id: string; name: string }[];
  configured: boolean;
}) {
  const [transition, setTransition] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const channel = new BroadcastChannel('starter-auth');
    channel.onmessage = () => {
      setTransition(true);
      window.location.reload();
    };
    // Revalidate session/membership on return to this tab; don't retain another identity's store.
    const focus = () => {
      setTransition(true);
      window.location.reload();
    };
    window.addEventListener('focus', focus);
    return () => {
      channel.close();
      window.removeEventListener('focus', focus);
    };
  }, []);
  async function change(action: () => Promise<{ error?: { message?: string } | null }>) {
    setTransition(true);
    setError('');
    try {
      const result = await action();
      if (result.error)
        throw Error(result.error.message || 'Could not change workspace.');
      announce();
      window.location.assign('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Try again.');
      setTransition(false);
    }
  }
  const active = organizations.find((org) => org.id === activeId);
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SOCKETLY · NEXT.JS STARTER</p>
          <h1>Your workspace updates.</h1>
          <p>Signed in as {userName}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => void change(() => authClient.signOut())}
          disabled={transition}
        >
          Sign out
        </Button>
      </header>
      <section className="workspace" aria-label="Workspace settings">
        <div className="control-field">
          <Label htmlFor="workspace-switch">Workspace</Label>
          <Select
            value={active?.id ?? null}
            disabled={transition}
            items={organizations.map((org) => ({ value: org.id, label: org.name }))}
            onValueChange={(value) => {
              if (value)
                void change(() =>
                  authClient.organization.setActive({ organizationId: value }),
                );
            }}
          >
            <SelectTrigger id="workspace-switch">
              <SelectValue placeholder="Select a workspace" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const name = String(
              new FormData(event.currentTarget).get('workspace'),
            ).trim();
            if (name)
              void change(() =>
                authClient.organization.create({
                  name,
                  slug: `workspace-${crypto.randomUUID()}`,
                }),
              );
          }}
        >
          <Label>
            New workspace
            <Input
              name="workspace"
              required
              maxLength={80}
              placeholder="Acme"
              disabled={transition}
            />
          </Label>
          <Button type="submit" variant="outline" disabled={transition}>
            Create workspace
          </Button>
        </form>
      </section>
      {error && <p role="alert">{error}</p>}
      {transition ? (
        <p role="status">Updating your session…</p>
      ) : !active ? (
        <p>Create or select a workspace to load its inbox.</p>
      ) : !configured ? (
        <Card variant="outline" className="p-7">
          <h2>Connect your Socketly app</h2>
          <p>
            Add your public key and server secret to .env.local, enable the app’s Inbox
            setting, and allow this browser origin. Restart the app after changing
            environment values.
          </p>
        </Card>
      ) : (
        <Notifications
          key={JSON.stringify([activeId, userId])}
          identityKey={JSON.stringify([activeId, userId])}
        />
      )}
    </main>
  );
}
function Notifications({ identityKey }: { identityKey: string }) {
  return (
    <InboxProvider
      publicKey={process.env.NEXT_PUBLIC_SOCKETLY_KEY!}
      url={process.env.NEXT_PUBLIC_SOCKETLY_URL}
      identityKey={identityKey}
      getToken={async () => {
        const response = await fetch('/api/inbox/token', { method: 'POST' });
        if (!response.ok || response.headers.get('x-inbox-identity') !== identityKey)
          throw Error('Your session or workspace changed. Reload this page.');
        return response.json();
      }}
    >
      <Contents />
    </InboxProvider>
  );
}
function Contents() {
  const [theme, setTheme] = useState('studio'),
    [sending, setSending] = useState(false),
    [message, setMessage] = useState(''),
    [requestKey, setRequestKey] = useState<string | null>(null);
  const [exports, setExports] = useState<
    { id: string; request_key: string; notification_id: string | null }[]
  >([]);
  const { connection, status } = useInbox();
  async function loadExports() {
    const response = await fetch('/api/exports');
    if (response.ok) setExports(await response.json());
  }
  useEffect(() => {
    void loadExports();
  }, []);
  async function createExport(retryKey?: string) {
    const key = retryKey ?? requestKey ?? crypto.randomUUID();
    setRequestKey(key);
    setSending(true);
    setMessage('');
    try {
      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestKey: key }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Could not create the export.');
      if (result.notificationPending)
        setMessage(
          'Export saved. Notification delivery failed. Retry notification to send the same export safely.',
        );
      else {
        setRequestKey(null);
        setMessage('Export saved and notification sent. Open it from your inbox.');
      }
      await loadExports();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <Card variant="outline" className="p-7">
        <p className="eyebrow">A COMPLETE SERVER → INBOX FLOW</p>
        <h2>Export your activity</h2>
        <p>
          Generate a real CSV of your export history. The server saves it first, then
          notifies only your user in this workspace.
        </p>
        <Button disabled={sending} onClick={() => void createExport()}>
          {sending
            ? 'Saving export…'
            : requestKey
              ? 'Retry notification'
              : 'Create CSV export'}
        </Button>
        <p role="status">{message}</p>
        {exports.length > 0 && (
          <ul className="exports">
            {exports.map((item) => (
              <li key={item.id}>
                <a href={`/api/exports/${item.id}`}>
                  Download export {item.id.slice(0, 8)}
                </a>{' '}
                ·{' '}
                {item.notification_id ? (
                  'Notification sent'
                ) : (
                  <Button
                    variant="outline"
                    disabled={sending}
                    onClick={() => void createExport(item.request_key)}
                  >
                    Retry saved notification
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="inbox-toolbar">
        <div className="control-field">
          <Label htmlFor="starter-inbox-theme">Inbox theme</Label>
          <Select
            value={theme}
            onValueChange={(value) => {
              if (value) setTheme(value);
            }}
            items={[
              { value: 'studio', label: 'Studio' },
              { value: 'midnight', label: 'Midnight' },
              { value: 'editorial', label: 'Editorial' },
            ]}
          >
            <SelectTrigger id="starter-inbox-theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="midnight">Midnight</SelectItem>
              <SelectItem value="editorial">Editorial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="hint" role="status">
          {status === 'ready' && connection === 'live'
            ? 'Live updates connected'
            : 'Connecting to your saved inbox…'}
        </p>
      </div>
      <InboxTheme
        appearance={themes[theme].appearance}
        theme={themes[theme].tokens}
        className="inbox-area"
      >
        <div className="bell-row">
          <NotificationBell />
        </div>
        <NotificationInbox />
      </InboxTheme>
    </>
  );
}
