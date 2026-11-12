'use client';
import {supabaseFunctionUrl,supabasePublicConfig} from '@/config/supabase';
import {getSupabaseBrowserClient} from '@/lib/supabaseBrowser';
import {requireExplicitRecruitmentEnvironment} from '@/lib/recruitmentEnvironment';
const url=supabaseFunctionUrl('recruitment-extended-admin-api',process.env.NEXT_PUBLIC_SUPABASE_RECRUITMENT_EXTENDED_FUNCTION_URL);
export type ExtendedSession = {id:string;session_code:string;title:string;venue:string;starts_at:string;ends_at:string;capacity:number;state:string;schedule_version:number};
export type ExtendedBatch = {id:string;kind:string;session_id?:string|null;cohort_id?:string|null;state:string;verified_at:string|null;published_at:string|null;created_at:string};
async function call<T>(action:string,payload:Record<string,unknown>={}){
 requireExplicitRecruitmentEnvironment(url);
 const {data:{session}}=await getSupabaseBrowserClient().auth.getSession();
 if(!session?.access_token||session.user.is_anonymous)throw new Error('ADMIN_AUTH_REQUIRED');
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicConfig.publishableKey},cache:'no-store',body:JSON.stringify({action,...payload})});
 const response=await r.json().catch(()=>({ok:false,code:'API_RESPONSE_INVALID'})) as {ok:boolean;data?:T;code?:string};
 if(!r.ok||!response.ok||response.data===undefined)throw new Error(response.code||'EXTENDED_API_ERROR');
 return response.data;
}
export const listExtendedSessions=()=>call<{sessions:ExtendedSession[]}>('session-list');
export const listExtendedBatches=()=>call<{batches:ExtendedBatch[]}>('batch-summary');
export const saveExtendedDocumentRevision=(kind:'ADMIT_CARD'|'TRAINING_SCHEDULE'|'APPOINTMENT_LETTER',templateId:string,scopeId:string,content:Record<string,unknown>)=>call<{revisionId:string}>('save-document-revision',{kind,templateId,applicationId:kind==='TRAINING_SCHEDULE'?null:scopeId,cohortId:kind==='TRAINING_SCHEDULE'?scopeId:null,content});
export const readBackDocumentRevision=(revisionId:string)=>call<{id:string;revision:number;content:Record<string,unknown>;content_sha256:string;state:string}>('revision-readback',{revisionId});

export type ExtendedAssignment={id:string;session_id:string;application_id:string;reporting_at:string;state:string;created_at:string};
export const readExtendedSession=(sessionId:string)=>call<{session:ExtendedSession;assignments:ExtendedAssignment[]}>('session-detail',{sessionId});
export const createExtendedSession=(input:{sessionCode:string;title:string;venue:string;startsAt:string;endsAt:string;capacity:number})=>call<{sessionId:string}>('create-session',input);
export const openExtendedSession=(sessionId:string)=>call<{sessionId:string}>('open-session',{sessionId});
export const assignExtendedInterview=(applicationId:string,sessionId:string,reportingAt:string)=>call<{assignmentId:string}>('assign-interview',{applicationId,sessionId,reportingAt});
export const reassignExtendedInterview=(applicationId:string,sessionId:string,reportingAt:string)=>call<{assignmentId:string}>('reassign-interview',{applicationId,sessionId,reportingAt});
export const markExtendedInterviewAttendance=(applicationId:string,attendance:'PRESENT'|'ABSENT'|'EXCUSED')=>call<{applicationId:string}>('mark-interview-attendance',{applicationId,attendance});
export const readExtendedInterviewOutcomes=()=>call<{outcomes:{application_id:string;attendance:string;result_version:number;published_at:string|null}[]}>('interview-outcomes');
export const readExtendedTraining=()=>call<{cohorts:{id:string;code:string;name:string;start_date:string;end_date:string;status:string}[];enrollments:{id:string;cohort_id:string;application_id:string;state:string}[]}>('training-overview');
export const readExtendedExportJobs=()=>call<{jobs:{id:string;format:string;state:string;row_count:number|null;generated_at:string|null}[]}>('export-overview');

export type ExtendedInterviewResult={application_id:string;attendance:string;draft_result:Record<string,unknown>;published_result:Record<string,unknown>|null;result_version:number;published_at:string|null;updated_at:string};
export const saveExtendedInterviewResult=(applicationId:string,attendance:'PRESENT'|'ABSENT'|'EXCUSED',result:Record<string,unknown>)=>call<{version:number}>('save-interview-result',{applicationId,attendance,result});
export const readBackExtendedInterviewResult=(applicationId:string)=>call<ExtendedInterviewResult>('result-readback',{applicationId});
export const publishExtendedInterviewResult=(applicationId:string,expectedResult:Record<string,unknown>)=>call<{version:number}>('publish-interview-result',{applicationId,expectedResult});
export const createExtendedTrainingCohort=(code:string,name:string,startDate:string,endDate:string)=>call<{cohortId:string}>('create-training-cohort',{code,name,startDate,endDate});
export const enrollExtendedTraining=(cohortId:string,applicationId:string)=>call<{enrollmentId:string}>('enroll-training',{cohortId,applicationId});
export const recordExtendedTrainingDay=(enrollmentId:string,dayNumber:number,sessionDate:string,attendance:'PRESENT'|'ABSENT'|'EXCUSED')=>call<{enrollmentId:string}>('record-training-day',{enrollmentId,dayNumber,sessionDate,attendance});

