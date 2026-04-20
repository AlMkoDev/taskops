import { User } from '@/types/domain';

export interface AgriculturalTeamExport {
  resourceType: string;
  roleId: string;
  roleName: string;
  category: string;
  engagementType: string;
  hourlyRate: number;
  monthlyBase: number;
  employerCostMultiplier: number;
  totalCostToEmployer: number;
  statutoryCompliance: {
    uifRegistered: boolean;
    contractType: string;
    overtimeEligible: boolean;
  };
  cashflowTiming: string;
  austerityRestricted: boolean;
}

export function exportAgriculturalTeam(users: User[]): AgriculturalTeamExport[] {
  const agriUsers = users.filter(u => u.agriculturalRole);
  
  return agriUsers.map(user => ({
    resourceType: 'human',
    roleId: user.id,
    roleName: user.name,
    category: user.agriculturalRole!.category,
    engagementType: user.agriculturalRole!.engagementType,
    hourlyRate: user.agriculturalRole!.hourlyRate,
    monthlyBase: user.agriculturalRole!.monthlyBase,
    employerCostMultiplier: user.agriculturalRole!.employerCostMultiplier,
    totalCostToEmployer: user.agriculturalRole!.totalCostToEmployer,
    statutoryCompliance: user.agriculturalRole!.statutoryCompliance,
    cashflowTiming: user.agriculturalRole!.cashflowTiming,
    austerityRestricted: user.agriculturalRole!.austerityRestricted
  }));
}

export function downloadTeamExport(users: User[], filename: string = 'agricultural-team-export.json'): void {
  const exportData = exportAgriculturalTeam(users);
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function calculateTeamSummary(users: User[]) {
  const agriUsers = users.filter(u => u.agriculturalRole);
  
  const totalMonthlyCost = agriUsers.reduce(
    (sum, user) => sum + user.agriculturalRole!.totalCostToEmployer, 
    0
  );
  
  const totalStatutoryCosts = agriUsers.reduce(
    (sum, user) => {
      const baseCost = user.agriculturalRole!.monthlyBase;
      const totalCost = user.agriculturalRole!.totalCostToEmployer;
      return sum + (totalCost - baseCost);
    },
    0
  );
  
  const byCategory = agriUsers.reduce((acc, user) => {
    const category = user.agriculturalRole!.category;
    if (!acc[category]) {
      acc[category] = { count: 0, totalCost: 0 };
    }
    acc[category].count += 1;
    acc[category].totalCost += user.agriculturalRole!.totalCostToEmployer;
    return acc;
  }, {} as Record<string, { count: number; totalCost: number }>);
  
  const byEngagementType = agriUsers.reduce((acc, user) => {
    const type = user.agriculturalRole!.engagementType;
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalWorkers: agriUsers.length,
    totalMonthlyCost,
    totalStatutoryCosts,
    averageCostPerWorker: agriUsers.length > 0 ? totalMonthlyCost / agriUsers.length : 0,
    byCategory,
    byEngagementType
  };
}
