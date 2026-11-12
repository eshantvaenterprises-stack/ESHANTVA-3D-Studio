'use client';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { supabaseFunctionUrl, supabasePublicConfig } from '@/config/supabase';
import { siteConfig } from '@/config/site';
export class WebsiteFeatureError extends Error { constructor(readonly code:string){super(code==='STATE_CONFLICT'?'This record changed. Refresh before trying again.':code==='IDEMPOTENCY_CONFLICT'?'This operation conflicts with an earlier request. Refresh and try again.':code==='ACCESS_DENIED'?'Access unavailable.':code==='INVALID_INPUT'?'Check the entered values.':code==='PUBLICATION_DISABLED'?'Publication is awaiting release approval.':'This operation is unavailable. Please retry.');} }
export async function websiteActor():Promise<string>{const{data:{session},error}=await getSupabaseBrowserClient().auth.getSession();if(error||!session?.user||session.user.is_anonymous)throw new WebsiteFeatureError('ACCESS_DENIED');return session.user.id;}
export async function websiteApi<T>(action:string,input:Record<string,unknown>={},signal?:AbortSignal,expectedUserId?:string):Promise<T>{
 if(!siteConfig.features.websiteFeatures||!supabasePublicConfig.url||!supabasePublicConfig.publishableKey)throw new WebsiteFeatureError('FEATURE_UNAVAILABLE');
 const headers:Record<string,string>={'Content-Type':'application/json',apikey:supabasePublicConfig.publishableKey};
 if(action!=='published-list'){const{data:{session},error}=await getSupabaseBrowserClient().auth.getSession();if(error||!session?.user||session.user.is_anonymous||(expectedUserId&&session.user.id!==expectedUserId))throw new WebsiteFeatureError('ACCESS_DENIED');headers.Authorization=`Bearer ${session.access_token}`;}
 const res=await fetch(supabaseFunctionUrl('website-features-api'),{method:'POST',headers,body:JSON.stringify({action,...input}),cache:'no-store',signal});const payload=await res.json().catch(()=>null);if(!res.ok||!payload?.ok)throw new WebsiteFeatureError(payload?.code||'FEATURE_UNAVAILABLE');return payload.data as T;
}
export function operationId(previous:{key:string;id:string}|null,key:string){return previous?.key===key?previous:{key,id:crypto.randomUUID()};}

export function websiteMessage(error:unknown):string {if(error instanceof WebsiteFeatureError)return error.message;if(error instanceof Error&&error.message==='INVALID_INPUT')return 'Check the entered values.';return 'This operation is unavailable. Please retry.';}
