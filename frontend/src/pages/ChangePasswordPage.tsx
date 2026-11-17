import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export const ChangePasswordPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await apiFetch('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      await refreshUser();
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="card stack" onSubmit={(event) => void submit(event)} style={{ maxWidth: 420, margin: '2rem auto' }}>
      <h1>Choose a new password</h1>
      <p className="muted">
        {user?.mustChangePassword
          ? 'This account was created at the Progress office. Set your own password before continuing.'
          : 'Update the password for this account.'}
      </p>
      {error && <div className="alert-box-error">{error}</div>}
      <div className="form-input-group">
        <label htmlFor="current-password">Current password</label>
        <input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      </div>
      <div className="form-input-group">
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
      </div>
      <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save password'}</button>
    </form>
  );
};
