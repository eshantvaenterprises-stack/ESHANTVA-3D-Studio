import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';
import { z } from 'npm:zod@4.6.7';

const optionValueSchema = z.object({ id: z.string().min(1).max(160), label: z.string().min(1).max(500), priceModifierPaise: z.number().int().min(0).default(0), unavailable: z.boolean().default(false) });
const optionSchema = z.discriminatedUnion('type', [
  z.object({ id:z.string().min(1).max(120), label:z.string().min(1).max(160), type:z.literal('text'), required:z.boolean().default(false), minLength:z.number().int().min(0).max(500).default(0), maxLength:z.number().int().min(1).max(1000), priceModifierPaise:z.number().int().min(0).default(0) }),
  z.object({ id:z.string().min(1).max(120), label:z.string().min(1).max(160), type:z.enum(['select','color','material','size']), required:z.boolean().default(false), values:z.array(optionValueSchema).max(100) }),
  z.object({ id:z.string().min(1).max(120), label:z.string().min(1).max(160), type:z.literal('boolean'), required:z.boolean().default(false), priceModifierPaise:z.number().int().min(0).default(0) }),
  z.object({ id:z.string().min(1).max(120), label:z.string().min(1).max(160), type:z.literal('file'), required:z.boolean().default(false) }),
]);
const catalogProductSchema = z.object({
  product_id:z.string().min(1).max(160), slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180), sku:z.string().min(1).max(180), title:z.string().min(1).max(240), currency:z.literal('INR'), base_unit_price_paise:z.coerce.number().int().min(0), active:z.boolean(), purchasable:z.boolean(), is_sample:z.boolean(), public_availability:z.enum(['in_stock','limited','made_to_order','on_request','out_of_stock']), order_mode:z.enum(['direct_purchase','configurable_purchase','request_only']), minimum_quantity:z.coerce.number().int().min(1), maximum_quantity:z.coerce.number().int().min(1).nullable(), configuration_schema:z.array(optionSchema).max(40), tax_rate_bps:z.coerce.number().int().min(0).max(10000).nullable(), price_includes_tax:z.boolean().nullable(), catalog_version:z.coerce.number().int().min(1),
});
export const checkoutCartLineIntentSchema = z.object({ productId:z.string().min(1).max(160), slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180), configurationSignature:z.string().min(1).max(4000), quantity:z.number().int().min(1).max(100000), selectedOptions:z.array(z.object({ optionId:z.string().min(1).max(120), valueId:z.string().max(160).optional(), valueLabel:z.string().min(1).max(500) })).max(30) });
export type CheckoutCartLineIntent = z.infer<typeof checkoutCartLineIntentSchema>;
export type ResolvedCommerceLine = { productId:string; slug:string; sku:string; title:string; quantity:number; unitPricePaise:number; lineSubtotalPaise:number; configurationSignature:string; selectedOptions:Array<{optionId:string;label:string;valueId?:string;valueLabel:string}>; taxRateBps:number|null; priceIncludesTax:boolean|null; catalogVersion:number };
export class CommerceValidationError extends Error { constructor(message:string, readonly code='CART_REVIEW_REQUIRED'){ super(message); } }

