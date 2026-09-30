'use client';
import { interfaceText as copy } from '@/lib/content/interface-text';
import { useRef, type ComponentProps } from 'react';
import { Radio, X } from 'lucide-react';
import { ContactForm } from './contact-form';
import { ContactScrollArea } from './contact-scroll-area';
import { PrivacyView } from './privacy-view';
import './contact-computer-window.css';

/** Native form controls on the monitor's world-space application plane. */
export function ContactComputerWindow({
  onClose,
  privacy = false,
  backHref,
  ...form
}: ComponentProps<typeof ContactForm> & {
  onClose: () => void;
  privacy?: boolean;
  backHref?: string;
}) {
  const desktop = useRef<HTMLDivElement>(null);
  const positions = useRef<Record<string, number>>({});
  const view = privacy ? 'privacy' : 'form';
  return (
    <div className="contact-computer-desktop" ref={desktop}>
      <article
        className="contact-computer-window"
        id="world-reader"
        tabIndex={-1}
        aria-label={copy(form.site, 'Contact computer')}
        data-contact-interface
      >
        <header className="contact-window-bar">
          <span>
            <Radio size={13} aria-hidden="true" />
            {form.site.contactLabel}
          </span>
          <button
            className="contact-window-close"
            type="button"
            aria-label={copy(form.site, 'Close Contact application')}
            title={copy(form.site, 'Close Contact application')}
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <ContactScrollArea
          site={form.site}
          label={privacy ? form.site.privacyLabel : 'Contact application'}
          restorationKey={view}
          initialScrollTop={positions.current[view] ?? 0}
          onScroll={(top) => {
            positions.current[view] = top;
          }}
        >
          {privacy ? (
            <PrivacyView data={{ site: form.site }} backHref={backHref} />
          ) : (
            <ContactForm {...form} expandedMessageContainer={desktop} />
          )}
        </ContactScrollArea>
      </article>
    </div>
  );
}
