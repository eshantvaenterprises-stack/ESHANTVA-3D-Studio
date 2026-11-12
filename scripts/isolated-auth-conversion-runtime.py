import subprocess,json,uuid,time,secrets,urllib.request,urllib.error,socket
from pathlib import Path
run='esha-convert-'+uuid.uuid4().hex[:8];network=run;names=[];results=[];password=secrets.token_hex(20);jwt=secrets.token_hex(32)
out=Path('execution-evidence/V7_POST_CHAT_01NOV2026/g3');out.mkdir(parents=True,exist_ok=True)
def d(args,stdin=None):return subprocess.run(['docker',*args],input=stdin,text=True,capture_output=True,timeout=90)
def check(name,ok):results.append({'case':name,'pass':bool(ok),'status':globals().pop('last_status',None)});assert ok,name
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
def req(url,data=None,token=None,method=None):
 args=['exec',run+'-db','curl','-sS','--max-time','10','-w','\n%{http_code}','-H','Content-Type: application/json']
 if token:args+=['-H','Authorization: Bearer '+token]
 if method:args+=['-X',method]
 if data is not None:args+=['--data',json.dumps(data)]
 r=d(args+[url]);text,_,status=r.stdout.rpartition('\n');code=int(status) if status.isdigit() else 0
 try:body=json.loads(text)
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
 auth=start('auth','public.ecr.aws/supabase/gotrue:v2.197.0',{'GOTRUE_API_HOST':'0.0.0.0','GOTRUE_API_PORT':'9999','API_EXTERNAL_URL':'http://localhost:9999','GOTRUE_DB_DRIVER':'postgres','GOTRUE_DB_DATABASE_URL':'postgres://supabase_auth_admin:'+password+'@db:5432/postgres','GOTRUE_SITE_URL':'http://localhost:3000','GOTRUE_JWT_SECRET':jwt,'GOTRUE_JWT_EXP':'3600','GOTRUE_JWT_AUD':'authenticated','GOTRUE_JWT_DEFAULT_GROUP_NAME':'authenticated','GOTRUE_JWT_ADMIN_ROLES':'service_role','GOTRUE_EXTERNAL_EMAIL_ENABLED':'true','GOTRUE_MAILER_AUTOCONFIRM':'false','GOTRUE_SECURITY_MANUAL_LINKING_ENABLED':'true','GOTRUE_SMTP_HOST':'mail','GOTRUE_SMTP_PORT':'1025','GOTRUE_SMTP_ADMIN_EMAIL':'synthetic@example.invalid','GOTRUE_SMTP_SENDER_NAME':'Isolated synthetic test','GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED':'true'},[9999])
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
 # Anonymous linking with real email confirmation enabled.
 code,g=req(base+'/signup',{});check('real-anonymous-created',code==200 and g['user']['is_anonymous'])
 uid=g['user']['id'];email='convert-'+run+'@example.invalid';pw=secrets.token_hex(16)
 code,u=req(base+'/user',{'email':email},g['access_token'],'PUT');check('email-link-request-preserves-user',code==200 and u['id']==uid)
 code,u=req(base+'/user',token=g['access_token']);check('still-anonymous-before-verification',code==200 and u['is_anonymous'])
 mb='http://mail:8025';messages=[]
 for i in range(15):
  code,m=req(mb+'/api/v1/messages');messages=m.get('messages',[])
  if messages:break
  time.sleep(1)
 check('verification-email-captured',bool(messages))
 import re,html
 code,msg=req(mb+'/api/v1/message/'+messages[0]['ID']);text=html.unescape(str(msg.get('HTML',''))+' '+str(msg.get('Text','')))
 token=re.search(r'[?&]token=([^&\s"<>]+)',text)
 check('verification-token-present-in-memory-only',bool(token))
 code,v=req(base+'/verify',{'token_hash':token.group(1),'type':'email_change'});check('email-verification-preserves-identity',code==200 and v['user']['id']==uid and not v['user']['is_anonymous'])
 code,u=req(base+'/user',{'password':pw},v['access_token'],'PUT');check('password-set-only-after-conversion',code==200 and u['id']==uid)
 code,session=req(base+'/token?grant_type=password',{'email':email,'password':pw});check('converted-password-login-same-identity',code==200 and session['user']['id']==uid)
 code,_=req(base+'/recover',{'email':email});check('recovery-dispatched-for-converted-user',code==200)
 recovery=None
 for i in range(15):
  code,m=req(mb+'/api/v1/messages')
  for item in m.get('messages',[]):
   code,detail=req(mb+'/api/v1/message/'+item['ID']);t=html.unescape(str(detail.get('HTML',''))+' '+str(detail.get('Text','')))
   if 'type=recovery' in t:recovery=re.search(r'[?&]token=([^&\s"<>]+)',t);break
  if recovery:break
  time.sleep(1)
 check('recovery-email-token-captured',bool(recovery))
 code,v=req(base+'/verify',{'token_hash':recovery.group(1),'type':'recovery'});check('recovery-verification-same-user',code==200 and v['user']['id']==uid)
 code,u=req(base+'/user',{'password':pw+'9'},v['access_token'],'PUT');check('recovered-password-update-same-user',code==200 and u['id']==uid)
 code,u=req(base+'/token?grant_type=password',{'email':email,'password':pw+'9'});check('recovered-password-signin',code==200 and u['user']['id']==uid)

except Exception as e:results.append({'case':'runtime','pass':False,'blocker':'DOCKER_COMMAND_TIMEOUT_REDACTED' if isinstance(e,subprocess.TimeoutExpired) else (str(e) if password not in str(e) and jwt not in str(e) else 'sanitized runtime error')})
finally:
 removed=[]
 for name in reversed(names):d(['rm','-f','-v',name]);removed.append(d(['inspect',name]).returncode!=0)
 network_remove=d(['network','rm',network]);network_absent=d(['network','inspect',network]).returncode!=0
 report={'scope':'REAL_ISOLATED_AUTH_CONVERSION_RECOVERY_NOT_MAIN','network':'internal no external egress','results':results,'temporary_containers_removed':all(removed),'temporary_network_absent':network_absent,'network_remove_exit':network_remove.returncode,'tokens_or_secret_values_exported':False,'main_writes':0,'guest_record_transfer':'NOT_TESTED_BY_THIS_AUTH_SUBSET'}
 (out/'AUTH_CONVERSION_EXECUTION.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
 if any(not x['pass'] for x in results) or not all(removed) or not network_absent:raise SystemExit(1)
