'use client';

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Maximize2, Minimize2 } from 'lucide-react';
import { interfaceText as copy } from '@/lib/content/interface-text';
import { CONTACT_MESSAGE_LIMIT } from './contact-flow';
import './contact-form-message.css';

/** One draft, with a larger editor scoped to the reading viewport or monitor. */
export function ContactMessageField({
  site,
  id,
  value,
  characters,
  disabled,
  onChange,
  expandedContainer,
}: {
  site: Record<string, any>;
  id: string;
  value: string;
  characters: number;
  disabled: boolean;
  onChange: (value: string) => void;
  expandedContainer?: RefObject<HTMLDivElement | null>;
}) {
  const [expanded, setExpanded] = useState(false);
  const compactInput = useRef<HTMLTextAreaElement>(null);
  const expandedInput = useRef<HTMLTextAreaElement>(null);
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const selection = useRef({
    start: 0,
    end: 0,
    direction: 'none' as 'forward' | 'backward' | 'none',
  });

  useLayoutEffect(() => {
    // Base UI mounts its portal after opening. Size the actual mounted node,
    // including when the keyboard has already reduced the visual viewport.
    if (!portal || expandedContainer) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      portal.style.setProperty(
        '--message-viewport-height',
        `${viewport.height}px`,
      );
      portal.style.setProperty(
        '--message-viewport-top',
        `${viewport.offsetTop}px`,
      );
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => {
      viewport.removeEventListener('resize', resize);
      viewport.removeEventListener('scroll', resize);
    };
  }, [portal, expandedContainer]);

  const limit = (suffix: string) => (
    <small
      className={
        characters > CONTACT_MESSAGE_LIMIT
          ? 'contact-app-limit exceeded'
          : 'contact-app-limit'
      }
      id={`${id}-${suffix}`}
    >
      {copy(
        site,
        'At least 10 characters · {count} / 5,000 including company and subject',
        {
          count: characters.toLocaleString('en-US'),
        },
      )}
    </small>
  );
  const inputProps = {
    value,
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      onChange(event.target.value),
    minLength: 10,
    maxLength: CONTACT_MESSAGE_LIMIT,
    required: true,
    disabled,
  };

  return (
    <Dialog.Root
      open={expanded}
      modal={expandedContainer ? 'trap-focus' : true}
      onOpenChange={(open) => {
        const input = open ? compactInput.current : expandedInput.current;
        if (input)
          selection.current = {
            start: input.selectionStart,
            end: input.selectionEnd,
            direction: input.selectionDirection,
          };
        setExpanded(open);
      }}
      onOpenChangeComplete={(open) => {
        const input = open ? expandedInput.current : compactInput.current;
        const { start, end, direction } = selection.current;
        input?.setSelectionRange(start, end, direction);
      }}
    >
      <div className="contact-app-field contact-app-wide">
        <label htmlFor={`${id}-message`}>{site.messageLabel}</label>
        <div className="contact-message-input">
          <textarea
            {...inputProps}
            ref={compactInput}
            name="message"
            id={`${id}-message`}
            rows={3}
            aria-describedby={`${id}-length`}
          />
          <Dialog.Trigger
            className="contact-message-expand"
            disabled={disabled}
            aria-label={copy(site, 'Expand message')}
            title={copy(site, 'Expand message')}
          >
            <Maximize2 size={18} aria-hidden="true" />
          </Dialog.Trigger>
        </div>
        {limit('length')}
      </div>
      <Dialog.Portal
        ref={setPortal}
        container={expandedContainer}
        className="contact-message-portal"
        data-contact-interface
        data-scoped={expandedContainer ? 'screen' : 'viewport'}
      >
        <Dialog.Backdrop className="contact-message-backdrop" />
        <Dialog.Popup
          className="contact-message-editor"
          initialFocus={expandedInput}
          finalFocus={compactInput}
          onKeyDown={(event) => {
            // Consume Escape before the room's global navigation handler.
            if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.stopPropagation();
              const input = expandedInput.current;
              if (input)
                selection.current = {
                  start: input.selectionStart,
                  end: input.selectionEnd,
                  direction: input.selectionDirection,
                };
              setExpanded(false);
            }
          }}
        >
          <header className="contact-message-editor-bar">
            <Dialog.Title>{site.messageLabel}</Dialog.Title>
            <Dialog.Close
              className="contact-message-collapse"
              aria-label={copy(site, 'Collapse message')}
              title={copy(site, 'Collapse message')}
            >
              <Minimize2 size={18} aria-hidden="true" />
            </Dialog.Close>
          </header>
          <textarea
            {...inputProps}
            ref={expandedInput}
            aria-label={site.messageLabel}
            aria-describedby={`${id}-expanded-length`}
          />
          <footer className="contact-message-editor-footer">
            {limit('expanded-length')}
            <Dialog.Close className="contact-message-done">
              {copy(site, 'Done')}
            </Dialog.Close>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
