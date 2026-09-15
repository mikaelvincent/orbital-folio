'use client';
import { Download, Upload } from 'lucide-react';

export function StudioAccess({
  busy,
  setError,
  act,
  members,
  setMembers,
  email,
  audit,
}: {
  busy: boolean;
  setError: (error: string) => void;
  act: (payload: any) => Promise<any>;
  members: any[];
  setMembers: (members: any[]) => void;
  email: string;
  audit: any[];
}) {
  return (
    <div className="settings-grid">
      <section className="studio-panel">
        <h2>Take your content with you</h2>
        <p>
          Export all drafts and published snapshots as portable JSON.
          Credentials, access lists, and private messages are excluded. Uploaded
          image files are backed up separately from object storage.
        </p>
        <a className="button" href="/api/admin/export">
          <Download size={16} />
          Export content
        </a>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const file = (
              e.currentTarget.elements.namedItem(
                'importFile',
              ) as HTMLInputElement
            ).files?.[0];
            if (!file) return;
            if (file.size > 2000000) {
              setError('Use a content export under 2 MB.');
              return;
            }
            try {
              const payload = JSON.parse(await file.text());
              await act({ action: 'import', payload });
            } catch {
              setError('This is not valid JSON.');
            }
          }}
        >
          <label className="studio-field">
            Restore content as drafts
            <input
              type="file"
              name="importFile"
              accept="application/json,.json"
              required
            />
          </label>
          <button className="button" disabled={busy}>
            <Upload size={16} />
            Import drafts
          </button>
        </form>
        <p className="editor-hint">
          Import updates matching records without changing live snapshots.
          Review and publish the imported drafts individually.
        </p>
      </section>
      <section className="studio-panel">
        <h2>Owner access</h2>
        <p>
          Only listed, signed-in ChatGPT identities may access this studio.
          Share access only with people who should manage all content and
          private inquiries.
        </p>
        <ul className="admin-list">
          {members.map((m) => (
            <li key={m.id}>
              <span>{m.email}</span>
              {m.email !== email.toLowerCase() && (
                <button
                  className="quiet-button"
                  onClick={async () => {
                    const r = await act({
                      action: 'revokeAdmin',
                      id: m.id,
                    });
                    if (r) setMembers(members.filter((a) => a.id !== m.id));
                  }}
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const entry = new FormData(form).get('email');
            const newEmail = typeof entry === 'string' ? entry : '';
            const r = await act({
              action: 'addAdmin',
              email: newEmail,
            });
            if (r) {
              setMembers([
                ...members,
                {
                  id: 'email-' + newEmail.toLowerCase(),
                  email: newEmail.toLowerCase(),
                },
              ]);
              form.reset();
            }
          }}
        >
          <label className="studio-field">
            Another owner’s ChatGPT email
            <input name="email" type="email" required />
          </label>
          <button className="button" disabled={busy}>
            Grant owner access
          </button>
        </form>
      </section>
      <section className="studio-panel audit-panel">
        <h2>Recent activity</h2>
        <p>Recorded server actions. Reload the studio to refresh this list.</p>
        <div className="audit-list">
          {audit.map((a) => (
            <div key={a.id}>
              <time>{new Date(a.created_at).toLocaleString()}</time>
              <strong>{a.action}</strong>
              <span>{a.target}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
