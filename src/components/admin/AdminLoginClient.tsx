'use client';

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { authorizeAdmin, AdminApiError } from '@/lib/adminApi';
import { getAdminAuthSession, signInAdmin, signOutAdmin } from '@/lib/adminAuth';

function withBase(path: string) { return `${siteConfig.basePath}${path}`; }

export function AdminLoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
      const { data, error: sessionError } = await getAdminAuthSession();
      if (sessionError) throw sessionError;
      if (!active) return;
      const user = data.session?.user;
      if (!user || user.is_anonymous) { setChecking(false); return; }
        await authorizeAdmin(false);
        if (active) window.location.replace(withBase('/admin/'));
      } catch {
        if (active) { setError('Admin access unavailable.'); setChecking(false); }
      }
    })();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
    const result = await signInAdmin(email, password);
    if (result.error || !result.data.user) {
      setError('Unable to sign in with those credentials.');
      setSubmitting(false);
      return;
    }
    if (result.data.user.is_anonymous) {
      await signOutAdmin();
      setError('Admin access unavailable.');
      setSubmitting(false);
      return;
    }
    try {
      await authorizeAdmin(true);
      window.location.replace(withBase('/admin/'));
    } catch (authError) {
      if (authError instanceof AdminApiError) await signOutAdmin();
      setError('Admin access unavailable.');
      setSubmitting(false);
    }
    } catch {
      setError('Admin access unavailable. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return <div className="admin-login-status" role="status" aria-live="polite"><LoaderCircle className="admin-spin" size={22} /> Verifying access…</div>;
  }

  return (
    <div className="admin-login-shell">
      <section className="admin-login-brand" aria-label="ESHANTVA admin access">
        <div className="admin-mark"><ShieldCheck size={28} /><span>ESHANTVA</span></div>
        <div><small>3D STUDIO</small><h1>Admin access.</h1><p>Authorized operations users only.</p></div>
        <div className="admin-login-grid" aria-hidden="true" />
      </section>
      <section className="admin-login-panel">
        <div className="admin-login-card">
          <div className="admin-login-heading"><span>ADMIN</span><h2>Sign in</h2><p>Use your authorized ESHANTVA account credentials.</p></div>
          <form onSubmit={submit} noValidate>
            <label htmlFor="admin-email">Email</label>
            <input id="admin-email" name="email" type="email" autoComplete="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required />
            <label htmlFor="admin-password">Password</label>
            <div className="admin-password-field">
              <input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPassword((value: boolean) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {error ? <div className="admin-login-error" role="alert">{error}</div> : null}
            <button className="admin-primary-button" type="submit" disabled={submitting || !email || !password}>{submitting ? <><LoaderCircle className="admin-spin" size={17} /> Verifying…</> : <><LockKeyhole size={17} /> Sign in</>}</button>
          </form>
          <Link className="admin-back-link" href={withBase('/')}><ArrowLeft size={15} /> Back to website</Link>
        </div>
      </section>
    </div>
  );
}
