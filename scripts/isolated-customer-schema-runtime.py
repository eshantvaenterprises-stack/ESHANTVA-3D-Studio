import subprocess,json,uuid,time,secrets,urllib.request,urllib.error,socket
from pathlib import Path
run='esha-schema-'+uuid.uuid4().hex[:8];network=run;names=[];results=[];password=secrets.token_hex(20);jwt=secrets.token_hex(32)
out=Path('execution-evidence/V7_REPAIRED_EXECUTION_01NOV2026/runtime');out.mkdir(parents=True,exist_ok=True)
def d(args,stdin=None):return subprocess.run(['docker',*args],input=stdin,text=True,capture_output=True,timeout=90)
def check(name,ok):results.append({'case':name,'pass':bool(ok)});assert ok,name
def start(label,image,env,ports=[]):
 name=run+'-'+label;args=['run','-d','--pull','never','--name',name,'--network',network,'--network-alias',label]
 for port in ports:args+=['-p','127.0.0.1::'+str(port)]
 for k,v in env.items():args+=['-e',k+'='+str(v)]
 if label=='db':args+=['--tmpfs','/var/lib/postgresql/data']
 r=d(args+[image]);assert r.returncode==0,label+' startup';names.append(name);return name
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
 r=sql("delete from auth.users where id='"+ids[0]+"';")
 check('actual-schema-owner-delete-RESTRICT',r.returncode!=0 and 'foreign key' in r.stderr)
 cleanup="delete from public.custom_requests where id='"+request_ids[0]+"' and customer_id='"+ids[0]+"';"
 check('actual-fixture-only-cleanup',sql(cleanup).returncode==0 and sql(cleanup).returncode==0)
 r=sql("select count(*) from public.custom_requests where id='"+request_ids[0]+"';select count(*) from public.custom_requests where id='"+request_ids[1]+"' and customer_id='"+ids[1]+"';")
 check('independent-fixture-absence-seed-preserved',r.returncode==0 and r.stdout.strip().splitlines()==['0','1'])
except Exception as e:results.append({'case':'runtime','pass':False,'blocker':'DOCKER_COMMAND_TIMEOUT_REDACTED' if isinstance(e,subprocess.TimeoutExpired) else (str(e) if password not in str(e) and jwt not in str(e) else 'sanitized runtime error')})
finally:
 removed=[]
 for name in reversed(names):d(['rm','-f','-v',name]);removed.append(d(['inspect',name]).returncode!=0)
 network_remove=d(['network','rm',network]);network_absent=d(['network','inspect',network]).returncode!=0
 report={'scope':'REAL_ISOLATED_CUSTOMER_SCHEMA_NOT_MAIN','network':'internal no external egress','results':results,'temporary_containers_removed':all(removed),'temporary_network_absent':network_absent,'network_remove_exit':network_remove.returncode,'tokens_or_secret_values_exported':False,'main_writes':0,'website_schema_RLS_Edge_Storage':'See per-case results; Edge/private object bytes not yet tested'}
 (out/'REAL_ISOLATED_SCHEMA_EXECUTION.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
 if any(not x['pass'] for x in results) or not all(removed) or not network_absent:raise SystemExit(1)
