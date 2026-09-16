'use client';
import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  Mail,
  Send,
  X,
} from 'lucide-react';
import { pathFor } from '@/lib/paths';
import { copyContactEmail } from './contact-clipboard';
import {
  CONTACT_MESSAGE_LIMIT,
  contactInboxMessage,
  submitContactDraft,
  validateContactDraft,
  type ContactDraft,
  type ContactMode,
  type ContactSubmission,
} from './contact-flow';
import './contact-form.css';
export type { ContactDraft, ContactSubmission } from './contact-flow';

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
  const id = useId();
  const [ready, setReady] = useState(false);
  const [localDraft, setLocalDraft] = useState<ContactDraft>({});
  const [localSubmission, setLocalSubmission] = useState<ContactSubmission>({
    status: 'idle',
    error: '',
  });
  const [initialNoticeDismissed, setInitialNoticeDismissed] = useState(false);
  const [emailOpen, setEmailOpen] = useState(true);
  const [copyNotice, setCopyNotice] = useState('');
  const emailToggle = useRef<HTMLButtonElement>(null);
  const emailDismiss = useRef<HTMLButtonElement>(null);
  const errorNotice = useRef<HTMLParagraphElement>(null);
  const values = draft ?? localDraft;
  const latestDraft = useRef(values);
  latestDraft.current = values;
  const mode = values.mode ?? (initialSent ? 'message' : undefined);
  const current = submission ?? localSubmission;
  const status =
    initialSent && !initialNoticeDismissed && mode === 'message'
      ? 'sent'
      : !current.mode || current.mode === mode
        ? current.status
        : 'idle';
  const error =
    (!current.mode || current.mode === mode ? current.error : '') ||
    (initialError && !initialNoticeDismissed
      ? 'Your message could not be saved. Please try again.'
      : '');
  const updateDraft = (patch: Partial<ContactDraft>) => {
    // Autofill and rapid input events can arrive before the parent has rendered
    // its controlled draft. Compose against pending edits, not stale props.
    const next = {
      ...latestDraft.current,
      mode: latestDraft.current.mode ?? mode,
      ...patch,
    };
    latestDraft.current = next;
    setLocalDraft(next);
    onDraftChange?.(next);
  };
  const updateSubmission = (value: ContactSubmission) => {
    setLocalSubmission(value);
    onSubmissionChange?.(value);
  };
  // No native submission fallback: the call preview must remain inert before
  // hydration, and the working message path requires its compatibility adapter.
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (ready && error)
      errorNotice.current?.scrollIntoView({ block: 'nearest' });
  }, [ready, error]);
  // Resolve on the client to avoid server/device time-zone hydration differences.
  useEffect(() => {
    if (values.timeZone) return;
    let timeZone = 'UTC';
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      /* UTC remains explicit. */
    }
    updateDraft({ timeZone });
  }, [values.timeZone]); // eslint-disable-line react-hooks/exhaustive-deps
  const chooseMode = (next: ContactMode) => {
    if (!ready || status === 'sending') return;
    setInitialNoticeDismissed(true);
    updateDraft({ mode: next });
    updateSubmission({ status: 'idle', error: '', mode: next });
  };
  const beginAgain = () => {
    setInitialNoticeDismissed(true);
    updateSubmission({ status: 'idle', error: '', mode });
  };
  const email = typeof s.email === 'string' ? s.email : '';
  const characters = contactInboxMessage(values).length;
  const field = (
    name: keyof ContactDraft,
    label: string,
    props: {
      type?: string;
      autoComplete?: string;
      maxLength?: number;
      required?: boolean;
    } = {},
  ) => (
    <label className="contact-app-field" htmlFor={`${id}-${name}`}>
      <span>
        {label}
        {!props.required && <small>Optional</small>}
      </span>
      <input
        {...props}
        name={name}
        id={`${id}-${name}`}
        value={values[name] ?? ''}
        onChange={(event) => updateDraft({ [name]: event.target.value })}
      />
    </label>
  );
  return (
    <div className="contact-app" data-contact-mode={mode ?? 'choose'}>
      <div className="contact-app-toolbar">
        <div>
          <p className="contact-app-eyebrow">OPEN A CONVERSATION</p>
          <h2>Let’s connect.</h2>
        </div>
        {!emailOpen && email && (
          <button
            className="contact-email-reopen"
            type="button"
            disabled={!ready}
            ref={emailToggle}
            onClick={() => {
              setEmailOpen(true);
              requestAnimationFrame(() => emailDismiss.current?.focus());
            }}
            aria-expanded="false"
          >
            <Mail size={15} /> Prefer email?
          </button>
        )}
        {emailOpen && email && (
          <aside className="contact-email-callout" aria-label="Prefer email?">
            <div className="contact-email-callout-top">
              <span>
                <Mail size={14} /> Prefer email?
              </span>
              <button
                type="button"
                disabled={!ready}
                ref={emailDismiss}
                aria-label="Dismiss email alternative"
                onClick={() => {
                  setEmailOpen(false);
                  setCopyNotice('');
                  requestAnimationFrame(() => emailToggle.current?.focus());
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="contact-email-callout-actions">
              <a href={`mailto:${email}`}>{email}</a>
              <button
                type="button"
                disabled={!ready}
                aria-label="Copy email address"
                onClick={async () => {
                  const copied = await copyContactEmail(email);
                  setCopyNotice(
                    copied
                      ? 'Email address copied.'
                      : 'Copy unavailable. Select the address to copy it.',
                  );
                }}
              >
                <Copy size={14} />
              </button>
            </div>
            {copyNotice && <p role="status">{copyNotice}</p>}
          </aside>
        )}
      </div>
      <fieldset
        className="contact-app-options"
        disabled={!ready || status === 'sending'}
      >
        <legend className="sr-only">How would you like to get in touch?</legend>
        {(
          [
            ['call', 'Schedule a call', CalendarDays],
            ['message', 'Send a message', Mail],
          ] as const
        ).map(([value, label, Icon]) => (
          <label key={value}>
            <input
              type="radio"
              name={`${id}-mode`}
              value={value}
              checked={mode === value}
              onChange={() => chooseMode(value)}
            />
            <span>
              <Icon size={18} />
              {label}
            </span>
          </label>
        ))}
      </fieldset>
      {mode && (
        <div className="contact-app-context" id={`${id}-context`}>
          <p>
            {mode === 'call'
              ? 'Choose your preferred time to talk.'
              : 'Your message goes to my private inbox.'}
          </p>
        </div>
      )}
      <noscript>
        <p className="contact-app-context">
          These forms need JavaScript and cannot submit without it.
          {email && (
            <>
              {' '}
              You can still <a href={`mailto:${email}`}>email me directly</a>.
            </>
          )}
        </p>
      </noscript>
      {!mode ? null : status === 'sent' || status === 'demo' ? (
        <div className="contact-app-result" role="status">
          <Check size={28} />
          <h3>
            {status === 'demo' ? 'Preview complete.' : 'Message received.'}
          </h3>
          <p>
            {status === 'demo'
              ? 'Nothing was sent or saved, and no call was booked. You can still edit the details or use email to get in touch.'
              : 'Your message was saved to my private inbox. Thank you for getting in touch.'}
          </p>
          <button type="button" disabled={!ready} onClick={beginAgain}>
            {status === 'demo' ? 'Edit request' : 'Back to form'}
            <ArrowUpRight size={16} />
          </button>
        </div>
      ) : (
        <form
          className="contact-app-form"
          aria-describedby={`${id}-context`}
          onSubmit={async (event) => {
            event.preventDefault();
            if (!ready || !mode || status === 'sending') return;
            const formData = new FormData(event.currentTarget);
            const submitted = { ...latestDraft.current, mode };
            // Some browsers autofill without an input event. The mounted form
            // is authoritative at submission, including native date/time fields.
            for (const key of [
              'name',
              'company',
              'email',
              'subject',
              'message',
              'date',
              'time',
            ] as const) {
              const value = formData.get(key);
              if (typeof value === 'string') submitted[key] = value;
            }
            updateDraft(submitted);
            const validation = validateContactDraft(submitted);
            if (validation) {
              updateSubmission({ status: 'idle', error: validation, mode });
              return;
            }
            const website = formData.get('website');
            setInitialNoticeDismissed(true);
            updateSubmission({ status: 'sending', error: '', mode });
            try {
              const result = await submitContactDraft(
                submitted,
                async (body) => {
                  const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { Accept: 'application/json' },
                    body,
                  });
                  const payload = await response.json().catch(() => null);
                  if (
                    !response.ok ||
                    !payload ||
                    typeof payload !== 'object' ||
                    !('ok' in payload) ||
                    payload.ok !== true
                  ) {
                    throw new Error(
                      response.status === 429
                        ? 'Too many messages were sent recently. Please try again later or use email.'
                        : 'Your message could not be saved. Please try again or use email.',
                    );
                  }
                },
                typeof website === 'string' ? website : '',
              );
              updateSubmission({ status: result, error: '', mode });
              if (result === 'sent') onSent?.();
            } catch (failure) {
              updateSubmission({
                status: 'idle',
                error:
                  failure instanceof Error
                    ? failure.message
                    : 'Your message could not be saved. Please try again.',
                mode,
              });
            }
          }}
        >
          <fieldset
            className="contact-app-fields"
            disabled={!ready || status === 'sending'}
          >
            <legend className="sr-only">
              {mode === 'call' ? 'Call request details' : 'Message details'}
            </legend>
            <div className="contact-app-grid">
              {mode === 'call' && (
                <>
                  {field('date', 'Preferred date', {
                    type: 'date',
                    required: true,
                  })}
                  {field('time', 'Preferred time', {
                    type: 'time',
                    required: true,
                  })}
                  <p className="contact-app-timezone contact-app-wide">
                    Time zone:{' '}
                    <strong>
                      {values.timeZone || 'Detecting your time zone…'}
                    </strong>
                    {values.timeZone && ' · your device’s time zone'}
                  </p>
                </>
              )}
              {field('name', 'Name', { autoComplete: 'name', maxLength: 120 })}
              {field('company', 'Company', {
                autoComplete: 'organization',
                maxLength: 160,
              })}
              {field('email', 'Email address', {
                type: 'email',
                autoComplete: 'email',
                maxLength: 254,
                required: true,
              })}
              {field('subject', 'Subject', { maxLength: 200 })}
              <label
                className="contact-app-field contact-app-wide"
                htmlFor={`${id}-message`}
              >
                <span>Message</span>
                <textarea
                  name="message"
                  id={`${id}-message`}
                  value={values.message ?? ''}
                  onChange={(event) =>
                    updateDraft({ message: event.target.value })
                  }
                  rows={3}
                  minLength={10}
                  maxLength={CONTACT_MESSAGE_LIMIT}
                  required
                  aria-describedby={`${id}-length`}
                />
                <small
                  className={
                    characters > CONTACT_MESSAGE_LIMIT
                      ? 'contact-app-limit exceeded'
                      : 'contact-app-limit'
                  }
                  id={`${id}-length`}
                >
                  At least 10 characters · {characters.toLocaleString('en-US')}{' '}
                  / 5,000 including company and subject
                </small>
              </label>
            </div>
          </fieldset>
          <div className="honeypot" aria-hidden="true">
            <label htmlFor={`${id}-website`}>
              Website
              <input
                id={`${id}-website`}
                name="website"
                disabled={!ready}
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>
          {error && (
            <p className="contact-app-error" role="alert" ref={errorNotice}>
              {error}
            </p>
          )}
          <div className="contact-app-submit-row">
            <p>
              {mode === 'call' ? (
                'Call requests aren’t sent yet. Use email to arrange a time.'
              ) : (
                <>
                  Only used to respond to your inquiry.{' '}
                  <a href={pathFor('/privacy', s)}>Privacy ↗</a>
                </>
              )}
            </p>
            <button
              className="contact-app-submit"
              disabled={!ready || status === 'sending'}
              type="submit"
            >
              {status === 'sending'
                ? 'Sending…'
                : mode === 'call'
                  ? 'Request a call'
                  : 'Send message'}
              <Send size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
