'use client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { siteConfig } from '@/config/site';
import { recruitmentRuntimeConfigured } from '@/config/recruitmentRuntime';
function redirect(path:string){if(typeof window==='undefined')return undefined;return `${window.location.origin}${siteConfig.basePath}${path}`}
export function candidateSession(){return getSupabaseBrowserClient().auth.getSession()}
export function onCandidateAuthChange(cb:(event:AuthChangeEvent,session:Session|null)=>void){return getSupabaseBrowserClient().auth.onAuthStateChange(cb)}
export function candidateSignIn(email:string,password:string){if(!recruitmentRuntimeConfigured)throw new Error('RECRUITMENT_ENVIRONMENT_NOT_ENABLED');return getSupabaseBrowserClient().auth.signInWithPassword({email:email.trim().toLowerCase(),password})}
export async function candidateSignUp(input:{email:string;password:string;fullName:string;claimToken:string;requestId:string}):Promise<never>{void input;throw new Error('PUBLIC_REGISTRATION_CLOSED')}
export function candidateReset(email:string){return getSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:redirect('/account/reset/')})}
export function candidateSignOut(){return getSupabaseBrowserClient().auth.signOut({scope:'local'})}
