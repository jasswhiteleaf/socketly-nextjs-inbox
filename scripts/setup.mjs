import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
try {
  const template = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  await writeFile(
    new URL('../.env.local', import.meta.url),
    template.replace(
      'BETTER_AUTH_SECRET=\n',
      `BETTER_AUTH_SECRET=${randomBytes(48).toString('base64url')}\n`,
    ),
    { flag: 'wx', mode: 0o600 },
  );
  console.log(
    'Created .env.local with a private session secret. Add your Socketly keys before starting.',
  );
} catch (error) {
  if (error.code === 'EEXIST')
    console.log('.env.local already exists; preserved without changes.');
  else {
    console.error('Could not create .env.local. Check file permissions.');
    process.exitCode = 1;
  }
}
