import subprocess,json,uuid,time,secrets
from pathlib import Path
name='eshantva-fk-'+uuid.uuid4().hex[:10]
out=Path('execution-evidence/V7_REPAIRED_EXECUTION_01NOV2026/runtime');out.mkdir(parents=True,exist_ok=True)
results=[]
def docker(args,stdin=None):return subprocess.run(['docker',*args],input=stdin,text=True,capture_output=True,timeout=90)
def sql(s):return docker(['exec','-i',name,'psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],s)
try:
 r=docker(['run','-d','--pull','never','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_PASSWORD='+secrets.token_hex(20),'public.ecr.aws/supabase/postgres:17.11.0.004']);assert r.returncode==0,'container start failed'
 for i in range(40):
  r=sql('select 1;')
  if r.returncode==0:break
  time.sleep(1)
 assert r.returncode==0,'local DB bootstrap unavailable'
 # Isolated synthetic fixture domain with real RESTRICT, audit retention and unaffected seed.
 r=sql("create schema fixture_test; create table fixture_test.owners(id uuid primary key, tag text); create table fixture_test.requests(id uuid primary key, owner_id uuid references fixture_test.owners(id) on delete restrict); create table fixture_test.audit(id uuid primary key, request_id uuid references fixture_test.requests(id) on delete restrict, retained boolean not null); insert into fixture_test.owners values ('00000000-0000-4000-8000-000000000001','existing-seed'),('00000000-0000-4000-8000-000000000002','synthetic'); insert into fixture_test.requests values ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002'); insert into fixture_test.audit values ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000003',true);")
 assert r.returncode==0,'fixture DDL failed'
 r=sql("delete from fixture_test.owners where id='00000000-0000-4000-8000-000000000002';")
 results.append({'case':'parent-first-delete-rejected','pass':r.returncode!=0 and 'foreign key' in r.stderr})
 r=sql("delete from fixture_test.requests where id='00000000-0000-4000-8000-000000000003';")
 results.append({'case':'retained-audit-blocks-request-delete','pass':r.returncode!=0 and 'foreign key' in r.stderr})
 # Explicit disposable test-audit disposition, never a Main retention approval.
 r=sql("begin; delete from fixture_test.audit where id='00000000-0000-4000-8000-000000000004'; rollback; select count(*) from fixture_test.audit;")
 results.append({'case':'interrupted-transaction-rolls-back','pass':r.returncode==0 and '\n1' in r.stdout})
 cleanup="delete from fixture_test.audit where id='00000000-0000-4000-8000-000000000004';delete from fixture_test.requests where id='00000000-0000-4000-8000-000000000003';delete from fixture_test.owners where id='00000000-0000-4000-8000-000000000002';"
 r=sql(cleanup);r2=sql(cleanup)
 results.append({'case':'exact-id-cleanup-retry-idempotent','pass':r.returncode==0 and r2.returncode==0})
 r=sql("select count(*) from fixture_test.owners where id='00000000-0000-4000-8000-000000000001' and tag='existing-seed'; select count(*) from fixture_test.owners where tag='synthetic'; select count(*) from fixture_test.requests;select count(*) from fixture_test.audit;")
 results.append({'case':'independent-seed-and-fixture-count-verification','pass':r.returncode==0 and r.stdout.strip().splitlines()==['1','0','0','0']})
except Exception as e:results.append({'case':'runtime','pass':False,'blocker':str(e)})
finally:
 cleanup=docker(['rm','-f','-v',name]);removed=docker(['container','inspect',name]).returncode!=0
 report={'scope':'ISOLATED_POSTGRES_FK_MECHANICS_ONLY_NOT_WEBSITE_SCHEMA_OR_AUTH_E2E','network':'none','production_access':False,'results':results,'temporary_container_removed':removed,'real_auth_e2e':'NOT_RUN; existing stage2b-local containers intentionally untouched; no new Auth stack provisioned','main_cleanup_approval':False}
 (out/'ISOLATED_FK_EXECUTION.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));
 if any(not x['pass'] for x in results) or not removed:raise SystemExit(1)
