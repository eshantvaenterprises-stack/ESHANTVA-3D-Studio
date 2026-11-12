import type { AdminRole } from '@/types/admin';

export const adminCustomRequestStatuses = [
  'DRAFT','SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION','QUOTED','ACCEPTED','DECLINED','CANCELLED','CONVERTED_TO_ORDER',
] as const;
export const adminBulkRequestStatuses = [
  'DRAFT','SUBMITTED','UNDER_REVIEW','MORE_INFORMATION_REQUIRED','QUOTATION_PREPARATION','QUOTATION_SENT','AWAITING_CUSTOMER_APPROVAL','ACCEPTED','REJECTED','CANCELLED','CONVERTED_TO_ORDER',
] as const;
export const adminCustomRequestTypes = ['3d_file','drawing_dimensions','image_reference','modify_design','custom_product','replacement_part','other'] as const;
export const adminBulkTypes = ['existing_product','customized_product','custom_requirement'] as const;
export type AdminCustomRequestStatus = typeof adminCustomRequestStatuses[number];
export type AdminBulkRequestStatus = typeof adminBulkRequestStatuses[number];
export type AdminCustomRequestType = typeof adminCustomRequestTypes[number];
export type AdminBulkType = typeof adminBulkTypes[number];
export type AdminPhase3Sort = 'newest'|'oldest';
export type AdminIdentity = { role:AdminRole; displayName:string|null };
export type AdminPagination = { page:number; pageSize:number; total:number; totalPages:number };

export type AdminCustomerListItem = {
  customerRef:string;
  displayIdentifier:string;
  accountType:'permanent'|'guest';
  orderCount:number;
  customRequestCount:number;
  bulkRequestCount:number;
  lastActivity:string;
};
export type AdminCustomersListData = {
  admin:AdminIdentity;
  items:AdminCustomerListItem[];
  pagination:AdminPagination;
  search:string;
};
export type AdminCustomerDetailData = {
  admin:AdminIdentity;
  customer:{
    displayName:string|null;
    email:string|null;
    accountType:'permanent'|'guest';
    createdAt:string;
    counts:{orders:number;customRequests:number;bulkRequests:number};
    recentOrders:Array<{reference:string;createdAt:string;status:string;statusLabel:string;totalPaise:number;currency:'INR'}>;
    recentCustomRequests:Array<{reference:string;createdAt:string;status:AdminCustomRequestStatus;statusLabel:string;title:string|null;requestType:AdminCustomRequestType|null}>;
    recentBulkRequests:Array<{reference:string;createdAt:string;status:AdminBulkRequestStatus;statusLabel:string;title:string|null;bulkType:AdminBulkType|null}>;
  };
};

export type AdminCustomRequestListItem = {
  reference:string; createdAt:string; updatedAt:string; status:AdminCustomRequestStatus; statusLabel:string;
  requestType:AdminCustomRequestType|null; requestTypeLabel:string; title:string|null; customerIdentifier:string;
};
export type AdminCustomRequestsListData = {
  admin:AdminIdentity; items:AdminCustomRequestListItem[]; pagination:AdminPagination;
  filters:{search:string;status:AdminCustomRequestStatus|null;requestType:AdminCustomRequestType|null;sort:AdminPhase3Sort};
};
export type AdminCustomRequestDetailData = {
  admin:AdminIdentity;
  request:{
    reference:string; createdAt:string; updatedAt:string; submittedAt:string|null; status:AdminCustomRequestStatus; statusLabel:string;
    requestType:AdminCustomRequestType|null; requestTypeLabel:string; title:string|null; description:string|null; intendedUse:string|null;
    quantity:number|null; targetDate:string|null; deliveryMethod:string|null; deliveryPinCode:string|null; deliveryCity:string|null; deliveryState:string|null;
    verificationRequested:boolean; customerNotes:string|null; sourceProductSlug:string|null;
    customer:{name:string|null;email:string|null;phone:string|null;communicationMethod:string|null;preferredLanguage:string|null};
    specification:{lengthMm:number|null;widthMm:number|null;heightMm:number|null;providedUnit:string|null;materialPreference:string|null;colorPreference:string|null;colorDetails:string|null;personalization:{type:string|null;text:string|null};functionalDetails:{purpose:string|null;usedWhere:string|null;loadConditions:string|null;heatExposure:boolean|null;outdoorUse:boolean|null;waterChemicalExposure:boolean|null;exactDimensions:string|null;originalPartAvailable:boolean|null;safetyNotes:string|null}}|null;
    files:Array<{fileReference:string;name:string;extension:string;mimeType:string;sizeBytes:number;uploadStatus:string;signatureStatus:string;scanStatus:string;createdAt:string}>;
    timeline:Array<{label:string;fromStatus:string|null;toStatus:string|null;occurredAt:string;message:string|null}>;
    allowedTransitions:AdminCustomRequestStatus[];
  };
};

export type AdminBulkRequestListItem = {
  reference:string; createdAt:string; updatedAt:string; status:AdminBulkRequestStatus; statusLabel:string;
  bulkType:AdminBulkType|null; bulkTypeLabel:string; title:string|null; customerIdentifier:string; itemCount:number; quotationStatus:string|null;
};
export type AdminBulkRequestsListData = {
  admin:AdminIdentity; items:AdminBulkRequestListItem[]; pagination:AdminPagination;
  filters:{search:string;status:AdminBulkRequestStatus|null;bulkType:AdminBulkType|null;sort:AdminPhase3Sort};
};
export type AdminBulkRequestDetailData = {
  admin:AdminIdentity;
  request:{
    reference:string; createdAt:string; updatedAt:string; submittedAt:string|null; status:AdminBulkRequestStatus; statusLabel:string;
    bulkType:AdminBulkType|null; bulkTypeLabel:string; organizationType:string|null; organizationName:string|null; contactPerson:string|null; roleDesignation:string|null;
    email:string|null; phone:string|null; preferredLanguage:string|null; poReference:string|null; repeatType:string|null; repeatFrequency:string|null; quantityPerCycle:number|null; repeatNotes:string|null;
    requirementTitle:string|null; requirementDescription:string|null; intendedUse:string|null; dimensions:string|null; materialPreference:string|null; colorPreference:string|null; targetDate:string|null;
    deliveryMethod:string|null; postalCode:string|null; city:string|null; state:string|null; targetBudget:number|null; targetUnitPrice:number|null; verificationRequested:boolean; customerNotes:string|null;
    items:Array<{itemType:string;description:string|null;quantity:number;configuration:Array<{label:string;value:string}>;sameCustomizationForAll:boolean|null;customizationNotes:string|null;notes:string|null}>;
    files:Array<{fileReference:string;name:string;extension:string;mimeType:string;fileRole:string;sizeBytes:number;uploadStatus:string;signatureStatus:string;scanStatus:string;createdAt:string}>;
    quotations:Array<{version:number;status:string;sentAt:string|null;acceptedAt:string|null;createdAt:string}>;
    timeline:Array<{label:string;fromStatus:string|null;toStatus:string|null;occurredAt:string;message:string|null}>;
    allowedTransitions:AdminBulkRequestStatus[];
  };
};
export type AdminRequestTransitionResult = { requestReference:string; previousStatus:string; status:string; replayed:boolean };
