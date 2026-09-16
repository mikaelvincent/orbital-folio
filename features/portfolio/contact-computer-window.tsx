'use client';
import type { ComponentProps } from 'react';
import { Radio, X } from 'lucide-react';
import { ContactForm } from './contact-form';
import './contact-computer-window.css';

/** Native form controls on the monitor's world-space application plane. */
export function ContactComputerWindow({
  onClose,
  ...form
}: ComponentProps<typeof ContactForm> & { onClose: () => void }) {
  return (
    <div className="contact-computer-desktop">
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
          <button
            className="contact-window-close"
            type="button"
            aria-label="Close Contact application"
            title="Close Contact application"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="contact-window-body">
          <ContactForm {...form} />
        </div>
      </article>
    </div>
  );
}
