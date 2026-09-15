import { UserRole } from '../types';

export const OFFICIAL_USERNAMES = [
  'Senior & Founding Pastor',
  'Executive Director, Administration & Human Capital',
  'Executive Director, Finance & Corporate Services',
  'Executive Director, Strategy, Projects & Performance',
  'Executive Director, Information, Communication & Technology',
  'Innovation & Technology Team'
] as const;

export type OfficialUsername = typeof OFFICIAL_USERNAMES[number];

export const SUPER_ADMIN_OFFICIAL_USERNAME: OfficialUsername =
  'Executive Director, Information, Communication & Technology';

export interface OfficialUserDef {
  username: OfficialUsername;
  fullName: string;
  role: UserRole;
  description: string;
  isSuperAdmin: boolean;
}

export const OFFICIAL_USERS_LIST: OfficialUserDef[] = [
  {
    username: 'Senior & Founding Pastor',
    fullName: 'Senior & Founding Pastor',
    role: 'admin',
    description: 'Founding spiritual oversight & executive leadership',
    isSuperAdmin: false
  },
  {
    username: 'Executive Director, Administration & Human Capital',
    fullName: 'Executive Director, Administration & Human Capital',
    role: 'admin',
    description: 'Administration, human capital & workforce operations',
    isSuperAdmin: false
  },
  {
    username: 'Executive Director, Finance & Corporate Services',
    fullName: 'Executive Director, Finance & Corporate Services',
    role: 'admin',
    description: 'Financial management, audit & corporate services',
    isSuperAdmin: false
  },
  {
    username: 'Executive Director, Strategy, Projects & Performance',
    fullName: 'Executive Director, Strategy, Projects & Performance',
    role: 'admin',
    description: 'Strategic initiatives, project delivery & KPI performance',
    isSuperAdmin: false
  },
  {
    username: 'Executive Director, Information, Communication & Technology',
    fullName: 'Executive Director, Information, Communication & Technology',
    role: 'super_admin',
    description: 'Information, communication technology, digital systems & platform security',
    isSuperAdmin: true
  },
  {
    username: 'Innovation & Technology Team',
    fullName: 'Innovation & Technology Team',
    role: 'admin',
    description: 'Technical innovation, systems engineering & platform support',
    isSuperAdmin: false
  }
];
