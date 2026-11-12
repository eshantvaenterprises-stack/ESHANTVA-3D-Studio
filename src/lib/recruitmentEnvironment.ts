/** Fail closed for recruitment APIs if website env silently falls back to a different Supabase project. */
import {supabasePublicConfig} from '@/config/supabase';
export function requireExplicitRecruitmentEnvironment(functionUrl:string):string{
 const configuredUrl=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,'');
 const configuredKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!configuredUrl||!configuredKey||configuredUrl!==supabasePublicConfig.url||configuredKey!==supabasePublicConfig.publishableKey){
  throw new Error('RECRUITMENT_ENVIRONMENT_NOT_CONFIGURED');
 }
 try{
  const api=new URL(configuredUrl),endpoint=new URL(functionUrl);
  if(api.protocol!=='https:'||endpoint.protocol!=='https:'||api.origin!==endpoint.origin||!endpoint.pathname.startsWith('/functions/v1/')){
   throw new Error('RECRUITMENT_FUNCTION_ORIGIN_MISMATCH');
  }
 }catch(e){if(e instanceof Error&&e.message==='RECRUITMENT_FUNCTION_ORIGIN_MISMATCH')throw e;throw new Error('RECRUITMENT_FUNCTION_URL_INVALID')}
 return functionUrl;
}
