'use client';
import { supabaseFunctionUrl, supabasePublicConfig } from '@/config/supabase';
import { recruitmentRuntimeConfigured } from '@/config/recruitmentRuntime';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';

const url=supabaseFunctionUrl('stage2c-legacy-admin-api',process.env.NEXT_PUBLIC_SUPABASE_LEGACY_ADMIN_FUNCTION_URL);
export type LegacyPerson={id:string;intake_status:string;full_name:string|null;email_normalized:string|null;phone_e164:string|null;merged_into:string|null;auth_user_id:string|null;candidate_id:string|null;updated_at:string};
export type LegacySource={id:string;person_id:string|null;source_type:string;source_ref:string;received_at:string;review_state:string;imported_at:string};
export type LegacySummary={persons:number;pending:number;approved:number;invited:number;activated:number;evidence:number;unreviewed:number;conflicts:number;postCutoff:number;activeInvitations:number;importEnabled:boolean};
export type LegacyList={people:LegacyPerson[];sources:LegacySource[]};
export type LegacyPreview={eligibleReceivedAt:boolean;sourceAlreadyExists:boolean;matches:LegacyPerson[];reviewRequired:boolean;automaticMerge:false};

async function invoke<T>(body:Record<string,unknown>):Promise<T>{
 if(!recruitmentRuntimeConfigured)throw new Error('Recruitment environment must be explicitly enabled.');
 const {data:{session}}=await getSupabaseBrowserClient().auth.getSession();
 if(!session?.user||session.user.is_anonymous)throw new Error('Verified admin sign-in required');
 const res=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicConfig.publishableKey},body:JSON.stringify(body)});
 const payload=await res.json().catch(()=>({ok:false,code:'BAD_RESPONSE'})) as {ok:true;data:T}|{ok:false;code:string};
 if(!res.ok||!payload.ok)throw new Error(!payload.ok?payload.code:'LEGACY_API_FAILED');
 return payload.data;
}
export const loadLegacySummary=()=>invoke<LegacySummary>({action:'summary'});
export const loadLegacyList=()=>invoke<LegacyList>({action:'list'});
export const previewLegacySource=(input:{sourceType:string;sourceRef:string;receivedAt:string;fullName:string;email:string;phone:string})=>invoke<LegacyPreview>({action:'preview-source',...input});
export const legacyMutation=<T=unknown>(action:string,input:Record<string,unknown>,reason:string)=>invoke<T>({action,...input,reason,requestId:crypto.randomUUID()});
