export const MINIMUM_WAGE_2026 = 30.23;
export const DEFAULT_EMPLOYER_MULTIPLIER = 1.09;

export function validateMinimumWage(hourlyRate: number): boolean {
  return hourlyRate >= MINIMUM_WAGE_2026;
}

export function calculateEmployerCost(baseWage: number, multiplier: number = DEFAULT_EMPLOYER_MULTIPLIER): number {
  return Math.round(baseWage * multiplier * 100) / 100;
}

export function calculateMonthlyBase(hourlyRate: number, hoursPerMonth: number = 195): number {
  return Math.round(hourlyRate * hoursPerMonth * 100) / 100;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateRoleImport(roleData: {
  hourlyRate?: number;
  monthlyBase?: number;
  totalCostToEmployer?: number;
  employerCostMultiplier?: number;
  team?: string;
  quantity?: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate minimum wage
  if (roleData.hourlyRate !== undefined) {
    if (!validateMinimumWage(roleData.hourlyRate)) {
      errors.push(`Hourly rate R${roleData.hourlyRate.toFixed(2)} is below minimum wage R${MINIMUM_WAGE_2026}`);
    }
  }

  // Validate team name
  if (roleData.team !== undefined && (!roleData.team || roleData.team.trim() === '')) {
    errors.push('Team name is required');
  }

  // Validate quantity
  if (roleData.quantity !== undefined) {
    if (roleData.quantity < 1) {
      errors.push('Quantity must be at least 1');
    }
    if (roleData.quantity > 100) {
      warnings.push(`Importing ${roleData.quantity} workers at once. Consider doing this in batches.`);
    }
  }

  // Validate cost calculations
  if (roleData.hourlyRate && roleData.monthlyBase) {
    const expectedMonthly = calculateMonthlyBase(roleData.hourlyRate);
    const variance = Math.abs(roleData.monthlyBase - expectedMonthly);
    if (variance > 100) {
      warnings.push(`Monthly base may be incorrect. Expected ~R${expectedMonthly.toFixed(2)} based on hourly rate`);
    }
  }

  if (roleData.monthlyBase && roleData.totalCostToEmployer && roleData.employerCostMultiplier) {
    const expectedTotal = calculateEmployerCost(roleData.monthlyBase, roleData.employerCostMultiplier);
    const variance = Math.abs(roleData.totalCostToEmployer - expectedTotal);
    if (variance > 100) {
      warnings.push(`Total cost to employer may be incorrect. Expected ~R${expectedTotal.toFixed(2)}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function calculateTotalCost(
  hourlyRate: number,
  quantity: number,
  hoursPerMonth: number = 195,
  employerMultiplier: number = DEFAULT_EMPLOYER_MULTIPLIER
): { monthlyBase: number; totalCost: number; statutoryCosts: number } {
  const monthlyBase = calculateMonthlyBase(hourlyRate, hoursPerMonth);
  const totalCost = calculateEmployerCost(monthlyBase, employerMultiplier) * quantity;
  const statutoryCosts = totalCost - (monthlyBase * quantity);

  return {
    monthlyBase: monthlyBase * quantity,
    totalCost,
    statutoryCosts
  };
}

export function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function validateDuplicateRoles(
  existingTeamNames: string[],
  newRoleName: string
): boolean {
  return existingTeamNames.some(
    name => name.toLowerCase() === newRoleName.toLowerCase()
  );
}
