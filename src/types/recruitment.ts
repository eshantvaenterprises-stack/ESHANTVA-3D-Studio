export type RecruitmentVacancy = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: string;
  notice_version_id: string;
  employment_type: string;
  work_mode: string;
  location_label: string | null;
  eligibility_text: string | null;
  compensation_text: string | null;
  assessment_text: string | null;
  published_at: string | null;
  applications_open_at: string | null;
  applications_close_at: string | null;
  closes_at: string | null;
};

export type RecruitmentNotice = {
  id: string;
  notice_key: string;
  version: string;
  title: string;
  content_markdown?: string | null;
  published_at: string | null;
};

export type CandidateProfile = {
  id: string;
  candidate_reference: string;
  full_name: string;
  email: string;
  phone: string | null;
  address_line: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pin_code: string | null;
  current_engagement: string | null;
  availability_text: string | null;
  profile_status: string;
  email_verified_at: string;
  identity_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CandidateApplication = {
  id: string;
  application_reference: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  vacancy_id: string;
  recent_photograph_file_id: string | null;
  resume_file_id: string | null;
  student_status: string | null;
  full_time_availability_acknowledged: boolean;
  travel_accommodation_responsibility_acknowledged: boolean;
  recruitment_vacancies?: {
    title: string;
    slug: string;
    location_label: string | null;
  } | null;
};

export type CandidateEducation = {
  id: string;
  qualification: string;
  institution: string;
  completion_year: number | null;
  position: number;
};

export type CandidateExperience = {
  id: string;
  organization: string;
  role_title: string;
  started_on: string | null;
  ended_on: string | null;
  summary: string | null;
  position: number;
};

export type CandidateLanguage = {
  id: string;
  language_name: string;
  proficiency: string;
};

export type CandidateInterview = {
  id: string;
  application_id: string;
  scheduled_at: string;
  reporting_time: string;
  venue: string;
  instructions: string | null;
  card_release_at: string | null;
  interview_card_file_id: string | null;
  status: string;
};

export type CandidateDocumentRequirement = {
  id: string;
  application_id: string;
  status: string;
  released_at: string | null;
  satisfied_by_file_id: string | null;
  recruitment_document_requirements: {
    public_label: string;
    file_kind: string;
    release_stage: string;
    required: boolean;
  } | null;
};

export type CandidateAssessment = {
  id: string;
  application_id: string;
  assessment_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  summary: string | null;
  admin_result?: string | null;
};

export type CandidateFile = {
  id: string;
  application_id: string | null;
  file_kind: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  state: string;
  visible_to_candidate: boolean;
  created_at: string;
  verified_at?: string | null;
};

export type CandidateApplicationStatusEvent = {
  id: string;
  occurred_at: string;
  from_status: string | null;
  to_status: string;
};

export type CandidateOverview = {
  candidate: CandidateProfile;
  applications: CandidateApplication[];
  education: CandidateEducation[];
  experience: CandidateExperience[];
  languages: CandidateLanguage[];
  noticeAcceptances: Array<{ notice_version_id: string; accepted_at: string }>;
  interviews?: CandidateInterview[];
  documents?: CandidateDocumentRequirement[];
  assessments?: CandidateAssessment[];
  files?: CandidateFile[];
};

export type RecruitmentPublicConfig = {
  notices: RecruitmentNotice[];
  vacancies: RecruitmentVacancy[];
};

export type AdminRecruitmentSummary = {
  total: number;
  newCount: number;
  screening: number;
  shortlisted: number;
  interview: number;
  documents: number;
  assessment: number;
  selected: number;
  notSelected: number;
};

export type AdminCandidateListItem = {
  candidateId: string;
  candidateReference: string;
  fullName: string;
  email: string;
  phone: string | null;
  district: string | null;
  applicationId: string;
  applicationReference: string;
  vacancyTitle: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
};

export type AdminRecruitmentApplication = CandidateApplication & {
  candidate_profiles: CandidateProfile;
  recruitment_vacancies: RecruitmentVacancy;
};

export type AdminRecruitmentCandidateDetail = {
  application: AdminRecruitmentApplication;
  education: CandidateEducation[];
  experience: CandidateExperience[];
  languages: CandidateLanguage[];
  files: CandidateFile[];
  events: CandidateApplicationStatusEvent[];
  interview: CandidateInterview | null;
  documents: CandidateDocumentRequirement[];
  assessments: CandidateAssessment[];
};

export type InterviewVerificationResult = {
  status: 'VALID' | 'INVALID' | 'REVOKED' | 'EXPIRED';
  candidateName: string;
  candidateReference: string;
  applicationReference: string;
  position: string;
  interviewDate: string | null;
  cardStatus: string;
};
