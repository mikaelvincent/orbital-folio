import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
import { adminIdentity } from '@/lib/security';
import { getRecords, database } from '@/lib/content';
import { AdminStudio, SetupForm } from '@/components/admin-studio';
import { Orbit, ArrowUpRight } from 'lucide-react';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Content studio',
  robots: { index: false, follow: false },
};
export default async function Admin() {
  const user = await getChatGPTUser();
  if (!user)
    return (
      <main id="main" className="login-page">
        <Orbit size={38} />
        <p className="eyebrow">ORBITAL / CONTENT STUDIO</p>
        <h1>
          Your portfolio.
          <br />
          Under your control.
        </h1>
        <p>
          Sign in to manage content, review messages, and make this spacecraft
          your own.
        </p>
        <a
          className="button amber"
          href={chatGPTSignInPath('/admin')}
          target="_top"
        >
          Sign in with ChatGPT
          <ArrowUpRight size={17} />
        </a>
        <a className="back-link" href="/">
          Back to portfolio
        </a>
      </main>
    );
  const allowed = await adminIdentity();
  if (!allowed) {
    const claimed = await database()
      .prepare('SELECT id FROM admins LIMIT 1')
      .first();
    return (
      <main id="main" className="login-page">
        <Orbit size={38} />
        <h1>{claimed ? 'Owner access required' : 'Welcome, first owner.'}</h1>
        <p>Signed in as {user.email}.</p>
        {claimed ? (
          <p>
            Ask an existing owner to add your email in Access & portability.
          </p>
        ) : (
          <SetupForm />
        )}
        <a className="back-link" href="/signout-with-chatgpt?return_to=/admin">
          Sign out
        </a>
      </main>
    );
  }
  const [records, inbox, admins, audit] = await Promise.all([
    getRecords(),
    database()
      .prepare('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 100')
      .all(),
    database().prepare('SELECT * FROM admins ORDER BY created_at').all(),
    database()
      .prepare('SELECT * FROM audit ORDER BY created_at DESC LIMIT 50')
      .all(),
  ]);
  return (
    <AdminStudio
      initialRecords={records}
      inquiries={inbox.results}
      admins={admins.results}
      audit={audit.results}
      email={user.email}
    />
  );
}
