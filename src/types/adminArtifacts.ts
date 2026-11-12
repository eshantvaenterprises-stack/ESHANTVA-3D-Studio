import type { AdminRole } from '@/types/admin';

export const adminArtifactCategories = ['design_preview','revised_design','approval_document','verification_image','verification_video','final_document'] as const;
export type AdminArtifactCategory = typeof adminArtifactCategories[number];
export type AdminArtifactApprovalStatus = 'PENDING'|'APPROVED'|'REVISION_REQUESTED';

export type AdminArtifactItem = {
  reference:string;
  category:AdminArtifactCategory;
  categoryLabel:string;
  displayName:string;
  description:string|null;
  versionLabel:string|null;
  revision:number;
  mimeType:string;
  sizeBytes:number;
  createdAt:string;
  isLatest:boolean;
  approval:null|{
    reference:string;
    status:AdminArtifactApprovalStatus;
    statusLabel:string;
    targetRevision:number;
    requestedAt:string;
    resolvedAt:string|null;
  };
};

export type AdminArtifactUploadSummary = {
  uploadReference:string;
  category:AdminArtifactCategory;
  displayName:string;
  status:'PREPARED'|'UPLOADED'|'PUBLISHED';
  mimeType:string;
  sizeBytes:number;
  createdAt:string;
  uploadedAt:string|null;
  publishedAt:string|null;
};

export type AdminOrderArtifactsData = {
  admin:{role:AdminRole;displayName:string|null};
  orderReference:string;
  artifacts:AdminArtifactItem[];
  uploads:AdminArtifactUploadSummary[];
};

export type AdminArtifactPrepareResult = {uploadReference:string;status:'PREPARED'|'UPLOADED'|'PUBLISHED';replayed:boolean};
export type AdminArtifactUploadResult = {uploadReference:string;status:'UPLOADED'|'PUBLISHED';replayed:boolean};
export type AdminArtifactPublishResult = {artifactReference:string;revision:number;replayed:boolean};
export type AdminArtifactApprovalResult = {approvalReference:string;artifactReference:string;revision:number;status:AdminArtifactApprovalStatus;replayed:boolean};
export type AdminArtifactAccessResult = {artifactReference:string;displayName:string;mimeType:string;signedUrl:string;expiresAt:string;disposition:'preview'|'download'};
