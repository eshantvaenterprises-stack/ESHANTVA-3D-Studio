'use client';
import { supabaseFunctionUrl,supabasePublicConfig } from '@/config/supabase';import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';import type { AdminRecruitmentCandidateDetail,AdminRecruitmentSummary,AdminCandidateListItem,RecruitmentVacancy } from '@/types/recruitment';
const url=supabaseFunctionUrl('admin-recruitment-api',process.env.NEXT_PUBLIC_SUPABASE_ADMIN_RECRUITMENT_FUNCTION_URL);
async function call<T>(body:Record<string,unknown>){const{data:{session}}=await getSupabaseBrowserClient().auth.getSession();if(!session?.user||session.user.is_anonymous)throw new Error('Admin access unavailable.');const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicConfig.publishableKey},body:JSON.stringify(body),cache:'no-store'});const p=await r.json().catch(()=>({ok:false})) as {ok:true;data:T}|{ok:false;code?:string};if(!r.ok||!p.ok)throw new Error(!p.ok&&p.code?p.code:'ADMIN_RECRUITMENT_ERROR');return p.data}
export const loadRecruitmentSummary=()=>call<AdminRecruitmentSummary>({action:'summary'});
export const loadRecruitmentCandidates=(input:{search?:string;status?:string;vacancyId?:string})=>call<{rows:AdminCandidateListItem[]}>({action:'list',...input});
export const loadRecruitmentCandidate=(applicationId:string)=>call<AdminRecruitmentCandidateDetail>({action:'detail',applicationId});
export const transitionRecruitmentApplication=(applicationId:string,targetStatus:string)=>call({action:'transition',applicationId,targetStatus,requestId:crypto.randomUUID()});
export const loadAdminVacancies=()=>call<{rows:RecruitmentVacancy[]}>({action:'vacancy-list'});
export const upsertAdminVacancy=(input:Record<string,unknown>)=>call<RecruitmentVacancy>({action:'vacancy-upsert',...input});
export const scheduleRecruitmentInterview=(input:{applicationId:string;scheduledAt:string;reportingTime:string;venue:string;instructions:string})=>call({action:'interview-schedule',...input});
export const releaseRecruitmentInterviewCard=(applicationId:string)=>call<{released:boolean;fileId:string;expiresAt:string}>({action:'interview-card-release',applicationId});
export const addRecruitmentDocumentRequirement=(input:{vacancyId:string;label:string;requirementKey:string;fileKind:string})=>call({action:'document-requirement-upsert',...input});
export const releaseRecruitmentDocuments=(applicationId:string)=>call<{released:number}>({action:'release-documents',applicationId});
export const reviewRecruitmentDocument=(input:{requirementId:string;status:string;note:string})=>call({action:'document-review',...input,requestId:crypto.randomUUID()});
export const saveRecruitmentAssessment=(input:{applicationId:string;status:string;summary?:string;result?:string})=>call({action:'assessment-upsert',...input});
export const adminRecruitmentFileAccess=(fileId:string,disposition:'preview'|'download')=>call<{url:string;expiresIn:number}>({action:'file-access',fileId,disposition});
export const exportRecruitmentMasterCsv=()=>call<{filename:string;csv:string;sha256:string;count:number}>({action:'export-master-csv',requestId:crypto.randomUUID()});
