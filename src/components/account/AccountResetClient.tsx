'use client';

import { type ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { AccountVisual } from './AccountVisual';
import { getAccountSession, isAnonymousUser, onAccountAuthChange, updateAccountPassword } from '@/lib/accountAuth';

export function AccountResetClient() {
  const [ready, setReady] = useState(false); const [checking, setChecking] = useState(true); const [busy, setBusy] = useState(false); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [show, setShow] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  const activeUserId = useRef<string | null>(null);
  const mutationEpoch = useRef(0);
  useEffect(() => {
    let active = true;
    let authRevision = 0;
    const locationUrl = new URL(window.location.href);
    const hash = new URLSearchParams(locationUrl.hash.replace(/^#/, ''));
    const hasCallback = locationUrl.searchParams.has('code')
      || locationUrl.searchParams.has('token_hash')
      || hash.has('access_token');
    const hasCallbackError = locationUrl.searchParams.has('error') || hash.has('error');
    let resetIntent = !hasCallbackError && (
      locationUrl.searchParams.get('mode') === 'finish-account' || hasCallback
    );
    const updateState = (session: Awaited<ReturnType<typeof getAccountSession>>['data']['session']) => {
      if (!active) return;
      const userId = session?.user && !isAnonymousUser(session.user) ? session.user.id : null;
      if (activeUserId.current !== userId) {
        mutationEpoch.current += 1;
        activeUserId.current = userId;
        setBusy(false); setDone(false); setPassword(''); setConfirm(''); setError('');
      }
      setReady(Boolean(resetIntent && session?.user && !isAnonymousUser(session.user)));
      setChecking(false);
    };

    const revision = authRevision;
    void getAccountSession().then(({ data, error: sessionError }) => {
      if (!active || revision !== authRevision) return;
      if (sessionError) throw sessionError;
      updateState(data.session);
    }).catch(() => {
      if (!active || revision !== authRevision) return;
      updateState(null);
      setError('Reset session could not be checked. Request a new reset link and try again.');
    });
    const { data } = onAccountAuthChange((event, session) => {
      if (!active) return;
      authRevision += 1;
      if (event === 'PASSWORD_RECOVERY') resetIntent = true;
      updateState(session);
    });
    return () => { active = false; authRevision += 1; mutationEpoch.current += 1; activeUserId.current = null; data.subscription.unsubscribe(); };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!ready || !activeUserId.current || busy) return;
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return setError('Use at least 8 characters with a letter and a number.');
    if (password !== confirm) return setError('Passwords do not match.');
    const epoch = mutationEpoch.current;
    setBusy(true);
    try {
      const result = await updateAccountPassword(password);
      if (epoch !== mutationEpoch.current) return;
      if (result.error) throw result.error;
      setDone(true); setPassword(''); setConfirm('');
    } catch {
      if (epoch === mutationEpoch.current) setError('Password could not be updated. Request a new reset link and try again.');
    } finally {
      if (epoch === mutationEpoch.current) setBusy(false);
    }
  }
  return <div className="account-shell"><AccountVisual /><section className="account-panel"><span className="section-kicker">ACCOUNT ACCESS</span><h1>Reset password.</h1>{checking ? <div className="account-loading" role="status">Verifying reset session…</div> : done ? <div className="account-alert is-success" role="status">Password updated. <Link href="/account">Continue to account access.</Link></div> : ready ? <form className="account-form" onSubmit={submit}><label>New password<span className="account-input"><LockKeyhole size={17} /><input type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><label>Confirm password<span className="account-input"><LockKeyhole size={17} /><input type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)} required /></span></label>{error ? <div className="account-alert is-error" role="alert">{error}</div> : null}<button className="button button-primary account-submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'} <ArrowRight size={17} /></button></form> : <div className="account-alert is-error" role="alert">This reset session is not available. <Link href="/account">Request a new reset link.</Link></div>}</section></div>;
}
