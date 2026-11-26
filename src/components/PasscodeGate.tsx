import { useState } from 'react';
import { Lock } from 'lucide-react';
import { loginWithPasscode } from '../lib/api';

interface PasscodeGateProps {
  onSuccess: () => void;
}

export function PasscodeGate({ onSuccess }: PasscodeGateProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await loginWithPasscode(passcode);
      onSuccess();
    } catch {
      setError('Incorrect passcode. Try again.');
      setPasscode('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gate-screen">
      <div className="gate-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span className="brand" style={{ fontSize: 28 }}>
            KINO<span className="brand-dot" />
          </span>
        </div>

        <h1 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600 }}>Private Screening Room</h1>
        <p style={{ margin: '0 0 22px', fontSize: 13.5, color: 'var(--text-secondary)' }}>
          Enter your shared passcode to continue.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="gate-input"
            placeholder="Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoFocus
          />

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={submitting || !passcode.trim()}
          >
            <Lock size={15} />
            <span>{submitting ? 'Checking...' : 'Enter'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
