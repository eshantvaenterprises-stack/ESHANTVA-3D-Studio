export const VERIFIED_PUBLIC_GSTIN = '18DHLPG9662M1ZH' as const;

export const businessIdentity = {
  tradeName: 'ESHANTVA 3D Studio',
  constitution: 'Proprietorship',
  gstRegistered: true,
  gstin: VERIFIED_PUBLIC_GSTIN,
  publicLocation: 'Biswanath, Assam, India',
  tradeLicenseNumber: null as string | null,
  tradeLicensePublic: false,
} as const;

export function getPublicBusinessIdentityLine() {
  return `${businessIdentity.constitution} · GSTIN: ${businessIdentity.gstin}`;
}
