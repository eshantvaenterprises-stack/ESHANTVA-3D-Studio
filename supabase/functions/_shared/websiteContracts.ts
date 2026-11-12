/** Pure, shared browser/Edge contracts. No credentials, HTML or arbitrary fields. */
export type ContentKind = 'faq' | 'about' | 'project';
export type ContentPayload = { title: string; body: string; category?: string; image?: string; realPortfolio?: boolean; customerApproved?: boolean; isPlaceholder?: boolean; approvalReference?: string };
export type ContentRecord = { key: string; kind: ContentKind; revision: number; state: 'DRAFT'|'REVIEW'|'PUBLISHED'|'UNPUBLISHED'; payload: ContentPayload; updatedAt: string };
export type CustomerProfile = { displayName: string; version: number };
export type Followup = { reference: string; kind: 'custom'|'bulk'; requestReference: string; question: string; reply: string|null; state: 'OPEN'|'REPLIED'|'CLOSED'; createdAt: string; repliedAt: string|null };
export const featureActions = ['cms-list','cms-save','cms-review','cms-publish','cms-unpublish','cms-history','profile-get','profile-save','followup-list','admin-followup-list','followup-create','followup-reply','published-list'] as const;
export const faqCategoryIds = ['shop-products','custom-orders','bulk-orders','materials-options','pricing-payment','delivery-pickup','process-changes','business-support'];
export function text(value: unknown, min: number, max: number): string {
  if (typeof value !== 'string') throw new Error('INVALID_INPUT');
  const out = value.trim();
  if (out.length < min || out.length > max || /[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(out)) throw new Error('INVALID_INPUT');
  return out;
}
export function version(value: unknown): number { if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 2147483646) throw new Error('INVALID_INPUT'); return Number(value); }
export function uuid(value: unknown): string { const out=text(value,36,36);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(out))throw new Error('INVALID_INPUT');return out; }
export function requestIdentity(kind: unknown, reference: unknown) { if(kind!=='custom'&&kind!=='bulk')throw new Error('INVALID_INPUT');const ref=text(reference,1,40);if(!(kind==='custom'?/^CR-[0-9]{4}-[A-Z0-9]+$/:/^BR-[0-9]{4}-[A-Z0-9]+$/).test(ref))throw new Error('INVALID_INPUT');return {kind,reference:ref} as const; }
export function contentInput(kind: unknown, key: unknown, input: unknown) {
  if(!['faq','about','project'].includes(String(kind)))throw new Error('INVALID_INPUT');
  const slug=text(key,1,80);if(!/^[a-z][a-z0-9-]*$/.test(slug))throw new Error('INVALID_INPUT');
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('INVALID_INPUT');
  const p=input as Record<string,unknown>;const allowed=['title','body',...(kind==='faq'?['category']:kind==='project'?['image','realPortfolio','customerApproved','isPlaceholder','approvalReference']:[])];
  if(Object.keys(p).some(k=>!allowed.includes(k)))throw new Error('INVALID_INPUT');
  const payload:ContentPayload={title:text(p.title,3,160),body:text(p.body,3,4000)};
  if(kind==='faq'){if(!faqCategoryIds.includes(String(p.category)))throw new Error('INVALID_INPUT');payload.category=String(p.category);}
  if(kind==='project'){
    const image=text(p.image,1,240);if(!/^\/images\/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp)$/.test(image))throw new Error('INVALID_INPUT');
    if(typeof p.realPortfolio!=='boolean'||typeof p.customerApproved!=='boolean'||typeof p.isPlaceholder!=='boolean')throw new Error('INVALID_INPUT');
    Object.assign(payload,{image,realPortfolio:p.realPortfolio,customerApproved:p.customerApproved,isPlaceholder:p.isPlaceholder,approvalReference:text(p.approvalReference,1,160)});
  }
  return {kind:kind as ContentKind,key:slug,payload};
}
export function publicContent(payload: ContentPayload): ContentPayload { const {approvalReference: _privateApproval,...safe}=payload;void _privateApproval;return safe; }
