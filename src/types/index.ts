export type StatusType = 'active' | 'inactive' | 'archived';

export type ExerciseStatus = 'draft' | 'scheduled' | 'open' | 'closed' | 'results_published' | 'archived';

export type UserRole = 'super_admin' | 'admin' | 'organisation_admin' | 'department_admin' | 'unit_admin' | 'voter';

export type VotingScopeType = 'church' | 'workforce' | 'organisation' | 'department' | 'unit' | 'custom';

export type VoterSelectionMode = 'scope_members' | 'manual_selection' | 'custom' | 'all_church' | 'all_workforce';

export type NomineeSelectionMode = 'scope_members' | 'manual_selection' | 'custom' | 'all_workforce';

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  status: StatusType;
  departmentCount?: number;
  votingExerciseCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Department {
  id: string;
  organisationId: string;
  organisationName?: string;
  name: string;
  slug: string;
  description?: string;
  status: StatusType;
  unitCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Unit {
  id: string;
  departmentId: string;
  departmentName?: string;
  organisationId: string;
  organisationName?: string;
  name: string;
  slug: string;
  code?: string;
  description?: string;
  headOfUnit?: string;
  status: StatusType;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Membership {
  id: string;
  personId: string;
  organisationId: string;
  organisationName?: string;
  departmentId?: string;
  departmentName?: string;
  unitId?: string;
  unitName?: string;
  roleTitle?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  organisationId?: string;
  organisationName?: string;
  departmentId?: string;
  departmentName?: string;
  unitId?: string;
  unitName?: string;
  roleTitle?: string;
  avatarUrl?: string;
  photoUrl?: string;
  voterCode: string;
  status: StatusType;
  churchMember?: boolean;
  workforceMember?: boolean;
  memberships?: Membership[];
  createdAt: string;
  updatedAt: string;
}

export interface Criterion {
  id: string;
  votingExerciseId: string;
  title: string;
  description?: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Nominee {
  id: string;
  votingExerciseId: string;
  personId?: string;
  displayName: string;
  roleOrTitle?: string;
  department?: string;
  unit?: string;
  organisationName?: string;
  photoUrl?: string;
  bio?: string;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface VotingExercise {
  id: string;
  title: string;
  slug: string;
  description?: string;
  scopeType: VotingScopeType;
  organisationId?: string;
  organisationName?: string;
  departmentId?: string;
  departmentName?: string;
  unitId?: string;
  unitName?: string;
  categoryName?: string; // e.g. "Workforce Recognition", "Excellence Awards", "Leadership"
  status: ExerciseStatus;
  startTime: string; // ISO 8601 string
  endTime: string;   // ISO 8601 string
  resultsPublished: boolean;
  resultsVisibilityMode?: 'admin_only' | 'publish_after_close' | 'manual_publish';
  allowSelfVote: boolean;
  maxVotesPerPerson?: number;
  votingMode: 'single_choice';
  voterSelectionMode?: VoterSelectionMode;
  nomineeSelectionMode?: NomineeSelectionMode;
  criteriaCount?: number;
  nomineeCount?: number;
  totalVotes?: number;
  eligibleVotersCount?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Eligibility {
  id: string;
  votingExerciseId: string;
  personId: string;
  voterName?: string;
  voterEmail?: string;
  voterCode?: string;
  eligible: boolean;
  hasVoted: boolean;
  votedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  votingExerciseId: string;
  nomineeId: string;
  voterId: string; // Person ID or Anonymous Voter Hash
  timestamp: string;
  receiptHash?: string;
}

export interface NomineeResult {
  nomineeId: string;
  displayName: string;
  photoUrl?: string;
  roleOrTitle?: string;
  department?: string;
  voteCount: number;
  percentage: number;
}

export interface VotingResult {
  votingExerciseId: string;
  totalEligible: number;
  totalVotes: number;
  participationRate: number;
  nomineeResults: NomineeResult[];
  isTie: boolean;
  winners: NomineeResult[];
  resultsPublished: boolean;
  generatedAt: string;
}

export interface LegacyWinnerRecord {
  id: string;
  name: string;
  photoUrl?: string;
  organisationId?: string;
  organisationName: string;
  departmentId?: string;
  departmentName?: string;
  secondaryDepartmentId?: string;
  secondaryDepartmentName?: string;
  departmentIds?: string[];
  departmentNames?: string[];
  isJointWinner?: boolean;
  jointWinnerName?: string;
  jointWinnerPhotoUrl?: string;
  jointWinnerRole?: string;
  unitId?: string;
  unitName?: string;
  month: string; // e.g. "January", "February", etc.
  year: number;  // e.g. 2023, 2024, 2025
  awardTitle?: string; // e.g. "Worker of the Month", "Excellence in Service"
  awardCategory?: 'departmental' | 'workforce_wide' | 'innovative' | string; // Category / tier: in department, across entire workforce, or innovative worker across entire church
  awardScope?: string; // e.g. "Departmental", "All Departments / Workforce-wide", "Entire Church (Innovation)"
  scopeType?: VotingScopeType;
  roleOrTitle?: string; // e.g. "Lead Vocalist", "Ushering Unit Lead"
  citation?: string; // e.g. "Commended for consistency and heart of service"
  votesCount?: number; // optional historical vote tally if known
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface WinnerRecord {
  exerciseId: string;
  exerciseTitle: string;
  exerciseSlug: string;
  categoryName?: string;
  organisationId: string;
  organisationName: string;
  scopeType?: VotingScopeType;
  departmentId?: string;
  departmentName?: string;
  secondaryDepartmentId?: string;
  secondaryDepartmentName?: string;
  departmentIds?: string[];
  departmentNames?: string[];
  unitId?: string;
  unitName?: string;
  isJointWinner?: boolean;
  jointWinnerName?: string;
  jointWinnerPhotoUrl?: string;
  jointWinnerRole?: string;
  endTime: string;
  totalVotes: number;
  totalEligible: number;
  participationRate: number;
  isTie: boolean;
  winner: NomineeResult;
  allWinners: NomineeResult[];
  allNomineesCount: number;
  isLegacy?: boolean;
  legacyId?: string;
  month?: string;
  year?: number;
  awardTitle?: string;
  awardCategory?: 'departmental' | 'workforce_wide' | 'innovative' | string;
  awardScope?: string;
  citation?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resourceType: 'organisation' | 'department' | 'unit' | 'votingExercise' | 'criterion' | 'nominee' | 'eligibility' | 'person' | 'membership' | 'systemConfig' | 'vote' | 'system';
  resourceId: string;
  details?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SystemConfig {
  id: string;
  churchName: string;
  churchTagline?: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  defaultTimezone: string;
  voterAccessMode: 'auth_or_code' | 'voter_code_only' | 'email_code';
  allowOpenVoterRegistration: boolean;
  contactEmail?: string;
  supportEmail?: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  organisationId?: string;
  departmentId?: string;
  personId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  fullName: string;
  username: string; // Login ID (unique)
  password: string; // Password (managed & generated by Super Admin)
  email?: string;
  phone?: string;
  role: UserRole;
  organisationId?: string;
  organisationName?: string;
  departmentId?: string;
  departmentName?: string;
  status: StatusType;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type AppErrorCode =
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'VOTING_NOT_FOUND'
  | 'VOTING_CLOSED'
  | 'VOTING_NOT_STARTED'
  | 'VOTING_EXPIRED'
  | 'NOT_ELIGIBLE'
  | 'ALREADY_VOTED'
  | 'NOMINEE_NOT_FOUND'
  | 'INVALID_NOMINEE'
  | 'SELF_VOTE_NOT_ALLOWED'
  | 'INVALID_REQUEST'
  | 'INTERNAL_ERROR';

export interface AppErrorResponse {
  success: false;
  code: AppErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface AppSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T> = AppSuccessResponse<T> | AppErrorResponse;
