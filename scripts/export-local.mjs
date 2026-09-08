import fs from 'node:fs';
const r = await fetch('http://localhost:3000/api/admin/export', {
  headers: { Cookie: '__sites_local_auth=1' },
});
if (!r.ok) throw new Error('Claim the local development studio first.');
const path = process.argv[2] || '/tmp/portfolio-content.json';
fs.writeFileSync(path, await r.text(), { mode: 0o600 });
console.log(
  'Content exported to ' +
    path +
    '. This uses the local development identity only.',
);