export const renderExtendedAdmitCard=(revisionId:string)=>call<{revisionId:string;sha256:string;byteLength:number}>('render-admit-card',{revisionId});
export const verifyExtendedDocumentRevision=(revisionId:string,contentSha256:string)=>call<{revisionId:string}>('verify-revision',{revisionId,contentSha256});
export const verifyExtendedBatch=(batchId:string)=>call<{verifiedCount:number}>('verify-batch',{batchId});
export const publishExtendedBatch=(batchId:string,requestId:string)=>call<{publishedCount:number}>('publish-batch',{batchId,requestId});

export const createExtendedPublicationBatch=(kind:'ADMIT_CARD'|'TRAINING_SCHEDULE',scopeId:string)=>call<{batchId:string}>('create-batch',{kind,sessionId:kind==='ADMIT_CARD'?scopeId:null,cohortId:kind==='TRAINING_SCHEDULE'?scopeId:null});
export const readExtendedBatch=(batchId:string)=>call<{batch:ExtendedBatch;items:{revision_id:string;content_sha256:string}[]}>('batch-detail',{batchId});
export const selectExtendedBatchRevision=(batchId:string,revisionId:string)=>call<{revisionId:string}>('select-batch-revision',{batchId,revisionId});
export const replaceExtendedBatchRevision=(batchId:string,oldRevisionId:string,newRevisionId:string)=>call<{revisionId:string}>('replace-batch-revision',{batchId,oldRevisionId,newRevisionId});

export const recordExtendedPhysicalVerification=(applicationId:string,status:'IN_PROGRESS'|'VERIFIED'|'REJECTED',internalNote:string)=>call<{applicationId:string}>('record-physical-verification',{applicationId,status,internalNote});
export const recordExtendedTrainingAssessment=(enrollmentId:string,status:'DRAFT'|'REVIEWED'|'PUBLISHED',score:number,notes:string)=>call<{enrollmentId:string}>('record-training-assessment',{enrollmentId,status,score,notes});
export const recordExtendedPaymentReconciliation=(enrollmentId:string,purpose:string,amountMinor:number,status:'PENDING'|'UNDER_REVIEW'|'RECONCILED'|'DISPUTED',bankReferenceDigest?:string)=>call<{paymentId:string}>('record-payment-reconciliation',{enrollmentId,purpose,amountMinor,status,bankReferenceDigest});
export const recordExtendedFinalDecision=(applicationId:string,status:'SELECTED'|'NOT_SELECTED'|'ON_HOLD',reason:string)=>call<{applicationId:string}>('record-final-decision',{applicationId,status,reason});

export const publishExtendedTrainingCohort=(cohortId:string)=>call<{id:string}>('publish-training-cohort',{cohortId});
export const startExtendedTrainingCohort=(cohortId:string)=>call<{id:string}>('start-training-cohort',{cohortId});
export const confirmExtendedTrainingEnrollment=(enrollmentId:string)=>call<{id:string}>('confirm-training-enrollment',{enrollmentId});
export const activateExtendedTrainingEnrollment=(enrollmentId:string)=>call<{id:string}>('activate-training-enrollment',{enrollmentId});
export const completeExtendedTrainingEnrollment=(enrollmentId:string)=>call<{id:string}>('complete-training-enrollment',{enrollmentId});

export const previewExtendedDocumentRevision=(revisionId:string)=>call<{url:string;expiresIn:number;revision:number;renderedSha256:string;contentSha256:string}>('preview-document-revision',{revisionId});

export const readExtendedTrainingList=(cohortId:string)=>call<{enrollments:{id:string;application_id:string;state:string}[]}>('training-list',{cohortId});
export const queueExtendedTrainingEmail=(enrollmentId:string)=>call<{deliveryId:string}>('queue-training-email',{enrollmentId});

export const publishExtendedAppointment=(revisionId:string,requestId:string)=>call<{revisionId:string}>('publish-appointment',{revisionId,requestId});
export async function uploadExtendedAppointment(applicationId:string,revisionId:string,file:File){
 requireExplicitRecruitmentEnvironment(url);
 const {data:{session}}=await getSupabaseBrowserClient().auth.getSession();
 if(!session?.access_token||session.user.is_anonymous)throw new Error('ADMIN_AUTH_REQUIRED');
 const form=new FormData();form.set('file',file);
 const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicConfig.publishableKey,'x-application-id':applicationId,'x-revision-id':revisionId},body:form,cache:'no-store'});
 const payload=await r.json().catch(()=>({ok:false,code:'UPLOAD_RESPONSE_INVALID'})) as {ok:boolean;data?:{revisionId:string;sha256:string};code?:string};
 if(!r.ok||!payload.ok||!payload.data)throw new Error(payload.code||'APPOINTMENT_UPLOAD_FAILED');
 return payload.data;
}

