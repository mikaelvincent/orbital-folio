import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  FilePenLine,
  LockKeyhole,
  Orbit,
} from 'lucide-react';
import './studio-entry.css';

export function StudioEntry({
  signIn,
  email,
  setup,
}: {
  signIn?: string;
  email?: string;
  setup?: ReactNode;
}) {
  return (
    <main id="main" className="studio-entry">
      <header className="studio-entry-header">
        <a href="/" aria-label="Back to portfolio">
          <Orbit size={25} />
          <span>
            Orbital <strong>Folio</strong>
          </span>
        </a>
        <a href="/">
          <ArrowLeft size={16} />
          View portfolio
        </a>
      </header>
      <div className="studio-entry-layout">
        <section className="studio-entry-intro">
          <span className="studio-entry-mark">
            <FilePenLine size={27} />
          </span>
          <p className="eyebrow">PORTFOLIO WORKSPACE</p>
          <h1>
            Content
            <br /> Studio.
          </h1>
          <p>A private workspace for editing and publishing this portfolio.</p>
          <div className="studio-entry-visitor">
            <span>Here to explore?</span>
            <p>
              The public portfolio is open to everyone. No sign-in is needed.
            </p>
            <a href="/">
              Return to the portfolio
              <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
        <section
          className="studio-entry-access"
          aria-labelledby="studio-access-heading"
        >
          <LockKeyhole size={23} />
          <h2 id="studio-access-heading">
            {signIn
              ? 'Owner sign-in'
              : setup
                ? 'Set up owner access'
                : 'Owner access required'}
          </h2>
          {signIn ? (
            <>
              <p>
                Authorized owners can edit content, preview drafts, publish
                updates and review contact messages.
              </p>
              <a
                className="button amber studio-entry-signin"
                href={signIn}
                target="_top"
              >
                Continue with ChatGPT
                <ArrowUpRight size={17} />
              </a>
              <small>
                Signing in identifies the account. Access to this workspace is
                limited to approved owners.
              </small>
            </>
          ) : (
            <>
              <p className="studio-entry-account">Signed in as {email}.</p>
              {setup || (
                <p>
                  This account does not have permission to edit the portfolio.
                  An existing owner can grant access in the Studio.
                </p>
              )}
              <a
                className="back-link"
                href="/signout-with-chatgpt?return_to=/admin"
              >
                Sign out or use another account
                <ArrowUpRight size={15} />
              </a>
            </>
          )}
        </section>
      </div>
      <footer className="studio-entry-footer">
        Drafts and contact messages stay private.
      </footer>
    </main>
  );
}
