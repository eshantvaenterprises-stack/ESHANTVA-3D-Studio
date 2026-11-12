'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { BriefcaseBusiness,MapPin,Clock3,ShieldCheck } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { loadRecruitmentPublicConfig } from '@/lib/recruitmentApi';
import type { RecruitmentPublicConfig } from '@/types/recruitment';
const publicRecruitmentClosed=Date.now()>=Date.parse('2026-10-12T12:30:00.000Z');

export function CareersClient(){const[state,setState]=useState<{loading:boolean;data:RecruitmentPublicConfig|null;error:boolean}>({loading:true,data:null,error:false});useEffect(()=>{if(publicRecruitmentClosed)return;let live=true;loadRecruitmentPublicConfig().then(data=>{if(live)setState({loading:false,data,error:false})}).catch(()=>{if(live)setState({loading:false,data:null,error:true})});return()=>{live=false}},[]);
if(publicRecruitmentClosed)return <section className="recruit-card"><h2>Recruitment applications closed</h2><p>The public application deadline was 12 October 2026 at 6:00 PM IST. No new candidates are being accepted.</p><p>Only applicants with approved pre-deadline evidence can continue via private invitation. <Link href={`${siteConfig.basePath}/candidate/activate/`}>Activate an approved invitation</Link>.</p></section>;
if(state.loading)return <section className="recruit-card"><h2>Loading current vacancies…</h2></section>;
if(state.error)return <section className="recruit-card"><h2>Vacancies temporarily unavailable.</h2><p>Please try again shortly.</p></section>;
const rows=state.data?.vacancies||[];if(!rows.length)return <section className="recruit-card"><h2>No open vacancy right now.</h2><p>When a role is published, it will appear here.</p></section>;
return <div className="recruit-grid">{rows.map(v=><article className="recruit-card" key={v.id}><div className="recruit-icon"><BriefcaseBusiness size={24}/></div><span className="section-kicker">OPEN VACANCY</span><h2>{v.title}</h2><p>{v.summary}</p><div className="recruit-meta"><span><MapPin size={16}/>{v.location_label||'Location in vacancy notice'}</span><span><Clock3 size={16}/>{v.employment_type.replaceAll('_',' ')} · {v.work_mode.replaceAll('_',' ')}</span></div>{v.eligibility_text&&<p className="recruit-muted">{v.eligibility_text}</p>}<div className="recruit-actions"><Link className="button primary" href={`/candidate/?vacancy=${encodeURIComponent(v.id)}`}>Apply for this role</Link><Link className="text-link" href="/recruitment-privacy/">Privacy information</Link></div><p className="recruit-safe"><ShieldCheck size={15}/> No application fee. Candidate records are private.</p></article>)}</div>}
