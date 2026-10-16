import React, { useState } from 'react';
import { LockKeyhole, Shield } from 'lucide-react';
import { backendService } from '../services/BackendService';

interface ModeratorLoginProps {
  authError: string | null;
}

export const ModeratorLogin: React.FC<ModeratorLoginProps> = ({ authError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSigningIn(true);
    try {
      await backendService.signIn(email.trim(), password);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : String(signInError));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <main className="moderator-login-page">
      <form className="moderator-login-card glass" onSubmit={handleSubmit}>
        <div className="moderator-login-brand">
          <Shield size={28} className="logo-icon-svg text-indigo" />
          <div>
            <h1>Thuso Command Center</h1>
            <p>Moderator sign-in required</p>
          </div>
        </div>

        <label className="moderator-login-field">
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="moderator-login-field">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />
        </label>

        {(error || authError) && (
          <div className="moderator-login-error" role="alert">
            {error || authError}
          </div>
        )}

        <button className="btn-primary moderator-login-submit" type="submit" disabled={isSigningIn}>
          <LockKeyhole size={16} />
          {isSigningIn ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="moderator-login-note">
          Only the configured moderator account can access the dashboard and delete reports.
        </p>
      </form>
    </main>
  );
};
