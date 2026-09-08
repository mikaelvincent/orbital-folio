import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
if (!fs.existsSync('.dev.vars')) {
  fs.writeFileSync(
    '.dev.vars',
    `ADMIN_SETUP_KEY=${crypto.randomBytes(32).toString('hex')}\nRATE_LIMIT_SALT=${crypto.randomBytes(32).toString('hex')}\n`,
    { mode: 0o600 },
  );
}
execFileSync(
  'npx',
  [
    'wrangler',
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--config',
    'wrangler.local.json',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_LOG_PATH: '.wrangler/logs',
    },
  },
);
console.log(
  'Database ready. Sample content is inserted once on first visit. Start with npm run dev, then visit /admin and sign in. Use ADMIN_SETUP_KEY from .dev.vars to claim the local studio.',
);
