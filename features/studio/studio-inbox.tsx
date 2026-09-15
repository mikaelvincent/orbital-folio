'use client';
import { ArrowUpRight, Radio, Trash2 } from 'lucide-react';

export function StudioInbox({
  inbox,
  setInbox,
  moreInbox,
  setMoreInbox,
  onDelete,
}: {
  inbox: any[];
  setInbox: (inbox: any[]) => void;
  moreInbox: boolean;
  setMoreInbox: (more: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="studio-panel">
      <h2>Incoming transmissions</h2>
      <button
        className="quiet-button"
        onClick={async () => {
          const r = await fetch('/api/admin/inbox');
          const b: any = await r.json();
          if (r.ok) {
            setInbox(b.inquiries);
            setMoreInbox(b.hasMore);
          }
        }}
      >
        Refresh inbox
      </button>
      <p>
        Messages are stored here. Email delivery is not configured. Reply using
        your own email application.
      </p>
      {!inbox.length && (
        <div className="studio-empty">
          <Radio size={36} />
          <h3>No transmissions yet</h3>
          <p>
            Interview invitations and project conversations will appear here.
          </p>
        </div>
      )}
      {inbox.map((i) => (
        <article className="inquiry" key={i.id}>
          <div>
            <span className="sample-badge">
              {i.intent === 'interview' ? 'Interview' : 'Project'}
            </span>
            <time>{new Date(i.created_at).toLocaleString()}</time>
          </div>
          <h3>{i.name}</h3>
          <a href={'mailto:' + i.email}>
            {i.email}
            <ArrowUpRight size={14} />
          </a>
          <p>{i.message}</p>
          <button
            className="quiet-button delete-button"
            onClick={() => onDelete(i.id)}
          >
            <Trash2 size={15} />
            Delete message
          </button>
        </article>
      ))}
      {moreInbox && (
        <button
          className="button"
          onClick={async () => {
            const r = await fetch('/api/admin/inbox?offset=' + inbox.length);
            const b: any = await r.json();
            if (r.ok) {
              setInbox([...inbox, ...b.inquiries]);
              setMoreInbox(b.hasMore);
            }
          }}
        >
          Load older messages
        </button>
      )}
    </section>
  );
}
