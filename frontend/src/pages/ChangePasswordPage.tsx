import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';

function PasswordField({ id, label, value, onChange, error, hint, disabled, autoComplete }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  error?: string; hint?: string; disabled: boolean; autoComplete: 'current-password' | 'new-password';
}) {
  const [visible, setVisible] = useState(false);
  return <div className="form-input-group">
    <label htmlFor={id}>{label}</label>
    <div className="password-entry">
      <input id={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete} disabled={disabled}
        value={value} onChange={(event) => onChange(event.target.value)} required
        minLength={autoComplete === 'new-password' ? 8 : undefined}
        aria-invalid={Boolean(error)} aria-describedby={[error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined} />
      <button type="button" disabled={disabled} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible((open) => !open)}>{visible ? 'Hide' : 'Show'}</button>
    </div>
    {hint && <p id={`${id}-hint`} className="password-change-hint">{hint}</p>}
    {error && <p id={`${id}-error`} className="office-field-error">{error}</p>}
  </div>;
}

export const ChangePasswordPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const validate = () => {
    const errors: Record<string, string> = {};
    if (!currentPassword) errors['current-password'] = 'Enter your current or temporary password.';
    if (newPassword.length < 8) errors['new-password'] = 'Choose a password with at least 8 characters.';
    if (!confirmation) errors['confirm-password'] = 'Retype your new password.';
    else if (confirmation !== newPassword) errors['confirm-password'] = 'These passwords do not match. Please check both entries.';
    return errors;
  };
  const errors = attempted ? validate() : {};
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setAttempted(true);
    setError('');
    const firstError = Object.keys(validate())[0];
    if (firstError) {
      const field = event.currentTarget.querySelector<HTMLInputElement>(`#${firstError}`);
      requestAnimationFrame(() => { field?.focus(); field?.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
      return;
    }
    setPending(true);
    try {
      await apiFetch('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      try { setNeedsSignIn(!(await refreshUser())); } catch { setNeedsSignIn(true); }
      setComplete(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmation('');
    } catch (err) { setError((err as Error).message); }
    finally { setPending(false); }
  };

  if (complete) return <section className="card stack password-change-page" role="status">
    <span className="password-success-label">Saved</span><h1>Password updated</h1>
    <p>{needsSignIn ? 'Your new password is saved. Sign in to continue.' : 'Your new password is saved. You can now continue to Progress Jobs.'}</p>
    <button type="button" className="rec-btn rec-btn-primary" onClick={() => navigate(needsSignIn ? '/login' : '/', { replace: true })}>{needsSignIn ? 'Sign in' : 'Continue'}</button>
  </section>;

  return <form className="card stack password-change-page" noValidate aria-busy={pending} onSubmit={(event) => void submit(event)}>
    <h1>Set your password</h1>
    <p>{user?.mustChangePassword ? 'Set your own password before using your account.' : 'Update the password for this account.'}</p>
    {user?.mustChangePassword && <aside className="password-setup-note"><h2>First sign-in</h2><ol><li>Use the temporary password given to you by Progress.</li><li>Choose a new password and type it again to confirm.</li><li>Save, then select Continue.</li></ol></aside>}
    {error && <div className="record-error" role="alert">{error}</div>}
    {Object.keys(errors).length > 0 && <p className="office-field-error" role="alert">Check the highlighted fields before saving.</p>}
    <PasswordField id="current-password" label={user?.mustChangePassword ? 'Temporary password' : 'Current password'} value={currentPassword} onChange={setCurrentPassword} error={errors['current-password']} disabled={pending} autoComplete="current-password" />
    <PasswordField id="new-password" label="New password" value={newPassword} onChange={setNewPassword} error={errors['new-password']} hint="Use at least 8 characters." disabled={pending} autoComplete="new-password" />
    <PasswordField id="confirm-password" label="Confirm new password" value={confirmation} onChange={setConfirmation} error={errors['confirm-password']} disabled={pending} autoComplete="new-password" />
    {confirmation && <p className={`password-match-note${newPassword === confirmation ? ' is-match' : ''}`} role="status">{newPassword === confirmation ? 'The new passwords match.' : 'The new passwords do not match yet.'}</p>}
    {pending && <p className="password-change-hint" role="status">Saving your new password…</p>}
    <button type="submit" className="rec-btn rec-btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save password'}</button>
  </form>;
};
