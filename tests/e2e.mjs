import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium, request } from 'playwright';

const url = process.env.STARTER_TEST_URL ?? 'http://localhost:3000';
if (
  !['localhost', '127.0.0.1'].includes(new URL(url).hostname) &&
  process.env.ALLOW_STARTER_TEST !== 'true'
) {
  throw Error(
    'Use a dedicated local test app, or explicitly set ALLOW_STARTER_TEST=true for a disposable remote app.',
  );
}
const browser = await chromium.launch(
  process.env.STARTER_TEST_CHROME === 'true' ? { channel: 'chrome' } : {},
);
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const origin = { Origin: url };
const post = (api, path, data) => api.post(`${url}${path}`, { headers: origin, data });
const stamp = randomUUID();
try {
  const anonymous = await request.newContext();
  assert.equal((await post(anonymous, '/api/inbox/token')).status(), 401);
  await anonymous.dispose();
  await page.goto(url);
  await page.getByLabel('Name', { exact: true }).fill('Starter Tester');
  await page.getByLabel('Email', { exact: true }).fill(`starter-${stamp}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(`Starter-${randomUUID()}!`);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('heading', { name: 'Your workspace updates.' }).waitFor();
  assert.equal((await post(context.request, '/api/inbox/token')).status(), 403);
  await page.getByLabel('New workspace').fill('First workspace');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await page.getByText('Live updates connected', { exact: true }).waitFor();
  assert.match(
    await page.getByRole('combobox', { name: 'Workspace', exact: true }).innerText(),
    /First workspace/,
  );
  const tokenResponse = await post(context.request, '/api/inbox/token', {
    tenantId: 'forged',
    recipientId: 'forged',
  });
  assert.equal(tokenResponse.status(), 200);
  const verifiedIdentity = JSON.parse(tokenResponse.headers()['x-inbox-identity']);
  const firstWorkspace = verifiedIdentity[0];
  assert(firstWorkspace);
  assert.notEqual(verifiedIdentity[1], 'forged');
  assert.match(tokenResponse.headers()['cache-control'], /no-store/);
  assert.equal(
    (
      await context.request.post(`${url}/api/inbox/token`, {
        headers: { Origin: 'https://untrusted.example' },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await post(context.request, '/api/exports', {
        requestKey: randomUUID(),
        recipientId: 'forged',
      })
    ).status(),
    400,
  );
  await page.getByRole('button', { name: 'Create CSV export', exact: true }).click();
  const list = page.locator('.inbox-area > .socketly-inbox');
  await list
    .getByRole('heading', { name: 'Your export is ready', exact: true })
    .waitFor();
  const exports = await context.request
    .get(`${url}/api/exports`)
    .then((response) => response.json());
  assert.equal(exports.length, 1);
  const download = await context.request.get(`${url}/api/exports/${exports[0].id}`);
  assert.equal(download.status(), 200);
  assert.equal(await download.text(), 'export_id,created_at\r\n');
  const repeat = await post(context.request, '/api/exports', {
    requestKey: exports[0].request_key,
  });
  assert.equal(repeat.status(), 200);
  assert.equal((await repeat.json()).id, exports[0].id);
  await list.getByRole('button', { name: 'Mark read', exact: true }).click();
  await list.getByRole('button', { name: 'Unread (0)', exact: true }).waitFor();
  await page.reload();
  await list
    .getByRole('heading', { name: 'Your export is ready', exact: true })
    .waitFor();
  assert.equal(
    await list.getByRole('button', { name: 'Mark read', exact: true }).count(),
    0,
  );
  await page.getByRole('combobox', { name: 'Inbox theme', exact: true }).click();
  await page.getByRole('option', { name: 'Midnight', exact: true }).click();
  assert.equal(
    await page.locator('.inbox-area').getAttribute('data-socketly-appearance'),
    'dark',
  );
  await page
    .getByRole('button', { name: 'Notifications, 0 unread', exact: true })
    .click();
  await page.getByRole('dialog', { name: 'Notifications' }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog', { name: 'Notifications' }).count(), 0);
  await list.getByRole('button', { name: 'Archive', exact: true }).click();
  await list.getByText('No notifications yet.', { exact: true }).waitFor();
  await page.reload();
  await list.getByText('No notifications yet.', { exact: true }).waitFor();

  // A second authenticated account cannot switch to, download from, or receive the first's workspace.
  const other = await request.newContext();
  const signup = await post(other, '/api/auth/sign-up/email', {
    name: 'Other Tester',
    email: `other-${stamp}@example.test`,
    password: `Starter-${randomUUID()}!`,
  });
  assert.equal(signup.status(), 200);
  const organization = await post(other, '/api/auth/organization/create', {
    name: 'Other workspace',
    slug: `other-${stamp}`,
  }).then((r) => r.json());
  assert.equal(
    (
      await post(other, '/api/auth/organization/set-active', {
        organizationId: organization.id,
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await post(other, '/api/auth/organization/set-active', {
        organizationId: firstWorkspace,
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await post(other, '/api/auth/organization/set-active', {
        organizationId: organization.id,
      })
    ).status(),
    200,
  );
  assert.equal((await other.get(`${url}/api/exports/${exports[0].id}`)).status(), 404);
  const otherExport = await post(other, '/api/exports', { requestKey: randomUUID() });
  assert.equal(otherExport.status(), 200);
  await page.reload();
  await list.getByText('No notifications yet.', { exact: true }).waitFor();
  await other.dispose();

  await page.getByLabel('New workspace').fill('Second workspace');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await list.getByText('No notifications yet.', { exact: true }).waitFor();
  assert.match(
    await page.getByRole('combobox', { name: 'Workspace', exact: true }).innerText(),
    /Second workspace/,
  );
  assert.equal(
    (await context.request.get(`${url}/api/exports/${exports[0].id}`)).status(),
    404,
  );
  await page.getByRole('combobox', { name: 'Workspace', exact: true }).click();
  await page.getByRole('option', { name: 'First workspace', exact: true }).click();
  await list.getByText('No notifications yet.', { exact: true }).waitFor();
  assert.equal(
    (await context.request.get(`${url}/api/exports/${exports[0].id}`)).status(),
    200,
  );
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Create account', exact: true }).waitFor();
  assert.equal((await post(context.request, '/api/inbox/token')).status(), 401);
  assert.equal(await page.locator('.socketly-inbox').count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: real signup, sessions, membership, live notification, CSV, idempotency, read/archive persistence, themes, bell, user/workspace isolation, origin protection and sign-out.',
  );
} finally {
  await browser.close();
}
