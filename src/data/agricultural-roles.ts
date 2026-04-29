import { AgriculturalRole } from '../types/domain';

export const agriculturalRoleTemplates: Record<string, AgriculturalRole> = {
  // Management & Planning Roles
  farm_manager: {
    category: 'management',
    engagementType: 'full_time',
    hourlyRate: 275,
    monthlyBase: 53625,
    totalCostToEmployer: 58500,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'permanent',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Avg. R571,714/yr gross; +8% in Cape Town; bonus ~R21k/yr'
  },
  operations_supervisor: {
    category: 'management',
    engagementType: 'full_time',
    hourlyRate: 85,
    monthlyBase: 16575,
    totalCostToEmployer: 18100,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'permanent',
      overtimeEligible: true
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: '2-3x minimum wage; varies by experience & farm size'
  },
  agronomist: {
    category: 'management',
    engagementType: 'contract',
    hourlyRate: 180,
    monthlyBase: 35100,
    totalCostToEmployer: 38300,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'retainer',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Specialist rates; remote consultation may reduce cost'
  },
  financial_controller: {
    category: 'management',
    engagementType: 'part_time',
    hourlyRate: 150,
    monthlyBase: 29250,
    totalCostToEmployer: 31900,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'outsourced',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Often shared across multiple farms to reduce fixed cost'
  },
  procurement_officer: {
    category: 'management',
    engagementType: 'full_time',
    hourlyRate: 95,
    monthlyBase: 18525,
    totalCostToEmployer: 20200,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'permanent',
      overtimeEligible: true
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Can be combined with admin role in smaller operations'
  },
  risk_compliance_officer: {
    category: 'management',
    engagementType: 'contract',
    hourlyRate: 120,
    monthlyBase: 23400,
    totalCostToEmployer: 25500,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'consultant',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Critical for export compliance; often outsourced'
  },

  // Field Operations Roles
  harvest_picker: {
    category: 'field_operations',
    engagementType: 'casual',
    hourlyRate: 30.23,
    monthlyBase: 5895,
    totalCostToEmployer: 6430,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'fixed_term_seasonal',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'National minimum wage effective 1 March 2026; piece-rate options may increase effective pay'
  },
  field_laborer: {
    category: 'field_operations',
    engagementType: 'casual',
    hourlyRate: 30.23,
    monthlyBase: 5895,
    totalCostToEmployer: 6430,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'fixed_term_seasonal',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Same minimum; overtime at 1.5x after 45 hrs/week'
  },
  weeding_crew: {
    category: 'field_operations',
    engagementType: 'seasonal',
    hourlyRate: 30.23,
    monthlyBase: 5895,
    totalCostToEmployer: 6430,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'fixed_term_seasonal',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Skilled weeders may command premium in labor-scarce regions'
  },
  planting_crew: {
    category: 'field_operations',
    engagementType: 'seasonal',
    hourlyRate: 30.23,
    monthlyBase: 5895,
    totalCostToEmployer: 6430,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'fixed_term_seasonal',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Precision planting experience adds value'
  },
  crop_scout: {
    category: 'field_operations',
    engagementType: 'part_time',
    hourlyRate: 45,
    monthlyBase: 8775,
    totalCostToEmployer: 9570,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'seasonal',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Requires training; often paid per ha scouted'
  },
  spray_team: {
    category: 'field_operations',
    engagementType: 'seasonal',
    hourlyRate: 50,
    monthlyBase: 9750,
    totalCostToEmployer: 10630,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'contract',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Pesticide applicator certification required; liability premium'
  },
  irrigation_technician: {
    category: 'field_operations',
    engagementType: 'seasonal',
    hourlyRate: 55,
    monthlyBase: 10725,
    totalCostToEmployer: 11700,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'contract',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Technical skill premium; on-call availability adds cost'
  },
  tractor_operator: {
    category: 'field_operations',
    engagementType: 'contract',
    hourlyRate: 60,
    monthlyBase: 11700,
    totalCostToEmployer: 12760,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'seasonal',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Licensed operator premium; equipment responsibility factor'
  },
  land_prep_crew_lead: {
    category: 'field_operations',
    engagementType: 'seasonal',
    hourlyRate: 40,
    monthlyBase: 7800,
    totalCostToEmployer: 8510,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'fixed_term_seasonal',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Leadership premium over base labor rate'
  },
  harvest_crew_lead: {
    category: 'field_operations',
    engagementType: 'seasonal',
    hourlyRate: 42,
    monthlyBase: 8190,
    totalCostToEmployer: 8930,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'fixed_term_seasonal',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Quality control responsibility; often piece-rate + base'
  },

  // Post-Harvest & Processing Roles
  grader_sorter: {
    category: 'post_harvest',
    engagementType: 'casual',
    hourlyRate: 32,
    monthlyBase: 6240,
    totalCostToEmployer: 6810,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'fixed_term_seasonal',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Visual acuity premium; speed/accuracy bonuses common'
  },
  packer: {
    category: 'post_harvest',
    engagementType: 'casual',
    hourlyRate: 30.23,
    monthlyBase: 5895,
    totalCostToEmployer: 6430,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'fixed_term_seasonal',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Minimum wage base; productivity incentives may apply'
  },
  packhouse_supervisor: {
    category: 'post_harvest',
    engagementType: 'full_time',
    hourlyRate: 70,
    monthlyBase: 13650,
    totalCostToEmployer: 14890,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'seasonal',
      overtimeEligible: true
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Quality control + team management responsibility'
  },
  cold_chain_handler: {
    category: 'post_harvest',
    engagementType: 'seasonal',
    hourlyRate: 38,
    monthlyBase: 7410,
    totalCostToEmployer: 8080,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'contract',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Temperature monitoring certification adds value'
  },
  qa_officer: {
    category: 'post_harvest',
    engagementType: 'contract',
    hourlyRate: 65,
    monthlyBase: 12675,
    totalCostToEmployer: 13820,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'contract',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Food safety certification (GAP/HACCP) required'
  },
  value_add_processor: {
    category: 'post_harvest',
    engagementType: 'seasonal',
    hourlyRate: 40,
    monthlyBase: 7800,
    totalCostToEmployer: 8510,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'contract',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Processing skills (drying, blanching) command premium'
  },

  // Logistics & Support Roles
  driver_light_vehicle: {
    category: 'logistics',
    engagementType: 'contract',
    hourlyRate: 45,
    monthlyBase: 8775,
    totalCostToEmployer: 9570,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'contract',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Valid Code 8/10 license required; fuel allowance often separate'
  },
  transport_coordinator: {
    category: 'logistics',
    engagementType: 'full_time',
    hourlyRate: 75,
    monthlyBase: 14625,
    totalCostToEmployer: 15950,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'permanent',
      overtimeEligible: true
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Route optimization skills reduce overall logistics cost'
  },
  inventory_clerk: {
    category: 'logistics',
    engagementType: 'part_time',
    hourlyRate: 35,
    monthlyBase: 6825,
    totalCostToEmployer: 7440,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'permanent',
      overtimeEligible: true
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Basic digital literacy (barcode/QR) adds value'
  },
  market_liaison: {
    category: 'logistics',
    engagementType: 'contract',
    hourlyRate: 50,
    monthlyBase: 9750,
    totalCostToEmployer: 10630,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'commission',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Base + % of sales; aligns cost with revenue generation'
  },
  multi_skilled_field_agent: {
    category: 'logistics',
    engagementType: 'casual',
    hourlyRate: 42,
    monthlyBase: 8190,
    totalCostToEmployer: 8930,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'permanent',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Cross-training premium; reduces total headcount needed'
  },

  // Technical & Specialist Roles
  agricultural_technician: {
    category: 'technical',
    engagementType: 'full_time',
    hourlyRate: 147,
    monthlyBase: 28665,
    totalCostToEmployer: 31250,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'permanent',
      overtimeEligible: true
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Avg. salary R306,583/yr; higher in Gauteng (+30%)'
  },
  precision_ag_technician: {
    category: 'technical',
    engagementType: 'contract',
    hourlyRate: 373,
    monthlyBase: 72735,
    totalCostToEmployer: 79300,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'project',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Avg. R775,477/yr; specialized GIS/drone skills'
  },
  soil_technician: {
    category: 'technical',
    engagementType: 'contract',
    hourlyRate: 85,
    monthlyBase: 16575,
    totalCostToEmployer: 18080,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'project',
      overtimeEligible: true
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Lab coordination + field sampling skills'
  },
  data_collector: {
    category: 'technical',
    engagementType: 'casual',
    hourlyRate: 40,
    monthlyBase: 7800,
    totalCostToEmployer: 8510,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'project',
      overtimeEligible: true
    },
    cashflowTiming: 'weekly_payroll',
    austerityRestricted: false,
    notes: 'Mobile data tool proficiency (ODK, Kobo) adds value'
  },
  gis_mapping_assistant: {
    category: 'technical',
    engagementType: 'contract',
    hourlyRate: 95,
    monthlyBase: 18525,
    totalCostToEmployer: 20200,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'project',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'QGIS/ArcGIS competency; often remote work possible'
  },

  // Quality, Safety & Compliance Roles
  food_safety_officer: {
    category: 'quality_safety',
    engagementType: 'contract',
    hourlyRate: 80,
    monthlyBase: 15600,
    totalCostToEmployer: 17000,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'consultant',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'GAP/HACCP certification required; audit prep premium'
  },
  ohs_representative: {
    category: 'quality_safety',
    engagementType: 'part_time',
    hourlyRate: 55,
    monthlyBase: 10725,
    totalCostToEmployer: 11700,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'designated',
      overtimeEligible: true
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Legally required for farms >10 employees; training provided'
  },
  labor_compliance_officer: {
    category: 'quality_safety',
    engagementType: 'contract',
    hourlyRate: 70,
    monthlyBase: 13650,
    totalCostToEmployer: 14890,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'outsourced',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Critical for avoiding penalties; often shared across co-op'
  },
  environmental_steward: {
    category: 'quality_safety',
    engagementType: 'part_time',
    hourlyRate: 60,
    monthlyBase: 11700,
    totalCostToEmployer: 12760,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'volunteer',
      overtimeEligible: true
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Sustainability reporting skills increasingly valued'
  },

  // Support & Administrative Roles
  administrative_assistant: {
    category: 'support',
    engagementType: 'part_time',
    hourlyRate: 45,
    monthlyBase: 8775,
    totalCostToEmployer: 9570,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'permanent',
      overtimeEligible: true
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Basic office software + agri-context knowledge'
  },
  payroll_administrator: {
    category: 'support',
    engagementType: 'part_time',
    hourlyRate: 85,
    monthlyBase: 16575,
    totalCostToEmployer: 18080,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'outsourced',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Agri-specific payroll complexity (seasonal, piece-rate)'
  },
  it_digital_support: {
    category: 'support',
    engagementType: 'contract',
    hourlyRate: 95,
    monthlyBase: 18525,
    totalCostToEmployer: 20200,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'on_call',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Agri-app troubleshooting; often remote support'
  },
  training_coordinator: {
    category: 'support',
    engagementType: 'contract',
    hourlyRate: 75,
    monthlyBase: 14625,
    totalCostToEmployer: 15950,
    employerCostMultiplier: 1.09,
    statutoryCompliance: {
      uifRegistered: true,
      contractType: 'consultant',
      overtimeEligible: false
    },
    cashflowTiming: 'monthly_payroll',
    austerityRestricted: false,
    notes: 'Adult learning + agri-content development skills'
  }
};

export const categoryLabels: Record<string, string> = {
  management: 'Management & Planning',
  field_operations: 'Field Operations',
  post_harvest: 'Post-Harvest & Processing',
  logistics: 'Logistics & Support',
  technical: 'Technical & Specialist',
  quality_safety: 'Quality, Safety & Compliance',
  support: 'Support & Administrative'
};

export const categoryIcons: Record<string, string> = {
  management: '👔',
  field_operations: '🌾',
  post_harvest: '📦',
  logistics: '🚚',
  technical: '🔬',
  quality_safety: '✅',
  support: '💼'
};
