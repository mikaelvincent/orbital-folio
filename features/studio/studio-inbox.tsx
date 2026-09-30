'use client';
import { useState } from 'react';
import { ArrowUpRight, Inbox, Trash2, RefreshCw } from 'lucide-react';
import {
  inquiryReplyHref,
  inquiryCursor,
  type Inquiry,
  type InquiryAction,
} from '@/lib/content/inquiries';

export function StudioInbox({
  inbox,
  setInbox,
  moreInbox,
  setMoreInbox,
  onDelete,
}: {
  inbox: Inquiry[];
  setInbox: (inbox: Inquiry[]) => void;
  moreInbox: boolean;
  setMoreInbox: (more: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState('inbox');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const update = async (item: Inquiry, action: InquiryAction) => {
    if (busy) return;
    setBusy(item.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, action }),
      });
      const result = (await response.json()) as {
        inquiry: Inquiry;
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || 'Could not update this message.');
      setInbox(inbox.map((row) => (row.id === item.id ? result.inquiry : row)));
      setNotice('Message status updated.');
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not update this message.',
      );
    } finally {
      setBusy('');
    }
  };
  const load = async (older = false) => {
    if (busy) return;
    setBusy('load');
    setError('');
    setNotice('');
    try {
      const last = inbox.at(-1);
      const response = await fetch(
        '/api/admin/inbox' +
          (older && last
            ? `?before=${encodeURIComponent(inquiryCursor(last))}`
            : ''),
      );
      const result = (await response.json()) as {
        inquiries: Inquiry[];
        hasMore: boolean;
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || 'Could not load messages.');
      setInbox(
        older
          ? [
              ...inbox,
              ...result.inquiries.filter(
                (row) => !inbox.some((existing) => existing.id === row.id),
              ),
            ]
          : result.inquiries,
      );
      setMoreInbox(result.hasMore);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Could not load messages.',
      );
    } finally {
      setBusy('');
    }
  };
  const visible = inbox.filter(
    (item) =>
      filter === 'all' ||
      (filter === 'archived'
        ? item.archived_at
        : !item.archived_at &&
          (filter === 'unread'
            ? !item.read_at
            : filter === 'replied'
              ? !!item.replied_at
              : true)),
  );
  return (
    <section className="studio-panel studio-inbox">
      <div className="studio-panel-header">
        <div>
          <h2>Messages</h2>
          <p>Reply in your email app, then mark the message replied here.</p>
        </div>
        <button
          className="quiet-button"
          disabled={!!busy}
          onClick={() => void load()}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <div className="inbox-filters" aria-label="Filter messages">
        {[
          ['inbox', 'Inbox'],
          ['unread', 'Unread'],
          ['replied', 'Replied'],
          ['archived', 'Archived'],
          ['all', 'All messages'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="editor-hint">
          {notice}
        </p>
      )}
      {!visible.length && (
        <div className="studio-empty">
          <Inbox size={32} />
          <h3>
            No {filter === 'inbox' || filter === 'all' ? '' : filter} messages
          </h3>
          <p>
            {moreInbox
              ? 'Load older messages to check the rest of the inbox.'
              : 'Contact form messages will appear here.'}
          </p>
        </div>
      )}
      {visible.map((item) => (
        <article className="inquiry" key={item.id} data-unread={!item.read_at}>
          <div className="inquiry-meta">
            <span className="sample-badge">
              {item.intent === 'interview' ? 'Interview' : 'Project'}
            </span>
            <span>
              {item.read_at ? 'Read' : 'Unread'}
              {item.replied_at ? ' · Replied' : ''}
              {item.archived_at ? ' · Archived' : ''}
            </span>
            <time dateTime={item.created_at}>
              {new Date(item.created_at).toLocaleString()}
            </time>
          </div>
          <h3>{item.name}</h3>
          <p className="inquiry-email">{item.email}</p>
          <details>
            <summary>Read message</summary>
            <p className="inquiry-body">{item.message}</p>
          </details>
          <div className="inquiry-actions">
            <a className="button amber" href={inquiryReplyHref(item)}>
              Reply by email
              <ArrowUpRight size={15} />
            </a>
            <button
              className="quiet-button"
              disabled={!!busy}
              onClick={() =>
                void update(item, item.read_at ? 'unread' : 'read')
              }
            >
              Mark {item.read_at ? 'unread' : 'read'}
            </button>
            <button
              className="quiet-button"
              disabled={!!busy}
              onClick={() =>
                void update(item, item.replied_at ? 'unreplied' : 'replied')
              }
            >
              Mark {item.replied_at ? 'not replied' : 'replied'}
            </button>
            <button
              className="quiet-button"
              disabled={!!busy}
              onClick={() =>
                void update(item, item.archived_at ? 'unarchive' : 'archive')
              }
            >
              {item.archived_at ? 'Move to inbox' : 'Archive'}
            </button>
            <button
              className="quiet-button delete-button"
              disabled={!!busy}
              onClick={() => onDelete(item.id)}
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </article>
      ))}
      {moreInbox && (
        <button
          className="button"
          disabled={!!busy}
          onClick={() => void load(true)}
        >
          {busy === 'load' ? 'Loading…' : 'Load older messages'}
        </button>
      )}
    </section>
  );
}
