export type CustomerApprovalState = 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED';
export type CustomerArtifactCategory =
  | 'design_preview'
  | 'revised_design'
  | 'approval_document'
  | 'verification_image'
  | 'verification_video'
  | 'final_document';

export type CustomerArtifactApproval = {
  reference: string;
  status: CustomerApprovalState;
  statusLabel: string;
  requestedAt: string;
  resolvedAt: string | null;
  actionable: boolean;
  targetRevision: number;
};

export type CustomerArtifact = {
  reference: string;
  category: CustomerArtifactCategory;
  categoryLabel: string;
  displayName: string;
  description: string | null;
  versionLabel: string | null;
  revision: number;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  isLatest: boolean;
  approval: CustomerArtifactApproval | null;
};

export type CustomerApprovalHistory = {
  approvalReference: string;
  artifactReference: string;
  displayName: string;
  versionLabel: string | null;
  revision: number;
  action: 'APPROVED' | 'REVISION_REQUESTED';
  actionLabel: string;
  occurredAt: string;
};

export type CustomerOrderFilesData = {
  orderReference: string;
  reviewStatus: 'action_required' | 'up_to_date' | 'no_files';
  reviewStatusLabel: string;
  attention: CustomerArtifact[];
  latest: CustomerArtifact | null;
  files: CustomerArtifact[];
  verificationMedia: CustomerArtifact[];
  history: CustomerApprovalHistory[];
};

export type ArtifactAccess = {
  artifactReference: string;
  displayName: string;
  mimeType: string;
  category: CustomerArtifactCategory;
  signedUrl: string;
  expiresAt: string;
  disposition: 'preview' | 'download';
};
