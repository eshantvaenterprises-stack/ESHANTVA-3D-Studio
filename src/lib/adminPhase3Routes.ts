const customerRefPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const customRefPattern=/^CR-[0-9]{4}-[A-Z0-9]{6}$/;
const bulkRefPattern=/^BR-[0-9]{4}-[A-Z0-9]{6}$/;
export const ADMIN_PHASE3_PAGE_SIZE=20;
function stripBase(pathname:string,basePath=''){const base=basePath&&basePath!=='/'?basePath.replace(/\/$/,''):'';return base&&pathname.startsWith(base)?pathname.slice(base.length):pathname}
function decode(value:string){try{return decodeURIComponent(value)}catch{return value}}
export function isAdminCustomerReference(value:string){return customerRefPattern.test(value)}
export function isAdminCustomRequestReference(value:string){return customRefPattern.test(value)}
export function isAdminBulkRequestReference(value:string){return bulkRefPattern.test(value)}
export function extractAdminCustomerReference(pathname:string,basePath=''){const m=stripBase(pathname,basePath).match(/^\/admin\/customers\/([^/?#]+)\/?$/);if(!m)return null;const v=decode(m[1]).toLowerCase();return isAdminCustomerReference(v)?v:null}
export function extractAdminCustomRequestReference(pathname:string,basePath=''){const m=stripBase(pathname,basePath).match(/^\/admin\/requests\/custom\/([^/?#]+)\/?$/);if(!m)return null;const v=decode(m[1]).toUpperCase();return isAdminCustomRequestReference(v)?v:null}
export function extractAdminBulkRequestReference(pathname:string,basePath=''){const m=stripBase(pathname,basePath).match(/^\/admin\/requests\/bulk\/([^/?#]+)\/?$/);if(!m)return null;const v=decode(m[1]).toUpperCase();return isAdminBulkRequestReference(v)?v:null}
export function sanitizeCustomerSearch(value:string){const v=value.trim().toLowerCase().slice(0,36);return /^[0-9a-f-]*$/.test(v)?v:''}
export function sanitizeRequestSearch(value:string){return value.trim().toUpperCase().slice(0,40).replace(/[^A-Z0-9-]/g,'')}
export function isAdminPhase3RequestCurrent(current:{epoch:number;userId:string|null;identity:string|null},expected:{epoch:number;userId:string;identity:string}){return current.epoch===expected.epoch&&current.userId===expected.userId&&current.identity===expected.identity}
export type AdminPhase3TransitionRequest={key:string;requestId:string};
export function getOrCreateAdminPhase3TransitionRequest(current:AdminPhase3TransitionRequest|null,key:string,createRequestId:()=>string):AdminPhase3TransitionRequest{return current?.key===key?current:{key,requestId:createRequestId()}}
export function isAdminPhase3MutationCurrent(current:{epoch:number;userId:string|null;identity:string|null;requestId:string|null},expected:{epoch:number;userId:string;identity:string;requestId:string}){return current.epoch===expected.epoch&&current.userId===expected.userId&&current.identity===expected.identity&&current.requestId===expected.requestId}
