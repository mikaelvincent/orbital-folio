'use client';
import { useState } from 'react';

export function SetupForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const key = new FormData(e.currentTarget).get('key');
        try {
          const r = await fetch('/api/admin/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key }),
          });
          const b: any = await r.json();
          if (!r.ok) throw new Error(b.error);
          location.reload();
        } catch (e: any) {
          setError(e.message);
          setBusy(false);
        }
      }}
    >
      <label className="form-field">
        Owner setup key
        <input type="password" name="key" required autoComplete="off" />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button amber" disabled={busy}>
        Claim this portfolio
      </button>
      <p className="setup-help">
        Use ADMIN_SETUP_KEY from your private environment configuration. The
        first claim binds this signed-in identity to the portfolio. There is no
        default owner password.
      </p>
    </form>
  );
}
