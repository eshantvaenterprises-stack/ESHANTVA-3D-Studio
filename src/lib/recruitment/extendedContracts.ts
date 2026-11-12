/** Server-defined workflow contract. These IDs are references, never access tokens. */
export type DocumentKind = 'ADMIT_CARD' | 'TRAINING_SCHEDULE' | 'APPOINTMENT_LETTER';
export type RevisionState = 'DRAFT' | 'VERIFIED' | 'PUBLISHED' | 'SUPERSEDED';
export type BatchState = 'DRAFT' | 'VERIFIED' | 'PUBLISHED' | 'CANCELLED';
export type InterviewAttendance = 'UNMARKED' | 'PRESENT' | 'ABSENT' | 'EXCUSED';
export type TrainingDay = 1|2|3|4|5|6|7|8|9|10;
export type ExportFormat = 'CSV' | 'XLSX' | 'PDF';
export const restrictedExportColumns = new Set([
  'bank_account','bank_account_number','ifsc','payment_credentials','identity_document',
  'raw_snapshot','storage_path','credential_hash','password','token','aadhaar','pan',
]);
/** Never use a candidate-supplied reference to expand permissions or expose private files. */
export function allowedExportColumns(requested: readonly string[],allowlist: ReadonlySet<string>): string[] {
  const unique = new Set<string>();
  for (const name of requested) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(name) || restrictedExportColumns.has(name) || !allowlist.has(name)) {
      throw new Error('EXPORT_COLUMN_NOT_AUTHORIZED');
    }
    unique.add(name);
  }
  if (!unique.size) throw new Error('EXPORT_COLUMNS_REQUIRED');
  return [...unique];
}
/** Guard against CSV/Excel formula execution, including after leading whitespace/control characters. */
export function csvCell(value: unknown): string {
  let stringValue = value == null ? '' : String(value);
  if (/^[\u0000-\u0020]*[=+\-@\t\r\n]/u.test(stringValue)) stringValue = "'" + stringValue;
  return '"' + stringValue.replaceAll('"','""') + '"';
}
export function toSafeCsv(columns: readonly string[], rows: readonly Record<string,unknown>[]): string {
  return '\uFEFF' + columns.map(csvCell).join(',') + '\r\n' +
    rows.map(row=>columns.map(c=>csvCell(row[c])).join(',')).join('\r\n');
}
export function isLatestVerifiedRevision(revision: {state:RevisionState,revision:number,sha256:string},
 selected: {revision:number,sha256:string}): boolean {
  return revision.state === 'VERIFIED' && revision.revision === selected.revision &&
    /^[0-9a-f]{64}$/.test(revision.sha256) && revision.sha256 === selected.sha256;
}
