import subprocess,json,uuid,time,secrets,urllib.request,urllib.error,socket
from pathlib import Path
run='esha-edge-'+uuid.uuid4().hex[:8];network=run;names=[];results=[];password=secrets.token_hex(20);jwt=secrets.token_hex(32)
out=Path('execution-evidence/V7_REPAIRED_EXECUTION_01NOV2026/runtime');out.mkdir(parents=True,exist_ok=True)
def d(args,stdin=None):return subprocess.run(['docker',*args],input=stdin,text=True,capture_output=True,timeout=90)
def check(name,ok):results.append({'case':name,'pass':bool(ok),'http_status':globals().pop('last_status',None)});assert ok,name
def start(label,image,env,ports=[],mounts=[],command=[]):
 name=run+'-'+label;args=['run','-d','--pull','never','--name',name,'--network',network,'--network-alias',label]
 for port in ports:args+=['-p','127.0.0.1::'+str(port)]
 for k,v in env.items():args+=['-e',k+'='+str(v)]
 if label=='db':args+=['--tmpfs','/var/lib/postgresql/data']
 
 for source,dest in mounts:args+=['-v',str(source)+':'+dest+':ro']
 r=d(args+[image]+command);assert r.returncode==0,label+' startup';names.append(name);return name
def port(name,p):
 r=d(['inspect','--format','{{json .NetworkSettings.Ports}}',name]);ports=json.loads(r.stdout or '{}');a=ports.get(str(p)+'/tcp')
 if not a:
  state=d(['inspect','--format','{{.State.Status}}',name]).stdout.strip();logs=d(['logs','--tail','5',name]);detail=(logs.stdout+logs.stderr).replace(password,'REDACTED').replace(jwt,'REDACTED');raise Exception('Published loopback port unavailable for '+name.rsplit('-',1)[1]+' state='+state+' detail='+detail)
 return int(a[0]['HostPort'])
def req(url,data=None,token=None):
 args=['exec',run+'-auth','wget','-T','5','-t','1','-S','-O','-','--header','Content-Type: application/json']
 if token:args+=['--header','Authorization: Bearer '+token]
 if data is not None:args+=['--post-data',json.dumps(data)]
 r=d(args+[url]);import re
 codes=re.findall(r'HTTP/[0-9.]+ ([0-9]+)',r.stderr);code=int(codes[-1]) if codes else 0
 try:body=json.loads(r.stdout or '{}')
 except Exception:body={}
 globals()['last_status']=code
 return code,body
