import { AuthRole } from '@/types/domain';

export type ReportSeedUser = {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
  team: string;
  password: string;
  mustChangePassword?: boolean;
};

export const reportAuthSeedUsers: ReportSeedUser[] = [
  {
    id: 'user_shift_lead',
    email: 'shift.lead@agrireports.local',
    name: 'Shift Lead',
    role: 'author',
    team: 'Field Operations',
    password: 'demo123'
  },
  {
    id: 'user_farm_manager',
    email: 'farm.manager@agrireports.local',
    name: 'Farm / Project Manager',
    role: 'manager',
    team: 'Management',
    password: 'demo123'
  },
  {
    id: 'user_finance_controller',
    email: 'finance.controller@agrireports.local',
    name: 'Finance Controller',
    role: 'author',
    team: 'Finance',
    password: 'demo123'
  },
  {
    id: 'user_general_manager',
    email: 'general.manager@agrireports.local',
    name: 'General Manager',
    role: 'manager',
    team: 'Management',
    password: 'demo123'
  },
  {
    id: 'user_qa_lead',
    email: 'qa.lead@agrireports.local',
    name: 'QA Lead',
    role: 'author',
    team: 'Quality Assurance',
    password: 'demo123'
  },
  {
    id: 'user_operations_director',
    email: 'operations.director@agrireports.local',
    name: 'Operations Director',
    role: 'reviewer',
    team: 'Executive',
    password: 'demo123'
  },
  {
    id: 'user_regional_manager',
    email: 'regional.manager@agrireports.local',
    name: 'Regional Manager',
    role: 'reviewer',
    team: 'Regional Management',
    password: 'demo123'
  },
  {
    id: 'user_farm_ops_lead',
    email: 'farm.ops.lead@agrireports.local',
    name: 'Farm Operations Lead',
    role: 'author',
    team: 'Operations',
    password: 'demo123'
  }
];
