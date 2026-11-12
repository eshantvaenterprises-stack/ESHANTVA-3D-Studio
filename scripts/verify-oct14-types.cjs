async function main(){
 const tsModule=await import('typescript');const ts=tsModule.default??tsModule;
 const fs=await import('node:fs');
 const files=['supabase/functions/recruitment-extended-admin-api/index.ts','supabase/functions/recruitment-extended-admin-api/print.ts','supabase/functions/candidate-recruitment-api/index.ts','supabase/functions/recruitment-extended-export-api/index.ts','supabase/functions/recruitment-extended-training-email/index.ts','supabase/functions/recruitment-bank-api/index.ts','supabase/functions/recruitment-training-public-api/index.ts','src/components/admin/ExtendedRecruitmentClient.tsx','src/components/recruitment/CandidatePortalClient.tsx','src/components/recruitment/CandidatePaymentDetails.tsx','src/components/recruitment/PublicTrainingSchedule.tsx','src/lib/adminRecruitmentExtendedApi.ts','src/lib/adminRecruitmentExportApi.ts','app/careers/training/page.tsx'];
 let failures=0;
 for(const f of files){
  const src=fs.readFileSync(f,'utf8');
  const output=ts.transpileModule(src,{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.Preserve}});
  const errors=(output.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  if(errors.length){failures+=errors.length;console.log('FAIL',f,errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join(' | '));}
  else console.log('PASS',f);
 }
 console.log('Total modified TS/TSX files:',files.length,'syntax errors:',failures);process.exitCode=failures?1:0;
}
main().catch(error=>{console.error(error);process.exitCode=1});
