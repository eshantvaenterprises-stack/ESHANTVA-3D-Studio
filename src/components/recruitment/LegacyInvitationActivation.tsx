'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { supabaseFunctionUrl, supabasePublicConfig } from '@/config/supabase';
import { siteConfig } from '@/config/site';
import { recruitmentRuntimeConfigured } from '@/config/recruitmentRuntime';

type Step = 'invitation' | 'verify';

const gateway = recruitmentRuntimeConfigured ? supabaseFunctionUrl('stage2c-invitation-login') : ''; 

/**
 * No ticket/password is written into URLs, localStorage, sessionStorage or logs.
 * The ticket lives only in React memory, expires at the gateway/database after 20 minutes,
 * and is consumed atomically by the authenticated claim function.
 */
export function LegacyInvitationActivation() {
  const [step, setStep] = useState<Step>('invitation');
  const [ticket, setTicket] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!recruitmentRuntimeConfigured) return;
    let active = true;
    const sb = getSupabaseBrowserClient();
    const check = async () => {
      const { data: { user }, error } = await sb.auth.getUser();
      if (active) setVerified(!error && Boolean(user && !user.is_anonymous && user.email_confirmed_at));
    };
    void check();
    const { data: { subscription } } = sb.auth.onAuthStateChange(() => { void check(); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function redeem(form: FormData) {
    if (busy || !verified) {setMessage('First sign in with an email-confirmed account.');return;}
    if (!recruitmentRuntimeConfigured) {setMessage('Invitation activation is not enabled for this deployment.');return;}
    setBusy(true); setMessage('');
    try {
      const res = await fetch(gateway, {
        method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', apikey: supabasePublicConfig.publishableKey },
        body: JSON.stringify({ login: String(form.get('login') || '').trim(), password: String(form.get('temporaryPassword') || '') }),
      });
      const payload = await res.json() as { ok?: boolean; activationTicket?: string; expiresInSeconds?: number };
      if (!res.ok || !payload.ok || !/^[a-f0-9]{64}$/.test(payload.activationTicket || '')) throw new Error('INVITATION_UNAVAILABLE');
      setTicket(payload.activationTicket!);
      setExpiresAt(Date.now() + Math.min(payload.expiresInSeconds || 1200, 1200) * 1000);
      setStep('verify');
      setMessage('Invitation accepted. Complete the link using your already verified account.');
    } catch {
      setMessage('Invitation unavailable. Check your details or contact the recruitment team.');
    } finally { setBusy(false); }
  }

  async function signIn(form: FormData) {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const email = String(form.get('email') || '').trim().toLowerCase();
      const password = String(form.get('password') || '');
      const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      setMessage('Account signed in. Confirm that your email is verified, then link your invitation.');
    } catch { setMessage('Could not sign in to a verified email account.'); }
    finally { setBusy(false); }
  }

  async function signUp(form: FormData) {
    if (busy || !recruitmentRuntimeConfigured || verified) return;
    setBusy(true); setMessage('');
    try {
      const email = String(form.get('newEmail') || '').trim().toLowerCase();
      const password = String(form.get('newPassword') || '');
      if (password.length < 12) throw new Error('WEAK_PASSWORD');
      const { error } = await getSupabaseBrowserClient().auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}${siteConfig.basePath}/candidate/activate/` },
      });
      if (error) throw error;
      setMessage('Check your email and finish verification first. Return here and sign in before redeeming the temporary invitation.');
    } catch { setMessage('Unable to start verified-email account setup. Confirm that the email is approved for the invitation.'); }
    finally { setBusy(false); }
  }

  async function claim() {
    if (busy) return;
    if (!ticket || Date.now() >= expiresAt) { setTicket(''); setStep('invitation'); setMessage('Activation expired. Ask the recruitment team to reissue the one-time invitation.'); return; }
    setBusy(true); setMessage('');
    try {
      const sb = getSupabaseBrowserClient();
      const { data: { user }, error: userError } = await sb.auth.getUser();
      if (userError || !user || user.is_anonymous || !user.email_confirmed_at) throw new Error('VERIFIED_EMAIL_REQUIRED');
      const { error } = await sb.rpc('stage2c_claim_activation_ticket', { p_ticket: ticket });
      if (error) throw error;
      setTicket('');
      setMessage('');
      window.location.replace(`${siteConfig.basePath}/candidate/`);
    } catch {
      setMessage('Activation cannot be completed. Your verified email must match the approved record. Phone-only or conflicting records require manual ownership review.');
    } finally { setBusy(false); }
  }

  return <div className="candidate-auth">{!recruitmentRuntimeConfigured&&<div className="recruit-card"><strong>Activation currently unavailable.</strong><p>Authorized staging configuration is required; no production fallback will be used.</p></div>}
    {!verified && <div className="candidate-form"><h2>Step 1: Verify your approved email</h2><p>Verify your email and sign in before redeeming the one-time invitation. This prevents the activation ticket from being lost during email verification. The email must match your approved record; a phone-only record requires manual review first.</p>
    <form action={signIn} className="candidate-form compact"><h3>Sign in to a verified email account</h3><label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Account password<input name="password" type="password" autoComplete="current-password" required/></label><button className="button" disabled={busy||!recruitmentRuntimeConfigured}>Sign in</button></form>
    <form action={signUp} className="candidate-form compact"><h3>Set up your approved email account</h3><label>Approved email<input name="newEmail" type="email" autoComplete="email" required/></label><label>Choose a new password (at least 12 characters)<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required/></label><button className="button" disabled={busy||!recruitmentRuntimeConfigured}>Send verification email</button></form></div>}
    {verified && step === 'invitation' ? <form action={redeem} className="candidate-form">
      <h2>Step 2: Verify temporary invitation</h2>
      <p>For applicants approved from evidence received by 12 October 2026, 6:00 PM IST. New applications are closed.</p>
      <label>Invited phone number (with country code) or email<input name="login" autoComplete="username" required minLength={3}/></label>
      <label>Temporary invitation password<input name="temporaryPassword" type="password" autoComplete="off" minLength={12} required/></label>
      <button className="button primary" disabled={busy||!recruitmentRuntimeConfigured}>Verify invitation</button>
    </form> : <div className="candidate-form">
      <h2>Step 3: Link approved candidate record</h2>
      <p>Invitation valid for up to 20 minutes. The account must use the email independently approved by ESHANTVA. For a phone-only application, contact the team for manual ownership verification first.</p>
      {verified && <button type="button" className="button primary" onClick={()=>void claim()} disabled={busy}>Link approved application to verified account</button>}
      <button type="button" className="button" onClick={()=>{setTicket('');setStep('invitation');setMessage('')}}>Cancel activation</button>
    </div>}
    {message && <p className="form-message" role="status">{message}</p>}
  </div>;
}