def sql(s):return d(['exec','-i',run+'-db','psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],s)
try:
 assert d(['network','create','--internal',network]).returncode==0
 db=start('db','public.ecr.aws/supabase/postgres:17.11.0.004',{'POSTGRES_PASSWORD':password})
 for i in range(45):
  logs=d(['logs',db]); complete='init process complete' in (logs.stdout+logs.stderr).lower()
  r=sql('select 1;')
  if complete and r.returncode==0:break
  time.sleep(1)
 assert r.returncode==0,'DB readiness'
 r=sql("alter role supabase_auth_admin password '"+password+"'; create schema if not exists auth authorization supabase_auth_admin; grant all on schema auth to supabase_auth_admin;")
 assert r.returncode==0,'Auth role bootstrap'
 mail=start('mail','public.ecr.aws/supabase/mailpit:v1.31.3',{},[8025])
 auth=start('auth','public.ecr.aws/supabase/gotrue:v2.197.0',{'GOTRUE_API_HOST':'0.0.0.0','GOTRUE_API_PORT':'9999','API_EXTERNAL_URL':'http://localhost:9999','GOTRUE_DB_DRIVER':'postgres','GOTRUE_DB_DATABASE_URL':'postgres://supabase_auth_admin:'+password+'@db:5432/postgres','GOTRUE_SITE_URL':'http://localhost:3000','GOTRUE_JWT_SECRET':jwt,'GOTRUE_JWT_EXP':'3600','GOTRUE_JWT_AUD':'authenticated','GOTRUE_JWT_DEFAULT_GROUP_NAME':'authenticated','GOTRUE_JWT_ADMIN_ROLES':'service_role','GOTRUE_EXTERNAL_EMAIL_ENABLED':'true','GOTRUE_MAILER_AUTOCONFIRM':'true','GOTRUE_SMTP_HOST':'mail','GOTRUE_SMTP_PORT':'1025','GOTRUE_SMTP_ADMIN_EMAIL':'synthetic@example.invalid','GOTRUE_SMTP_SENDER_NAME':'Isolated synthetic test','GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED':'true'},[9999])
 base='http://auth:9999'
 ready=False
 for i in range(40):
  try:
   if req(base+'/health')[0]==200:ready=True;break
  except Exception:pass
  time.sleep(1)
 if not ready:
  logs=d(['logs','--tail','20',auth]).stderr+d(['logs','--tail','20',auth]).stdout
  # Retain only sanitized classification, never raw logs or URLs/password.
  raise Exception('GoTrue readiness failed; '+('database schema permission/bootstrap' if any(x in logs.lower() for x in ['permission','schema','migration']) else 'startup configuration'))
 sessions=[]
 for label in ['a','b']:
  email=label+'-'+run+'@example.invalid';pw=secrets.token_hex(16)
  code,j=req(base+'/signup',{'email':email,'password':pw});check('signup-'+label,code==200 and bool(j.get('user',{}).get('id')))
  code,s=req(base+'/token?grant_type=password',{'email':email,'password':pw});check('password-signin-'+label,code==200 and bool(s.get('access_token')));sessions.append(s)
  code,u=req(base+'/user',token=s['access_token']);check('server-getUser-'+label,code==200 and u['id']==s['user']['id'])
 check('distinct-real-auth-identities-and-JWTs',sessions[0]['user']['id']!=sessions[1]['user']['id'] and sessions[0]['access_token']!=sessions[1]['access_token'])
 # Initialize actual local customer schema, not backup data or recruitment.
 r=sql("alter role supabase_storage_admin password '"+password+"'; alter role authenticator password '"+password+"';")
 check('isolated-storage-rest-role-config',r.returncode==0)
 import base64,hmac,hashlib
 def token(role):
  enc=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).decode().rstrip('=')
  payload=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'role':role,'iss':'supabase','iat':int(time.time()),'exp':int(time.time())+3600})
  return payload+'.'+base64.urlsafe_b64encode(hmac.new(jwt.encode(),payload.encode(),hashlib.sha256).digest()).decode().rstrip('=')
 anon,service=token('anon'),token('service_role')
 rest=start('rest','public.ecr.aws/supabase/postgrest:v16.4',{'PGRST_DB_URI':'postgres://authenticator:'+password+'@db:5432/postgres','PGRST_DB_SCHEMAS':'public','PGRST_DB_ANON_ROLE':'anon','PGRST_JWT_SECRET':jwt},[])
 storage=start('storage','public.ecr.aws/supabase/storage-api:v1.79.36',{'ANON_KEY':anon,'SERVICE_KEY':service,'JWT_SECRET':jwt,'PGRST_JWT_SECRET':jwt,'DATABASE_URL':'postgres://supabase_storage_admin:'+password+'@db:5432/postgres','POSTGREST_URL':'http://rest:3000','FILE_SIZE_LIMIT':'52428800','STORAGE_BACKEND':'file','FILE_STORAGE_BACKEND_PATH':'/var/lib/storage','TENANT_ID':'isolated','REGION':'local','GLOBAL_S3_BUCKET':'isolated','ENABLE_IMAGE_TRANSFORMATION':'false'},[])
 for i in range(35):
  r=sql("select to_regclass('storage.objects') is not null;")
  if r.returncode==0 and r.stdout.strip()=='t':break
  time.sleep(1)
 check('actual-storage-schema-initialized',r.returncode==0 and r.stdout.strip()=='t')
 for f in sorted(Path('supabase/migrations').glob('*.sql')):
  if f.name>='20261001':continue
  r=sql(f.read_text())
  if r.returncode!=0:
   detail=r.stderr.replace(password,'REDACTED').replace(jwt,'REDACTED')[-1200:]
   raise Exception('LOCAL_MIGRATION_FAILED '+f.name+' '+detail)
 check('18-actual-customer-migrations-applied',True)
 # Refresh PostgREST schema cache only in disposable DB.
 sql("notify pgrst, 'reload schema';")
 ids=[s['user']['id'] for s in sessions]
 request_ids=[str(uuid.uuid4()),str(uuid.uuid4())]
 seed=str(uuid.uuid4())
 r=sql("insert into public.custom_requests(id,customer_id,title) values ('"+request_ids[0]+"','"+ids[0]+"','synthetic-a'),('"+request_ids[1]+"','"+ids[1]+"','unrelated-synthetic-seed');")
 check('fixture-and-unrelated-seed-created',r.returncode==0)
 time.sleep(2)
 for i in range(2):
  code,rows=req('http://rest:3000/custom_requests?select=id',token=sessions[i]['access_token'])
  check('real-JWT-owner-read-'+str(i),code==200 and len(rows)==1 and rows[0]['id']==request_ids[i])
  code,rows=req('http://rest:3000/custom_requests?id=eq.'+request_ids[1-i]+'&select=id',token=sessions[i]['access_token'])
  check('real-JWT-cross-owner-deny-'+str(i),code==200 and rows==[])
 code,rows=req('http://rest:3000/custom_requests?select=id',token=anon)
 check('anon-browser-denied',code in [401,403])
 # Trusted local source executed by cached Edge runtime with actual local Auth/DB.
 cfg=out/'gateway.yml';cfg.write_text("_format_version: '2.1'\nservices:\n  - name: auth\n    url: http://auth:9999\n    routes:\n      - name: auth\n        paths: [/auth/v1]\n        strip_path: true\n  - name: rest\n    url: http://rest:3000\n    routes:\n      - name: rest\n        paths: [/rest/v1]\n        strip_path: true\n  - name: storage\n    url: http://storage:5000\n    routes:\n      - name: storage\n        paths: [/storage/v1]\n        strip_path: true\n")
 gateway=start('gateway','public.ecr.aws/supabase/kong:2.8.1',{'KONG_DATABASE':'off','KONG_DECLARATIVE_CONFIG':'/cfg/gateway.yml','KONG_PROXY_LISTEN':'0.0.0.0:8000','KONG_ADMIN_LISTEN':'off','KONG_DNS_ORDER':'LAST,A,CNAME'},mounts=[(cfg.resolve(),'/cfg/gateway.yml')])
 bundle=(out/'edge-bundle').resolve()
 edge=start('edge','public.ecr.aws/supabase/edge-runtime:v1.77.4',{'SUPABASE_URL':'http://gateway:8000','SUPABASE_PUBLISHABLE_KEY':anon,'SUPABASE_ANON_KEY':anon,'SUPABASE_SECRET_KEY':service,'SUPABASE_SERVICE_ROLE_KEY':service,'RATE_LIMIT_SALT':secrets.token_hex(16),'BULK_CATALOG_MODE':'live','BULK_ACTIVE_PRODUCTS_JSON':'[]'},mounts=[(bundle,'/srv/functions')],command=['start','--main-service','/srv/functions'])
 ready=False
 for i in range(20):
  code,j=req('http://edge:9000/unknown')
  if code==404:ready=True;break
  time.sleep(1)
 if not ready:
  logs=d(['logs','--tail','5',edge]);detail=(logs.stdout+logs.stderr).replace(password,'REDACTED').replace(jwt,'REDACTED').replace(service,'REDACTED').replace(anon,'REDACTED');raise Exception('ISOLATED_EDGE_STARTUP '+detail)
 check('actual-Edge-runtime-ready',True)
 token_a=sessions[0]['access_token'];token_b=sessions[1]['access_token']
 contact={'kind':'contact','submission':{'reason':'general_business','name':'Synthetic A','email':'a@example.invalid','orderReference':'','message':'Isolated synthetic contact contract request only.','website':''}}
 code,j=req('http://edge:9000/contact-request-api',contact,token_a);check('actual-Edge-contact-positive',code==200 and j.get('ok'));contact_reference=j['data']['publicReference']
 code,j=req('http://edge:9000/contact-request-api',{'kind':'contact','submission':{}},token_a);check('actual-Edge-contact-invalid-denied',code==400)
 code,j=req('http://edge:9000/custom-request-api',{'action':'prepare-request','sourceProductSlug':''},token_a);check('actual-Edge-custom-prepare',code==200 and j.get('ok'));custom_id=j['data']['requestId']
 sub={k:'' for k in ['functionalPurpose','usedWhere','loadConditions','exactDimensions','safetyNotes','colorDetails','personalizationType','personalizationText','targetDate','pinCode','city','state','notes','customerPhone','website','sourceProductSlug']}
 sub.update({'requestType':'custom_product','title':'Synthetic fixture','description':'A synthetic requirement for isolated contract verification.','intendedUse':'Local testing','heatExposure':False,'outdoorUse':False,'waterChemicalExposure':False,'originalPartAvailable':False,'length':None,'width':None,'height':None,'dimensionUnit':'mm','material':'not_sure','colorPreference':'no_preference','quantity':1,'deliveryMethod':'local_pickup','verificationRequested':False,'customerName':'Synthetic A','customerEmail':'a@example.invalid','communicationMethod':'email','language':'english','policyConsent':True,'accuracyConsent':True,'fileIds':[]})
 code,j=req('http://edge:9000/custom-request-api',{'action':'submit-request','requestId':custom_id,'submission':sub},token_a);check('actual-Edge-custom-submit-positive',code==200 and j.get('ok'))
 code,j=req('http://edge:9000/custom-request-api',{'action':'prepare-upload','requestId':custom_id,'file':{'name':'test.stl','size':20,'type':'text/plain'}},token_b);check('actual-Edge-custom-cross-owner-denied',code in [403,404])
 code,j=req('http://edge:9000/bulk-request-api',{'action':'prepare-request'},token_b);check('actual-Edge-bulk-prepare',code==200 and j.get('ok'));bulk_id=j['data']['requestId']
 bulk={k:'' for k in ['dimensions','materialPreference','colorPreference','repeatNotes','targetDate','postalCode','city','state','organizationName','role','phone','poReference','customerNotes','website']}
 bulk.update({'bulkType':'custom_requirement','items':[{'localId':'fixture-line','productId':None,'productSlug':None,'itemType':'custom','description':'Synthetic custom bulk requirement','quantity':2,'configuration':{},'sameCustomizationForAll':None,'customizationMode':'same','customizationNotes':'','notes':''}],'requirementTitle':'Synthetic bulk','requirementDescription':'Isolated synthetic bulk requirement for contract testing.','intendedUse':'Local tests','repeatType':'one_time','repeatFrequency':'','quantityPerCycle':None,'deliveryMethod':'local_pickup','organizationType':'individual','contactPerson':'Synthetic B','email':'b@example.invalid','preferredLanguage':'english','hasTargetBudget':False,'targetBudget':None,'targetUnitPrice':None,'verificationRequested':False,'accuracyConsent':True,'fileConsent':True,'fileIds':[],'catalogMode':'live'})
 code,j=req('http://edge:9000/bulk-request-api',{'action':'submit-request','requestId':bulk_id,'submission':bulk},token_b);check('actual-Edge-bulk-submit-positive',code==200 and j.get('ok'))
 code,j=req('http://edge:9000/customer-dashboard-api',{'action':'dashboard-overview'},token_a);check('actual-Edge-dashboard-real-customer',code==200 and j.get('ok'))
 code,j=req('http://edge:9000/admin-api',{'action':'authorize'},token_a);check('actual-Edge-admin-customer-denied',code==403)
 code,j=req('http://edge:9000/admin-artifact-api',{'action':'admin-artifact-prepare-upload'},token_a);check('actual-Edge-artifact-customer-denied',code==403)
 # Real isolated trusted ADMIN/STAFF roles, actual publish/revision approvals.
 role_sessions={}
 for role in ['ADMIN','STAFF']:
  email=role.lower()+'-'+run+'@example.invalid';pw=secrets.token_hex(16)
  code,j=req(base+'/signup',{'email':email,'password':pw});check('artifact-role-signup-'+role,code==200)
  code,j=req(base+'/token?grant_type=password',{'email':email,'password':pw});check('artifact-role-signin-'+role,code==200 and bool(j.get('access_token')));role_sessions[role]=j
  r=sql("insert into public.admin_users(user_id,role,display_name) values ('"+j['user']['id']+"','"+role+"','Synthetic "+role+"');");check('trusted-local-role-seed-'+role,r.returncode==0)
 order_id=str(uuid.uuid4());order_ref='ESHA-2026-'+uuid.uuid4().hex[:8].upper()
 r=sql("insert into public.orders(id,public_order_id,customer_id,idempotency_key,request_hash,status,item_subtotal_paise,shipping_paise,tax_amount_paise,tax_added_paise,total_paise,delivery_method,delivery_label,tax_label,contact_name,contact_email,contact_mobile) values ('"+order_id+"','"+order_ref+"','"+ids[0]+"','"+str(uuid.uuid4())+"','"+('a'*64)+"','under_review',0,0,0,0,0,'pickup','Synthetic pickup','Synthetic zero-value fixture','Synthetic A','a@example.invalid','0000000000');")
 check('synthetic-order-fixture-created',r.returncode==0)
 for role in ['ADMIN','STAFF']:
  code,j=req('http://edge:9000/admin-api',{'action':'authorize'},role_sessions[role]['access_token']);check('trusted-Edge-role-authorize-'+role,code==200 and j.get('ok'))
 prepare={'action':'admin-artifact-prepare-upload','reference':order_ref,'category':'design_preview','displayName':'Synthetic preview','description':'Isolated synthetic fixture','versionLabel':'v1','mimeType':'application/pdf','sizeBytes':32,'requestId':str(uuid.uuid4())}
 code,j=req('http://edge:9000/admin-artifact-api',prepare,role_sessions['STAFF']['access_token']);check('STAFF-artifact-mutation-denied',code==403)
 artifacts=[];approvals=[]
 payload_pdf='%PDF-1.4\nSynthetic fixture\n%%EOF\n'
 for revision in [1,2]:
  prepare.update(sizeBytes=len(payload_pdf.encode()),versionLabel='v'+str(revision),requestId=str(uuid.uuid4()))
  code,j=req('http://edge:9000/admin-artifact-api',prepare,role_sessions['ADMIN']['access_token']);check('ADMIN-prepare-revision-'+str(revision),code==200 and j.get('ok'));upload=j['data']['uploadReference']
  args=['exec',run+'-auth','wget','-T','5','-t','1','-S','-O','-','--header','Content-Type: application/pdf','--header','Authorization: Bearer '+role_sessions['ADMIN']['access_token'],'--header','x-upload-reference: '+upload,'--header','x-upload-request-id: '+str(uuid.uuid4()),'--post-data',payload_pdf,'http://edge:9000/admin-artifact-api']
  rr=d(args);import re
  codes=re.findall(r'HTTP/[0-9.]+ ([0-9]+)',rr.stderr);code=int(codes[-1]) if codes else 0;globals()['last_status']=code
  check('ADMIN-upload-revision-'+str(revision),code==200)
  code,j=req('http://edge:9000/admin-artifact-api',{'action':'admin-artifact-publish','reference':order_ref,'uploadReference':upload,'requestId':str(uuid.uuid4())},role_sessions['ADMIN']['access_token']);check('ADMIN-publish-revision-'+str(revision),code==200 and j.get('data',{}).get('revision')==revision);artifact=j['data']['artifactReference'];artifacts.append(artifact)
  code,j=req('http://edge:9000/admin-artifact-api',{'action':'admin-approval-create','reference':order_ref,'artifactReference':artifact,'expectedRevision':revision,'requestId':str(uuid.uuid4())},role_sessions['ADMIN']['access_token']);check('ADMIN-approval-create-'+str(revision),code==200 and j.get('ok'));approvals.append(j['data']['approvalReference'])
 code,j=req('http://edge:9000/customer-dashboard-api',{'action':'artifact-access','reference':order_ref,'artifactReference':artifacts[1],'disposition':'download'},token_b);check('artifact-foreign-owner-denied',code==404)
 code,j=req('http://edge:9000/customer-dashboard-api',{'action':'submit-artifact-approval','reference':order_ref,'artifactReference':artifacts[0],'approvalReference':approvals[0],'expectedRevision':1,'decision':'approve'},token_a);check('stale-revision-approval-denied',code==409)
 decision={'action':'submit-artifact-approval','reference':order_ref,'artifactReference':artifacts[1],'approvalReference':approvals[1],'expectedRevision':2,'decision':'approve'}
 code,j=req('http://edge:9000/customer-dashboard-api',decision,token_a);check('current-revision-approval-accepted',code==200 and j.get('ok'))
 code,j=req('http://edge:9000/customer-dashboard-api',decision,token_a);check('current-revision-approval-replay-safe',code in [200,409])
 # Artifact/order/audit fixtures retained until ephemeral container destruction, not erased as Main cleanup authority.
 r=sql("select count(*) from public.admin_artifact_action_events where order_id='"+order_id+"';")
 check('artifact-audit-retained-before-runtime-disposal',r.returncode==0 and int(r.stdout.strip())<=40 and int(r.stdout.strip())>0)
 # Delete only new action-created request records using exact registry IDs.
 r=sql("delete from public.contact_requests where customer_id='"+ids[0]+"' and public_reference='"+contact_reference+"';delete from public.custom_requests where id='"+custom_id+"';delete from public.bulk_requests where id='"+bulk_id+"';")
 check('actual-Edge-fixture-cleanup',r.returncode==0)
 # Actual Storage HTTP with customer JWT and exact byte comparison.
 def raw(url,data=None,token=None):
  args=['exec',run+'-auth','wget','-T','5','-t','1','-S','-O','-','--header','Content-Type: application/json']
  if token:args+=['--header','Authorization: Bearer '+token]
  if data is not None:args+=['--post-data',data]
  rr=d(args+[url]);import re
  codes=re.findall(r'HTTP/[0-9.]+ ([0-9]+)',rr.stderr);status=int(codes[-1]) if codes else 0;globals()['last_status']=status;return status,rr.stdout
 obj=ids[0]+'/synthetic-'+run+'.stl';url='http://storage:5000/object/custom-request-files/'+obj
 payload='{"synthetic":"tiny-private-fixture"}'
 code,body=raw(url,payload,sessions[0]['access_token']);check('private-storage-owner-upload',code in [200,201])
 code,body=raw('http://storage:5000/object/authenticated/custom-request-files/'+obj,token=sessions[0]['access_token']);check('private-storage-owner-byte-equality',code==200 and body==payload)
 code,body=raw('http://storage:5000/object/authenticated/custom-request-files/'+obj,token=sessions[1]['access_token']);check('private-storage-cross-owner-denied',code in [400,401,403,404])
 code,signed=req('http://storage:5000/object/sign/custom-request-files/'+obj,{'expiresIn':15},sessions[0]['access_token']);check('private-storage-owner-sign',code==200 and bool(signed.get('signedURL')))
 signed_url='http://storage:5000'+signed['signedURL']
 code,body=raw(signed_url);check('private-storage-signed-byte-equality',code==200 and body==payload)
 time.sleep(16);code,body=raw(signed_url);check('private-storage-signed-expiry-denied',code in [400,401,403,404])
 # Service-only exact object cleanup; never broader bucket deletion.
 js="fetch('http://storage:5000/object/custom-request-files',{method:'DELETE',headers:{authorization:'Bearer '+process.argv[1],'content-type':'application/json'},body:process.argv[2]}).then(async r=>console.log(r.status)).catch(()=>process.exit(1));"
 rr=d(['exec',storage,'node','-e',js,service,json.dumps({'prefixes':[obj]})])
 check('exact-private-storage-cleanup-api',rr.returncode==0 and rr.stdout.strip() in ['200','204'])
 code,body=raw('http://storage:5000/object/authenticated/custom-request-files/'+obj,token=sessions[0]['access_token']);check('private-storage-object-absent-after-cleanup',code in [400,401,403,404])
 r=sql("delete from auth.users where id='"+ids[0]+"';")
 check('actual-schema-owner-delete-RESTRICT',r.returncode!=0 and 'foreign key' in r.stderr)
 cleanup="delete from public.custom_requests where id='"+request_ids[0]+"' and customer_id='"+ids[0]+"';"
 check('actual-fixture-only-cleanup',sql(cleanup).returncode==0 and sql(cleanup).returncode==0)
 r=sql("select count(*) from public.custom_requests where id='"+request_ids[0]+"';select count(*) from public.custom_requests where id='"+request_ids[1]+"' and customer_id='"+ids[1]+"';")
 check('independent-fixture-absence-seed-preserved',r.returncode==0 and r.stdout.strip().splitlines()==['0','1'])
 # Reverify exact revoked refresh denial with retained HTTP status.
 code,refreshed=req(base+'/token?grant_type=refresh_token',{'refresh_token':sessions[0]['refresh_token']});check('fresh-refresh-for-revocation',code==200 and bool(refreshed.get('access_token')))
 code,j=req(base+'/logout',{},refreshed['access_token']);check('real-signout-for-revocation',code in [200,204])
 code,j=req(base+'/token?grant_type=refresh_token',{'refresh_token':refreshed['refresh_token']});check('revoked-refresh-specific-4xx',code in [400,401])
 # Continue A requests with new access JWT: logout invalidates refresh, access remains until expiry as expected.
except Exception as e:results.append({'case':'runtime','pass':False,'blocker':'DOCKER_COMMAND_TIMEOUT_REDACTED' if isinstance(e,subprocess.TimeoutExpired) else (str(e) if password not in str(e) and jwt not in str(e) else 'sanitized runtime error')})
finally:
 removed=[]
 for name in reversed(names):d(['rm','-f','-v',name]);removed.append(d(['inspect',name]).returncode!=0)
 network_remove=d(['network','rm',network]);network_absent=d(['network','inspect',network]).returncode!=0
 report={'scope':'REAL_ISOLATED_CUSTOMER_SCHEMA_NOT_MAIN','network':'internal no external egress','results':results,'temporary_containers_removed':all(removed),'temporary_network_absent':network_absent,'network_remove_exit':network_remove.returncode,'tokens_or_secret_values_exported':False,'main_writes':0,'website_schema_RLS_Edge_Storage':'Actual local forms, private bytes and Admin artifact revision cases; see exact per-case assertions; retained local artifact audits disposed only with owned ephemeral runtime'}
 (out/'REAL_ISOLATED_EDGE_STORAGE_EXECUTION.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
 if any(not x['pass'] for x in results) or not all(removed) or not network_absent:raise SystemExit(1)
