export type PaymentSessionInput={orderId:string;orderReference:string;amountPaise:number;currency:'INR';customer:{name:string;email:string;mobile:string};returnUrl:string;idempotencyKey:string};
export type PaymentSession={provider:string;providerSessionId:string;redirectUrl:string};
export type VerifiedPayment={provider:string;providerPaymentId:string;status:'processing'|'paid'|'failed'|'cancelled'|'refunded';amountPaise:number;currency:'INR'};
export interface PaymentAdapter{createPaymentSession(input:PaymentSessionInput):Promise<PaymentSession>;verifyPayment(providerSessionId:string):Promise<VerifiedPayment>;handleWebhook(request:Request):Promise<VerifiedPayment>}
/** No verified gateway is selected. Provider adapters are registered only after credentials/signature rules are verified. */
export function getPaymentAdapter():PaymentAdapter|null{return null;}
