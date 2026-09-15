'use client';
import { useState } from 'react';
import { pathFor } from '@/lib/paths';
import { Radio, ArrowUpRight, Check, UserRound, Box } from 'lucide-react';
export type ContactSubmission = {
  status: 'idle' | 'sending' | 'sent';
  error: string;
};
export type ContactDraft = {
  name?: string;
  email?: string;
  message?: string;
  intent?: string;
};
export function ContactForm({
  site: s,
  initialSent = false,
  initialError = false,
  draft,
  onDraftChange,
  onSent,
  submission,
  onSubmissionChange,
}: {
  site: Record<string, any>;
  initialSent?: boolean;
  initialError?: boolean;
  submission?: ContactSubmission;
  onSubmissionChange?: (value: ContactSubmission) => void;
  draft?: ContactDraft;
  onDraftChange?: (draft: ContactDraft) => void;
  onSent?: () => void;
}) {
  const [localSubmission, setLocalSubmission] = useState<ContactSubmission>({
    status: 'idle',
    error: initialError ? s.contactError : '',
  });
  const current = submission || localSubmission;
  const status = initialSent ? 'sent' : current.status;
  const error = current.error || (initialError ? s.contactError : '');
  const updateSubmission = (value: ContactSubmission) => {
    setLocalSubmission(value);
    onSubmissionChange?.(value);
  };
  return (
    <div className="comms-screen">
      {status === 'sent' ? (
        <div className="contact-success" role="status">
          <span>
            <Check size={32} />
          </span>
          <h2>{s.sentHeading}</h2>
          <p>{s.sentMessage}</p>
          <a href={pathFor('/', s)} className="text-link">
            {s.backHomeLabel}
            <ArrowUpRight size={18} />
          </a>
        </div>
      ) : (
        <form
          action="/api/contact"
          method="post"
          onChange={(e) => {
            const values = new FormData(e.currentTarget);
            const textValue = (key: string, fallback = '') => {
              const value = values.get(key);
              return typeof value === 'string' ? value : fallback;
            };
            onDraftChange?.({
              name: textValue('name'),
              email: textValue('email'),
              message: textValue('message'),
              intent: textValue('intent', 'interview'),
            });
          }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (status === 'sending') return;
            const form = e.currentTarget;
            updateSubmission({ status: 'sending', error: '' });
            try {
              const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { Accept: 'application/json' },
                body: new FormData(form),
              });
              if (!response.ok) throw new Error(s.contactError);
              updateSubmission({ status: 'sent', error: '' });
              onSent?.();
            } catch {
              updateSubmission({ status: 'idle', error: s.contactError });
            }
          }}
        >
          <fieldset className="intent-field">
            <legend className="sr-only">{s.contactLabel}</legend>
            <label>
              <input
                type="radio"
                name="intent"
                value="interview"
                defaultChecked={!draft?.intent || draft.intent === 'interview'}
              />
              <span>
                <UserRound size={19} />
                {s.interviewLabel}
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="intent"
                value="project"
                defaultChecked={draft?.intent === 'project'}
              />
              <span>
                <Box size={19} />
                {s.inquiryLabel}
              </span>
            </label>
          </fieldset>
          <label className="form-field" htmlFor="contact-name">
            {s.nameLabel}
            <input
              name="name"
              id="contact-name"
              defaultValue={draft?.name}
              autoComplete="name"
              maxLength={120}
              required
            />
          </label>
          <label className="form-field" htmlFor="contact-email">
            {s.emailLabel}
            <input
              type="email"
              name="email"
              id="contact-email"
              defaultValue={draft?.email}
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <label className="form-field" htmlFor="contact-message">
            {s.messageLabel}
            <textarea
              name="message"
              id="contact-message"
              defaultValue={draft?.message}
              rows={5}
              minLength={10}
              maxLength={5000}
              required
              aria-describedby="contact-privacy"
            />
          </label>
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="website">
              Website
              <input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button amber send-button"
            disabled={status === 'sending'}
            type="submit"
          >
            {status === 'sending' ? s.sendingLabel : s.sendLabel}
            <Radio size={18} />
          </button>
          <p className="contact-privacy" id="contact-privacy">
            {s.contactPrivacy}{' '}
            <a href={pathFor('/privacy', s)}>{s.privacyLabel} ↗</a>
          </p>
        </form>
      )}
    </div>
  );
}
