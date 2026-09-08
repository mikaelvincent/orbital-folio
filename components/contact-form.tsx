'use client';
import { useState } from 'react';
import { pathFor } from '@/lib/paths';
import { Radio, ArrowUpRight, Check, UserRound, Box } from 'lucide-react';
export function ContactForm({
  site: s,
  initialSent = false,
  initialError = false,
}: {
  site: Record<string, any>;
  initialSent?: boolean;
  initialError?: boolean;
}) {
  const [status, setStatus] = useState(initialSent ? 'sent' : 'idle');
  const [error, setError] = useState(initialError ? s.contactError : '');
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
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setStatus('sending');
            setError('');
            try {
              const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { Accept: 'application/json' },
                body: new FormData(form),
              });
              if (!response.ok) throw new Error(s.contactError);
              setStatus('sent');
            } catch {
              setError(s.contactError);
              setStatus('idle');
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
                defaultChecked
              />
              <span>
                <UserRound size={19} />
                {s.interviewLabel}
              </span>
            </label>
            <label>
              <input type="radio" name="intent" value="project" />
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
            {s.contactPrivacy} <a href={pathFor('/privacy', s)}>{s.privacyLabel} ↗</a>
          </p>
        </form>
      )}
    </div>
  );
}
