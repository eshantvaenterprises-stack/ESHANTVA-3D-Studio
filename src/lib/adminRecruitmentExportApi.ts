'use client';
import {supabaseFunctionUrl,supabasePublicConfig} from '@/config/supabase';
import {getSupabaseBrowserClient} from '@/lib/supabaseBrowser';
import {requireExplicitRecruitmentEnvironment} from '@/lib/recruitmentEnvironment';
export const allowedExportFields=['candidate_reference','application_reference','full_name','email','phone','district','application_status','submitted_at','vacancy_title'] as const;
export const allowedExportScopes={
 applications:allowedExportFields,
 interview_sessions:['session_code','title','venue','starts_at','ends_at','capacity','session_state'],
 document_review:['application_reference','requirement_id','document_status','released_at','reviewed_at'],
 training_attendance:['enrollment_id','day_number','session_date','attendance_status'],
 payment_status:['enrollment_id','payment_purpose','amount_minor','payment_status','reconciled_at'],
 final_selection:['application_reference','final_status','decided_at'],
 audit_records:['application_reference','review_action','reviewed_at','requirement_id']
} as const;
export type ExportScope=keyof typeof allowedExportScopes;
export type ExportField=typeof allowedExportScopes[ExportScope][number];
export type ExportFormat='CSV'|'XLSX'|'PDF';
export async function requestExtendedRecruitmentExport(input:{format:ExportFormat;columns:ExportField[];scope:ExportScope;applicationStatus?:string}){
 const url=requireExplicitRecruitmentEnvironment(supabaseFunctionUrl('recruitment-extended-export-api',process.env.NEXT_PUBLIC_SUPABASE_RECRUITMENT_EXPORT_FUNCTION_URL));
 const {data:{session}}=await getSupabaseBrowserClient().auth.getSession();
 if(!session?.access_token||session.user.is_anonymous)throw new Error('ADMIN_AUTH_REQUIRED');
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicConfig.publishableKey},cache:'no-store',body:JSON.stringify({...input,requestId:crypto.randomUUID()})});
 const payload=await response.json().catch(()=>({ok:false,code:'EXPORT_RESPONSE_INVALID'})) as {ok:boolean;data?:{downloadUrl:string;jobId:string;format:ExportFormat;rowCount:number;sha256:string};code?:string};
 if(!response.ok||!payload.ok||!payload.data)throw new Error(payload.code||'EXPORT_FAILED');
 return payload.data;
}
