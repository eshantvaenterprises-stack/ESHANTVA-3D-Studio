'use client';
import {useEffect,useState} from 'react';
import {supabaseFunctionUrl,supabasePublicConfig} from '@/config/supabase';
import {requireExplicitRecruitmentEnvironment} from '@/lib/recruitmentEnvironment';
type Schedule={schedule:{code:string;title:string;startDate:string;endDate:string;version:number}|null;candidates:string[]};
export function PublicTrainingSchedule(){
 const [value,setValue]=useState<Schedule|null>(null),[message,setMessage]=useState('Checking the approved public training schedule…');
 useEffect(()=>{let active=true;async function load(){
  try{const url=requireExplicitRecruitmentEnvironment(supabaseFunctionUrl('recruitment-training-public-api',process.env.NEXT_PUBLIC_SUPABASE_RECRUITMENT_TRAINING_PUBLIC_FUNCTION_URL));
   const r=await fetch(url,{headers:{apikey:supabasePublicConfig.publishableKey},cache:'no-store'});
   const result=await r.json() as {ok:boolean;data?:Schedule;code?:string};
   if(!r.ok||!result.ok||!result.data)throw Error(result.code||'SCHEDULE_NOT_AVAILABLE');
   if(active){setValue(result.data);setMessage(result.data.schedule?'Approved global schedule':'No approved training schedule is currently published.');}
  }catch{if(active)setMessage('No verified public training schedule is currently available.');}}
  void load();return()=>{active=false};},[]);
 return <section className="recruit-card"><h2>Approved training schedule</h2><p role="status">{message}</p>
 {value?.schedule&&<><h3>{value.schedule.title}</h3><p>{value.schedule.code} · Version {value.schedule.version} · {value.schedule.startDate} to {value.schedule.endDate}</p><p>Candidate IDs only. Personal contact information and private documents are not published.</p><ul>{value.candidates.map(id=><li key={id}>{id}</li>)}</ul></>}
 </section>;
}
