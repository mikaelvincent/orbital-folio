import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
import { adminIdentity } from '@/lib/security';
import { getRecords, database } from '@/lib/content/repository';
import { AdminStudio, SetupForm } from '@/features/studio/admin-studio';
import { StudioEntry } from '@/features/studio/studio-entry';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Content studio',
  robots: { index: false, follow: false },
};
export default async function Admin() {
  const user = await getChatGPTUser();
  if (!user) return <StudioEntry signIn={chatGPTSignInPath('/admin')} />;
  const allowed = await adminIdentity();
  if (!allowed) {
    const claimed = await database()
      .prepare('SELECT id FROM admins LIMIT 1')
      .first();
    return (
      <StudioEntry
        email={user.email}
        setup={claimed ? undefined : <SetupForm />}
      />
    );
  }

  const [records, inbox, admins, audit] = await Promise.all([
    getRecords(),
    database()
      .prepare(
        'SELECT * FROM inquiries ORDER BY created_at DESC, id DESC LIMIT 100',
      )
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
