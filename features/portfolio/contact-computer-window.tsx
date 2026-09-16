'use client';
import type { ComponentProps } from 'react';
import { ArrowLeft, Radio } from 'lucide-react';
import { ContactForm } from './contact-form';
import './contact-computer-window.css';

/** Native form controls on the monitor's world-space application plane. */
export function ContactComputerWindow({
  onClose,
  ...form
}: ComponentProps<typeof ContactForm> & { onClose: () => void }) {
  return (
    <article
      className="contact-computer-window"
      id="world-reader"
      tabIndex={-1}
      aria-label="Contact computer"
      data-contact-interface
    >
      <header className="contact-window-bar">
        <span>
          <Radio size={13} aria-hidden="true" /> CONTACT
        </span>
        <button type="button" onClick={onClose}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to room
        </button>
      </header>
      <div className="contact-window-body">
        <ContactForm {...form} />
        {form.site.sampleMode && (
          <details className="contact-window-sample">
            <summary>Sample contact details</summary>
            <p>{form.site.sampleContact}</p>
          </details>
        )}
      </div>
    </article>
  );
}