function configurationSignature(productId:string, options:Array<{optionId:string;valueId?:string;valueLabel:string}>) {
  const normalized=options.map((option)=>({optionId:option.optionId,valueId:option.valueId||'',valueLabel:option.valueLabel.trim()})).sort((a,b)=>a.optionId.localeCompare(b.optionId));
  return `${productId}:${JSON.stringify(normalized)}`;
}
function resolveOptions(product:z.infer<typeof catalogProductSchema>, requested:CheckoutCartLineIntent['selectedOptions']) {
  const byId=new Map(product.configuration_schema.map((option)=>[option.id,option]));
  const requestedIds=new Set<string>();
  const resolved:Array<{optionId:string;label:string;valueId?:string;valueLabel:string;priceModifierPaise:number}>=[];
  for(const selected of requested){
    if(requestedIds.has(selected.optionId)) throw new CommerceValidationError('A product option is duplicated. Review the item before checkout.');
    requestedIds.add(selected.optionId); const option=byId.get(selected.optionId);
    if(!option||option.type==='file') throw new CommerceValidationError('A saved product option is no longer valid for checkout.');
    if(option.type==='text'){ const value=selected.valueLabel.trim(); if(value.length<option.minLength||value.length>option.maxLength) throw new CommerceValidationError(`The ${option.label} value needs review.`); resolved.push({optionId:option.id,label:option.label,valueLabel:value,priceModifierPaise:option.priceModifierPaise}); continue; }
    if(option.type==='boolean'){ if(selected.valueId!=='yes') throw new CommerceValidationError(`The ${option.label} selection needs review.`); resolved.push({optionId:option.id,label:option.label,valueId:'yes',valueLabel:'Yes',priceModifierPaise:option.priceModifierPaise}); continue; }
    const value=option.values.find((candidate)=>candidate.id===selected.valueId&&!candidate.unavailable); if(!value) throw new CommerceValidationError(`The selected ${option.label.toLowerCase()} is no longer available.`); resolved.push({optionId:option.id,label:option.label,valueId:value.id,valueLabel:value.label,priceModifierPaise:value.priceModifierPaise});
  }
  for(const option of product.configuration_schema){ if(option.required&&option.type!=='file'&&!requestedIds.has(option.id)) throw new CommerceValidationError(`Required option “${option.label}” needs review.`); }
  return resolved;
}
export async function resolveCommerceCart(admin:SupabaseClient, requestedLines:CheckoutCartLineIntent[]) {
  if(requestedLines.length===0||requestedLines.length>50) throw new CommerceValidationError('Your cart is empty or too large to check out.');
  const slugs=[...new Set(requestedLines.map((line)=>line.slug))];
  const {data,error}=await admin.from('commerce_products').select('*').in('slug',slugs); if(error) throw error;
  const products=new Map((data??[]).map((row)=>{const product=catalogProductSchema.parse(row);return [product.slug,product] as const;}));
  const resolved:ResolvedCommerceLine[]=[];
  for(const requested of requestedLines){
    const product=products.get(requested.slug);
    if(!product||product.product_id!==requested.productId||product.is_sample||!product.active||!product.purchasable||product.order_mode==='request_only'||product.public_availability==='out_of_stock') throw new CommerceValidationError('One or more cart items are not available for checkout. Review your cart and try again.');
    if(requested.quantity<product.minimum_quantity||(product.maximum_quantity!==null&&requested.quantity>product.maximum_quantity)) throw new CommerceValidationError(`The quantity for ${product.title} is outside the currently accepted range.`);
    const options=resolveOptions(product,requested.selectedOptions); const normalized=options.map(({optionId,valueId,valueLabel})=>({optionId,valueId,valueLabel})); const signature=configurationSignature(product.product_id,normalized);
    if(signature!==requested.configurationSignature) throw new CommerceValidationError(`The saved configuration for ${product.title} needs review.`);
    const unitPricePaise=product.base_unit_price_paise+options.reduce((sum,option)=>sum+option.priceModifierPaise,0); const lineSubtotalPaise=unitPricePaise*requested.quantity;
    if(!Number.isSafeInteger(lineSubtotalPaise)) throw new CommerceValidationError('The order amount exceeds the supported checkout range.');
    resolved.push({productId:product.product_id,slug:product.slug,sku:product.sku,title:product.title,quantity:requested.quantity,unitPricePaise,lineSubtotalPaise,configurationSignature:signature,selectedOptions:normalized.map((option)=>({...option,label:options.find((item)=>item.optionId===option.optionId)?.label||option.optionId})),taxRateBps:product.tax_rate_bps,priceIncludesTax:product.price_includes_tax,catalogVersion:product.catalog_version});
  }
  return resolved;
}
