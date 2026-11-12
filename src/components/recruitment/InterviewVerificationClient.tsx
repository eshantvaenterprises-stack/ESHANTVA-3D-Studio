'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { verifyInterviewToken } from '@/lib/recruitmentApi';
import type { InterviewVerificationResult } from '@/types/recruitment';

type VerificationState =
  | { token: string; status: 'loading' }
  | { token: string; status: 'error' }
  | { token: string; status: 'ready'; data: InterviewVerificationResult };

export function InterviewVerificationClient() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<VerificationState>({ token: '', status: 'loading' });

  useEffect(() => {
    if (!token) return;

    let active = true;
    verifyInterviewToken(token)
      .then((data) => {
        if (active) setState({ token, status: 'ready', data });
      })
      .catch(() => {
        if (active) setState({ token, status: 'error' });
      });

    return () => {
      active = false;
    };
  }, [token]);

  const currentState: VerificationState = token
    ? state.token === token
      ? state
      : { token, status: 'loading' }
    : { token, status: 'error' };

  if (currentState.status === 'loading') {
    return <div className="recruit-card"><h2>Verifying interview card…</h2></div>;
  }

  if (currentState.status === 'error') {
    return <div className="recruit-card"><ShieldX/><h2>Invalid interview verification.</h2><p>This token could not be verified.</p></div>;
  }

  const details = currentState.data;
  return <div className="recruit-card"><ShieldCheck/><span className="section-kicker">INTERVIEW CARD VERIFICATION</span><h2>{details.status}</h2><p><b>Candidate:</b> {details.candidateName}</p><p><b>Candidate ID:</b> {details.candidateReference}</p><p><b>Application ID:</b> {details.applicationReference}</p><p><b>Position:</b> {details.position}</p><p><b>Interview:</b> {details.interviewDate?new Date(details.interviewDate).toLocaleString():'Not available'}</p><p><b>Card status:</b> {details.cardStatus}</p></div>;
}
