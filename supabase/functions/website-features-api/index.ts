import { isCanonicalWebsiteOrigin } from '../_shared/canonicalOrigin.ts';
import { readWebsiteJson } from '../_shared/websiteSecurity.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { contentInput, publicContent, requestIdentity, text, uuid, version } from '../_shared/websiteContracts.ts';
const adminActions=new Set(['cms-list','cms-history','cms-save','cms-review','cms-publish','cms-unpublish','followup-create','admin-followup-list']);
const mutations=new Set(['cms-save','cms-review','cms-publish','cms-unpublish','profile-save','followup-create','followup-reply']);
function reply(origin:string|null,status:number,data:unknown){const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};if(origin)headers['Access-Control-Allow-Origin']=origin;return new Response(JSON.stringify(data),{status,headers});}
function safeFollowup(r:Record<string,unknown>){return {reference:r.public_reference,kind:r.kind,requestReference:r.request_reference,question:r.question,reply:r.reply,state:r.state,createdAt:r.created_at,repliedAt:r.replied_at};}
Deno.serve(async(req:Request)=>{
 const requestedOrigin=req.headers.get('origin');const origins=(Deno.env.get('WEBSITE_ALLOWED_ORIGINS')||Deno.env.get('ADMIN_ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean);const origin=requestedOrigin&&(origins.includes(requestedOrigin)||isCanonicalWebsiteOrigin(requestedOrigin))?requestedOrigin:null;
 if(requestedOrigin&&!origin)return reply(null,403,{ok:false,code:'ACCESS_DENIED'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...(origin?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
 if(req.method!=='POST')return reply(origin,405,{ok:false,code:'METHOD_NOT_ALLOWED'});
 if(Deno.env.get('WEBSITE_FEATURES_ENABLED')!=='true')return reply(origin,503,{ok:false,code:'FEATURE_UNAVAILABLE'});
 try{
 const body=await readWebsiteJson(req);
 if(typeof body.action!=='string')throw Error('INVALID_INPUT');
 const action=body.action;const allowed:Record<string,string[]>={
 'published-list':['kind'],'cms-list':['kind'],'cms-history':['kind','key'],
 'cms-save':['kind','key','payload','expectedRevision','requestId'],'cms-review':['kind','key','expectedRevision','requestId'],'cms-publish':['kind','key','expectedRevision','requestId'],'cms-unpublish':['kind','key','expectedRevision','requestId'],
 'profile-get':[],'profile-save':['displayName','expectedVersion','requestId'],
 'followup-list':[],'admin-followup-list':['kind','reference'],'followup-create':['kind','reference','expectedStatus','message','requestId'],'followup-reply':['followupReference','message','requestId']};
 if(!Object.hasOwn(allowed,action)||Object.keys(body).some(k=>k!=='action'&&!allowed[action].includes(k)))throw Error('INVALID_INPUT');
 const url=Deno.env.get('SUPABASE_URL')||'',pub=Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||Deno.env.get('SUPABASE_ANON_KEY')||'',secret=Deno.env.get('SUPABASE_SECRET_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(!url||!pub||!secret)return reply(origin,503,{ok:false,code:'FEATURE_UNAVAILABLE'});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 if(action==='published-list'){
  if(typeof body.kind!=='string'||!['faq','about','project'].includes(body.kind))throw Error('INVALID_INPUT');
  if(body.kind==='project'&&Deno.env.get('CMS_REAL_PORTFOLIO_ENABLED')!=='true')return reply(origin,200,{ok:true,data:[]});
  const{data:published,error}=await db.rpc('website_published_content_server',{p_kind:body.kind});if(error)throw error;
  const rows=(published||[]).map((r:Record<string,unknown>)=>{
   const parsed=contentInput(r.kind,r.content_key,r.payload);
   if(r.kind!==body.kind||!Number.isInteger(r.revision)||Number(r.revision)<1)throw Error('INVALID_INPUT');
   if(r.kind==='project'&&(!parsed.payload.realPortfolio||!parsed.payload.customerApproved||parsed.payload.isPlaceholder||!(Deno.env.get('CMS_APPROVED_PROJECT_ASSETS')||'').split(',').map(x=>x.trim()).includes(parsed.payload.image||'')))return null;
   return {kind:r.kind,key:r.content_key,revision:r.revision,payload:publicContent(parsed.payload),state:'PUBLISHED',updatedAt:r.updated_at};
  });
  return reply(origin,200,{ok:true,data:rows.filter(Boolean)});
 }
 const authorization=req.headers.get('authorization')||'';if(!/^Bearer [^\s]+$/i.test(authorization))return reply(origin,403,{ok:false,code:'ACCESS_DENIED'});const auth=createClient(url,pub,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});const{data:{user},error:authError}=await auth.auth.getUser(authorization.replace(/^Bearer\s+/i,''));
 if(authError||!user||user.is_anonymous)return reply(origin,403,{ok:false,code:'ACCESS_DENIED'});
 let role:string|null=null;
 if(adminActions.has(action)){const{data:r,error}=await db.from('admin_users').select('role').eq('user_id',user.id).eq('active',true).maybeSingle();if(error)throw error;role=r?.role||null;if(!['ADMIN','STAFF'].includes(role||''))return reply(origin,403,{ok:false,code:'ACCESS_DENIED'});if(mutations.has(action)&&role!=='ADMIN')return reply(origin,403,{ok:false,code:'ACCESS_DENIED'});}
 if(action==='profile-get'){
  const{data:p,error}=await db.from('website_customer_profiles').select('display_name,version').eq('customer_id',user.id).maybeSingle();if(error)throw error;
  return reply(origin,200,{ok:true,data:{displayName:p?.display_name||(typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:''),version:p?.version||0}});
 }
 if(action==='cms-list'||action==='cms-history'){
  if(typeof body.kind!=='string'||!['faq','about','project'].includes(body.kind))throw Error('INVALID_INPUT');
  let query=db.from('website_content_revisions').select('kind,content_key,revision,payload,state,updated_at').eq('kind',body.kind).order('revision',{ascending:false}).limit(100);
  if(action==='cms-history')query=query.eq('content_key',text(body.key,1,80));
  const{data:rows,error}=await query;if(error)throw error;
  let audit:unknown[]=[];if(action==='cms-history'){const{data:a,error:e}=await db.from('website_feature_audit').select('action,content_revision,created_at').eq('subject',body.kind+':'+body.key).order('created_at',{ascending:false}).limit(100);if(e)throw e;audit=a||[];}
  return reply(origin,200,{ok:true,data:{role,records:(rows||[]).map(r=>({kind:r.kind,key:r.content_key,revision:r.revision,payload:r.payload,state:r.state,updatedAt:r.updated_at})),audit}});
 }
 if(action==='followup-list'||action==='admin-followup-list'){
  let query=db.from('website_request_followups').select('public_reference,kind,request_reference,question,reply,state,created_at,replied_at').order('created_at',{ascending:false}).limit(50);
  if(action==='followup-list')query=query.eq('customer_id',user.id);
  else {const id=requestIdentity(body.kind,body.reference);query=query.eq('kind',id.kind).eq('request_reference',id.reference);}
  const{data:rows,error}=await query;if(error)throw error;const waiting:Record<string,string>={};
  for(const kind of ['custom','bulk']){
   const refs=(rows||[]).filter(r=>r.kind===kind&&r.state==='OPEN').map(r=>r.request_reference);
   if(!refs.length)continue;
   let statuses=db.from(kind==='custom'?'custom_requests':'bulk_requests').select('public_request_id,status').in('public_request_id',refs);
   if(action==='followup-list')statuses=statuses.eq('customer_id',user.id);
   const{data:requests,error:e}=await statuses;if(e)throw e;
   for(const row of requests||[])waiting[kind+':'+row.public_request_id]=row.status;
  }
  return reply(origin,200,{ok:true,data:(rows||[]).map(r=>safeFollowup({...r,state:r.state==='OPEN'&&waiting[r.kind+':'+r.request_reference]!== (r.kind==='custom'?'NEEDS_INFORMATION':'MORE_INFORMATION_REQUIRED')?'CLOSED':r.state}))});
 }
 const input:Record<string,unknown>={requestId:uuid(body.requestId)};
 if(action.startsWith('cms-')){
  if(typeof body.kind!=='string'||!['faq','about','project'].includes(body.kind))throw Error('INVALID_INPUT');
  const key=text(body.key,1,80);if(!/^[a-z][a-z0-9-]*$/.test(key))throw Error('INVALID_INPUT');Object.assign(input,{kind:body.kind,key,expectedRevision:version(body.expectedRevision)});
  if(action!=='cms-save'&&Number(input.expectedRevision)===0)throw Error('INVALID_INPUT');
  if(action==='cms-save')Object.assign(input,contentInput(body.kind,key,body.payload));
  if(action==='cms-publish'){
   if(Deno.env.get('CMS_PUBLICATION_ENABLED')!=='true')return reply(origin,503,{ok:false,code:'PUBLICATION_DISABLED'});
   if(body.kind==='project'){
    if(Deno.env.get('CMS_REAL_PORTFOLIO_ENABLED')!=='true')return reply(origin,503,{ok:false,code:'PUBLICATION_DISABLED'});
    const{data:revision,error}=await db.from('website_content_revisions').select('payload').eq('kind','project').eq('content_key',key).eq('revision',input.expectedRevision).maybeSingle();if(error)throw error;
    const approved=(Deno.env.get('CMS_APPROVED_PROJECT_ASSETS')||'').split(',').map(x=>x.trim());
    if(!revision)return reply(origin,404,{ok:false,code:'NOT_FOUND'});
    const payload=contentInput('project',key,revision.payload).payload;
    if(!approved.includes(payload.image||'')||!payload.realPortfolio||!payload.customerApproved||payload.isPlaceholder)return reply(origin,403,{ok:false,code:'PUBLICATION_DENIED'});
   }
  }
 }else if(action==='profile-save')Object.assign(input,{displayName:text(body.displayName,1,100),expectedVersion:version(body.expectedVersion)});
 else if(action==='followup-create'){const id=requestIdentity(body.kind,body.reference);const expectedStatus=text(body.expectedStatus,1,40);if(!['UNDER_REVIEW',id.kind==='custom'?'NEEDS_INFORMATION':'MORE_INFORMATION_REQUIRED'].includes(expectedStatus))throw Error('STATE_CONFLICT');if(body.message!==undefined&&typeof body.message!=='string')throw Error('INVALID_INPUT');const question=typeof body.message==='string'?body.message.trim():'';Object.assign(input,{...id,expectedStatus,message:question?text(question,3,2000):'Please provide the additional information needed to review this request.'});}
 else if(action==='followup-reply')Object.assign(input,{followupReference:uuid(body.followupReference),message:text(body.message,1,4000)});
 else throw Error('INVALID_INPUT');
 const{data:result,error}=await db.rpc('website_features_mutate_server',{p_actor:user.id,p_action:action,p_input:input});if(error)throw error;
 return reply(origin,200,{ok:true,data:result});
 }catch(error){const message=error instanceof Error?error.message:typeof error==='object'&&error!==null&&'message'in error?String(error.message):'';const code=['INVALID_INPUT','ACCESS_DENIED','STATE_CONFLICT','IDEMPOTENCY_CONFLICT','NOT_FOUND','PUBLICATION_DENIED'].find(x=>message.includes(x))||'FEATURE_UNAVAILABLE';const status=code==='INVALID_INPUT'?422:code==='ACCESS_DENIED'||code==='PUBLICATION_DENIED'?403:code==='NOT_FOUND'?404:code.includes('CONFLICT')?409:503;return reply(origin,status,{ok:false,code});}
});
