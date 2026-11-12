'use client';

import { retailVisibility } from '@/config/retailVisibility';


import { type ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, LockKeyhole, LogOut, Mail, UserRound } from 'lucide-react';
import { AccountVisual } from './AccountVisual';
import { createAccount, getAccountSession, isAnonymousUser, onAccountAuthChange, requestPasswordReset, signInAccount, signOutAccount } from '@/lib/accountAuth';
import type { AccountMode, AccountSessionState } from '@/types/account';

const initialSession: AccountSessionState = { loading: true, authenticated: false, anonymous: false, email: null, fullName: null };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validPassword(value: string) { return value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value); }

export function AccountAccessClient() {
  const [mode, setMode] = useState<AccountMode>('signin');
  const [sessionState, setSessionState] = useState(initialSession);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let active = true;
    let authRevision = 0;
    const sync = async () => {
      const revision = authRevision;
      try {
        const { data, error: sessionError } = await getAccountSession();
        if (!active || revision !== authRevision) return;
        if (sessionError) throw sessionError;
        const user = data.session?.user;
        setSessionState({ loading: false, authenticated: Boolean(user && !isAnonymousUser(user)), anonymous: isAnonymousUser(user), email: user?.email ?? null, fullName: typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null });
      } catch {
        if (!active || revision !== authRevision) return;
        setSessionState({ ...initialSession, loading: false });
        setError('Account session could not be checked. Please try signing in again.');
      }
    };
    void sync();
    const { data: listener } = onAccountAuthChange((_event, session) => {
      if (!active) return;
      authRevision += 1;
      const user = session?.user;
      setSessionState({ loading: false, authenticated: Boolean(user && !isAnonymousUser(user)), anonymous: isAnonymousUser(user), email: user?.email ?? null, fullName: typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null });
    });
    return () => { active = false; authRevision += 1; listener.subscription.unsubscribe(); };
  }, []);

  const passwordChecks = useMemo(() => ({ length: password.length >= 8, letter: /[A-Za-z]/.test(password), number: /[0-9]/.test(password), match: Boolean(password) && password === confirmPassword }), [password, confirmPassword]);
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
  function switchMode(next: AccountMode) { setMode(next); setMessage(''); setError(''); setPassword(''); setConfirmPassword(''); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      if (!emailPattern.test(email)) throw new Error('Enter a valid email address.');
      if (mode === 'signin') {
        if (!password) throw new Error('Enter your password.');
        const result = await signInAccount(email, password);
        if (result.error) throw new Error('Email or password is incorrect.');
        setMessage('Signed in.');
      } else if (mode === 'register') {
        if (fullName.trim().length < 2) throw new Error('Enter your full name.');
        if (!validPassword(password)) throw new Error('Use at least 8 characters with a letter and a number.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        const result = await createAccount({ fullName, email, password });
        if (result.error) throw new Error('Account creation could not be completed. Check the details and try again.');
        if (result.conversionStarted) setMessage('Check your email to verify this address. After verification, set your account password.');
        else if (result.session) setMessage('Account created and signed in.');
        else setMessage('Check your email to confirm your account.');
      } else {
        const result = await requestPasswordReset(email);
        if (result.error) throw new Error('The reset request could not be completed. Please try again.');
        setMessage('If an account can receive recovery email at that address, reset instructions have been sent.');
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Account access could not be completed.'); }
    finally { setBusy(false); }
  }

  const submitLabel = busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link';

  if (sessionState.loading) return <div className="ea-stage">
    <AccountVisual state="loading" />
    <div className="ea-dock">
      <section className="ea-panel is-loading">
        <header className="ea-panel-head"><span className="section-kicker">ACCOUNT ACCESS</span><h1>Account access.</h1></header>
        <div className="ea-skeleton" aria-hidden="true"><i className="is-tabs" /><i /><i /><i className="is-cta" /></div>
        <div className="ea-loading" role="status">Checking account session…</div>
      </section>
    </div>
  </div>;

  if (sessionState.authenticated) return <div className="ea-stage">
    <AccountVisual state="signed" />
    <div className="ea-dock">
      <section className="ea-panel is-signed">
        <header className="ea-panel-head"><span className="section-kicker">ACCOUNT ACCESS</span><h1>Account access.</h1></header>
        <div className="ea-signed-card">
          <span className="ea-avatar" aria-hidden="true"><UserRound size={22} /></span>
          <div><strong>{sessionState.fullName || 'Signed in'}</strong><span>{sessionState.email}</span></div>
        </div>
        <div className="ea-actions">
          <Link className="ea-cta" href="/account/dashboard"><span>Open dashboard</span><span className="ea-cta-icon" aria-hidden="true"><ArrowRight size={17} /></span></Link>
          {retailVisibility.isInternal && <Link className="ea-ghost" href="/cart">Open cart</Link>}
        </div>
        <button className="ea-text-button" type="button" onClick={() => void signOutAccount()}><LogOut size={16} /> Sign out</button>
      </section>
    </div>
  </div>;

  return <div className="ea-stage">
    <AccountVisual state={mode} />
    <div className="ea-dock">
      <section className="ea-panel" data-mode={mode}>
        <header className="ea-panel-head"><span className="section-kicker">ACCOUNT ACCESS</span><h1>Account access.</h1></header>

        <div className="ea-tabs" role="tablist" aria-label="Account access mode" data-active={mode === 'forgot' ? 'none' : mode}>
          <span className="ea-tabs-thumb" aria-hidden="true" />
          <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => switchMode('signin')}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => switchMode('register')}>Create account</button>
        </div>

        <div className="ea-mode" key={mode}>
          {mode === 'forgot' ? <div className="ea-mode-heading"><strong>Reset password</strong><span>Enter your account email.</span></div> : null}
          {sessionState.anonymous && mode === 'register' ? <p className="ea-note">This browser has a guest session. Email verification will preserve that identity before a password is added.</p> : null}
          {sessionState.anonymous && mode === 'signin' ? <p className="ea-note">Signing in switches this browser from its guest session to the selected account. Guest-owned records are not transferred automatically.</p> : null}

          <form className="ea-form" onSubmit={submit} noValidate>
            {mode === 'register' ? <label className="ea-field-row">
              <span className="ea-label">Full name</span>
              <span className="ea-input"><UserRound size={17} /><input autoComplete="name" value={fullName} onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)} required /></span>
            </label> : null}

            <label className="ea-field-row">
              <span className="ea-label">Email</span>
              <span className="ea-input"><Mail size={17} /><input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required /></span>
            </label>

            {mode !== 'forgot' ? <label className="ea-field-row">
              <span className="ea-label">Password</span>
              <span className="ea-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
            </label> : null}

            {mode === 'register' ? <>
              <label className="ea-field-row">
                <span className="ea-label">Confirm password</span>
                <span className="ea-input"><LockKeyhole size={17} /><input type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} required /><button type="button" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>{showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
              </label>
              <div className="ea-rules">
                <div className="ea-meter" data-score={passwordScore} aria-hidden="true"><i /><i /><i /><i /></div>
                <div className="ea-rule-list" aria-live="polite"><span data-ok={passwordChecks.length}>8+ characters</span><span data-ok={passwordChecks.letter}>Letter</span><span data-ok={passwordChecks.number}>Number</span><span data-ok={passwordChecks.match}>Passwords match</span></div>
              </div>
            </> : null}

            {error ? <div className="ea-alert is-error" role="alert">{error}</div> : null}
            {message ? <div className="ea-alert is-success" role="status">{message}</div> : null}

            <button className="ea-cta ea-submit" type="submit" disabled={busy} aria-busy={busy}>
              <span>{submitLabel}</span>
              <span className="ea-cta-icon" aria-hidden="true">{busy ? <i className="ea-spinner" /> : <ArrowRight size={17} />}</span>
            </button>
          </form>

          <div className="ea-secondary">{mode === 'signin' ? <button type="button" onClick={() => switchMode('forgot')}>Forgot password?</button> : mode === 'forgot' ? <button type="button" onClick={() => switchMode('signin')}>Back to sign in</button> : <button type="button" onClick={() => switchMode('signin')}>Already have an account? Sign in</button>}</div>
        </div>
      </section>
    </div>
  </div>;
}