export type ExtendedTemplate={id:string;kind:'ADMIT_CARD'|'TRAINING_SCHEDULE'|'APPOINTMENT_LETTER';template_version:number;template_spec:Record<string,unknown>;approved_by:string|null;created_at:string};
export const listExtendedTemplates=()=>call<{templates:ExtendedTemplate[]}>('template-list');
export const createExtendedTemplate=(kind:ExtendedTemplate['kind'],spec:Record<string,unknown>)=>call<{templateId:string}>('create-template-version',{kind,spec});
export const approveExtendedTemplate=(templateId:string,expectedSpec:Record<string,unknown>)=>call<{templateId:string}>('approve-template-version',{templateId,expectedSpec});
export type DocumentReviewEntry={id:string;application_id:string;status:string;satisfied_by_file_id:string|null;reviewed_at:string|null};
export const listExtendedDocumentReviews=()=>call<{requirements:DocumentReviewEntry[]}>('document-review-queue');
export const reviewExtendedCandidateDocument=(requirementId:string,status:'UNDER_REVIEW'|'VERIFIED'|'RESUBMIT_REQUIRED'|'REJECTED',reason:string,requestId:string)=>call<{requirementId:string}>('review-candidate-document',{requirementId,status,reason,requestId});
export type TrainingEmailPreview={cohort:{id:string;name:string;status:string;schedule_version:number};recipients:{enrollmentId:string;state:string;candidateId:string;verifiedEmail:boolean;email:string}[]};
export const previewExtendedTrainingEmail=(cohortId:string)=>call<TrainingEmailPreview>('training-email-preview',{cohortId});

// Delivery is separate from queueing. The server enforces approved sender, recipient and release flags.
async function trainingEmailAction(deliveryId:string,action:'send'|'reconcile'|'status'){
 const deliveryUrl=requireExplicitRecruitmentEnvironment(supabaseFunctionUrl('recruitment-extended-training-email',process.env.NEXT_PUBLIC_SUPABASE_RECRUITMENT_TRAINING_EMAIL_FUNCTION_URL));
 const {data:{session}}=await getSupabaseBrowserClient().auth.getSession();
 if(!session?.access_token||session.user.is_anonymous)throw new Error('ADMIN_AUTH_REQUIRED');
 const response=await fetch(deliveryUrl,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicConfig.publishableKey},cache:'no-store',body:JSON.stringify({deliveryId,action})});
 const body=await response.json().catch(()=>({ok:false,code:'EMAIL_RESPONSE_INVALID'})) as {ok:boolean;code?:string;data?:{deliveryId:string;state:string;attemptCount?:number;reconciliationRequired?:boolean}};
 if(!response.ok||!body.ok||!body.data)throw new Error(body.code||'EMAIL_DELIVERY_NOT_VERIFIED');
 return body.data;
}
export const sendApprovedTrainingEmail=(deliveryId:string)=>trainingEmailAction(deliveryId,'send');
export const reconcileApprovedTrainingEmail=(deliveryId:string)=>trainingEmailAction(deliveryId,'reconcile');
export const readTrainingEmailStatus=(deliveryId:string)=>trainingEmailAction(deliveryId,'status');

/** Role-gated, purpose-audited access to bank details. No client persistence. */
export async function adminRevealPaymentDetails(candidateId:string,purpose:string){
 const bankUrl=requireExplicitRecruitmentEnvironment(supabaseFunctionUrl('recruitment-bank-api',process.env.NEXT_PUBLIC_SUPABASE_RECRUITMENT_BANK_FUNCTION_URL));
 const {data:{session}}=await getSupabaseBrowserClient().auth.getSession();
 if(!session?.access_token||session.user.is_anonymous)throw new Error('ADMIN_AUTH_REQUIRED');
 const res=await fetch(bankUrl,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicConfig.publishableKey},cache:'no-store',body:JSON.stringify({action:'admin-reveal',candidateId,purpose})});
 const body=await res.json().catch(()=>({ok:false,code:'PAYMENT_DATA_UNAVAILABLE'})) as {ok:boolean;code?:string;data?:{details:{holder:string;account:string;ifsc:string}}};
 if(!res.ok||!body.ok||!body.data?.details)throw new Error(body.code||'BANK_ACCESS_DENIED');
 return body.data.details;
}

export const updateExtendedDraftTemplate=(templateId:string,expectedSpec:Record<string,unknown>,newSpec:Record<string,unknown>)=>call<{templateId:string}>('update-draft-template',{templateId,expectedSpec,newSpec});

export const previewExtendedReviewDocument=(requirementId:string,purpose:string)=>call<{url:string;expiresIn:number;mimeType:string}>('preview-review-document',{requirementId,purpose});
