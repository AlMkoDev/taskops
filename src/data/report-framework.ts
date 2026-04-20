import { ReportPeriodDefinition, ReportRecord, ReportRoleDefinition, RoleCategory } from '@/types/domain';

export const reportCategoryColors: Record<RoleCategory, { bg: string; text: string; dot: string }> = {
  Management: { bg: '#E6F1FB', text: '#0C447C', dot: '#378ADD' },
  'Field Ops': { bg: '#EAF3DE', text: '#3B6D11', dot: '#639922' },
  'Post-Harvest': { bg: '#FAECE7', text: '#712B13', dot: '#D85A30' },
  Logistics: { bg: '#FAEEDA', text: '#633806', dot: '#BA7517' },
  Technical: { bg: '#EEEDFE', text: '#3C3489', dot: '#7F77DD' },
  Compliance: { bg: '#FBEAF0', text: '#72243E', dot: '#D4537E' },
  Admin: { bg: '#F1EFE8', text: '#444441', dot: '#888780' }
};

function role(
  id: string,
  name: string,
  category: RoleCategory,
  description: string,
  items: ReportRoleDefinition['items']
): ReportRoleDefinition {
  return { id, name, category, description, items };
}

export const reportPeriods: ReportPeriodDefinition[] = [
  {
    id: 'daily',
    label: 'Daily',
    cadence: 'End of each working day',
    audience: 'Supervisor / Farm Manager',
    format: 'Mobile capture, field register, or WhatsApp summary',
    roles: [
      role('farm_manager_daily', 'Farm / Project Manager', 'Management', 'Daily oversight, exceptions, and safety decisions.', [
        { id: 'daily_labour_attendance', label: 'Worker attendance and absenteeism', status: 'warning', trigger: 'Absenteeism above 10% triggers staffing escalation.', source: 'Timesheet / crew roster', required: true },
        { id: 'daily_operations_progress', label: 'Field operations progress vs daily plan', status: 'on_track', trigger: 'Completion below 85% triggers catch-up planning.', source: 'Manual supervisor update', required: true },
        { id: 'daily_weather_impact', label: 'Weather observations and impact flags', status: 'warning', trigger: 'Rainfall, heat, or wind delays trigger operational replanning.', source: 'Weather API + manual note' },
        { id: 'daily_safety_incidents', label: 'Safety incidents or near misses', status: 'critical', trigger: 'Any incident requires same-day review.', source: 'OHS register', required: true }
      ]),
      role('operations_supervisor_daily', 'Operations Supervisor', 'Management', 'Labour coordination, equipment uptime, and block execution.', [
        { id: 'daily_team_allocation', label: 'Team headcount and task allocation', status: 'on_track', trigger: 'Headcount gap triggers reallocation.', source: 'Supervisor roster', required: true },
        { id: 'daily_equipment_uptime', label: 'Equipment availability and downtime', status: 'warning', trigger: 'Downtime above 2 hours triggers maintenance escalation.', source: 'Maintenance log' },
        { id: 'daily_block_progress', label: 'Section or block progress updates', status: 'on_track', trigger: 'Slip against planned block sequence triggers exception note.', source: 'Field log', required: true }
      ]),
      role('agronomist_daily', 'Agronomist / Crop Advisor', 'Management', 'Crop health, irrigation, and intervention readiness.', [
        { id: 'daily_growth_stage', label: 'Crop growth stage observations', status: 'on_track', trigger: 'Unexpected stage lag triggers agronomy review.', source: 'Field scouting form', required: true },
        { id: 'daily_pest_pressure', label: 'Pest or disease threshold alerts', status: 'critical', trigger: 'Threshold exceedance pauses routine plans and raises intervention action.', source: 'Scouting counts', required: true },
        { id: 'daily_irrigation_coverage', label: 'Irrigation run duration and coverage', status: 'warning', trigger: 'Coverage gaps trigger irrigation fault check.', source: 'Irrigation log / sensor' }
      ]),
      role('field_labour_daily', 'Field Labour', 'Field Ops', 'Execution notes from labour crews.', [
        { id: 'daily_area_completed', label: 'Rows or beds worked and area completed', status: 'on_track', trigger: 'Coverage below target triggers crew support.', source: 'Crew tally', required: true },
        { id: 'daily_field_issues', label: 'Issues encountered in the field', status: 'warning', trigger: 'Tool, terrain, or access issues trigger supervisor follow-up.', source: 'Manual note' }
      ]),
      role('qa_daily', 'QA / Packhouse Officer', 'Post-Harvest', 'Quality and non-conformance checks.', [
        { id: 'daily_quality_score', label: 'Incoming produce quality score', status: 'warning', trigger: 'Grade drift below threshold triggers QA review.', source: 'QC checklist', required: true },
        { id: 'daily_non_conformance', label: 'Non-conformances raised', status: 'critical', trigger: 'Any food safety breach triggers hold and escalation.', source: 'QA register' },
        { id: 'daily_cold_chain', label: 'Cold room temperature and humidity logs', status: 'on_track', trigger: 'Out-of-range readings trigger cold chain intervention.', source: 'Sensor / logger', required: true }
      ])
    ]
  },
  {
    id: 'weekly',
    label: 'Weekly',
    cadence: 'Every Friday',
    audience: 'Farm Manager and department leads',
    format: 'Structured weekly report with action list',
    roles: [
      role('farm_manager_weekly', 'Farm / Project Manager', 'Management', 'Weekly progress, variance, and next-week work planning.', [
        { id: 'weekly_wbs_progress', label: 'WBS phase progress vs schedule', status: 'warning', trigger: 'Critical path slip triggers recovery plan.', source: 'TaskOps schedule', required: true },
        { id: 'weekly_labour_utilisation', label: 'Labour utilisation planned vs actual', status: 'warning', trigger: 'Variance above 10% triggers staffing adjustment.', source: 'Labour roster + actuals', required: true },
        { id: 'weekly_budget_variance', label: 'Budget variance actual vs planned spend', status: 'warning', trigger: 'Variance above threshold triggers finance review.', source: 'Budget tracker' },
        { id: 'weekly_next_week', label: 'Upcoming week work programme', status: 'on_track', trigger: 'Missing next-step plan blocks approval.', source: 'Planning board', required: true }
      ]),
      role('operations_supervisor_weekly', 'Operations Supervisor', 'Management', 'Weekly operating efficiency and equipment health.', [
        { id: 'weekly_block_progress', label: 'Block-by-block operation progress', status: 'on_track', trigger: 'Delayed blocks trigger resource rebalance.', source: 'Field reports', required: true },
        { id: 'weekly_equipment_util', label: 'Equipment utilisation and downtime hours', status: 'warning', trigger: 'Downtime above threshold triggers maintenance action.', source: 'Maintenance log' },
        { id: 'weekly_overtime', label: 'Overtime summary and compliance check', status: 'warning', trigger: 'Excess overtime triggers labour compliance review.', source: 'Timesheets' }
      ]),
      role('me_weekly', 'M&E Officer', 'Technical', 'Data quality, KPI completeness, and deviations.', [
        { id: 'weekly_data_quality', label: 'Data completeness and quality issues', status: 'warning', trigger: 'Completeness below 95% triggers cleanup sprint.', source: 'Form audit', required: true },
        { id: 'weekly_kpi_flags', label: 'KPI deviations and emerging exception flags', status: 'warning', trigger: 'Repeated KPI drift triggers management escalation.', source: 'KPI tracker' },
        { id: 'weekly_source_health', label: 'Source-system capture health', status: 'on_track', trigger: 'Broken collection pipelines trigger technical response.', source: 'Integrations / manual checks' }
      ]),
      role('compliance_weekly', 'Compliance / OHS Officer', 'Compliance', 'Weekly safety and compliance readiness.', [
        { id: 'weekly_ppe', label: 'PPE compliance trend', status: 'warning', trigger: 'Compliance below threshold triggers retraining.', source: 'Safety audit', required: true },
        { id: 'weekly_incidents', label: 'Incident and near-miss trend', status: 'critical', trigger: 'Incident recurrence triggers CAPA review.', source: 'Incident log' },
        { id: 'weekly_audit_readiness', label: 'Audit-readiness gaps', status: 'warning', trigger: 'Missing evidence triggers corrective action owner.', source: 'Compliance checklist' }
      ])
    ]
  },
  {
    id: 'monthly',
    label: 'Monthly',
    cadence: 'Last working day of the month',
    audience: 'Owners, investors, and co-op management',
    format: 'Formal report with tables, graphs, and variance analysis',
    roles: [
      role('finance_monthly', 'Financial Controller', 'Admin', 'Financial reconciliation and cost reporting.', [
        { id: 'monthly_cost_per_hectare', label: 'Cost per hectare or acre', status: 'warning', trigger: 'Cost drift triggers budget correction.', source: 'Finance ledger', required: true },
        { id: 'monthly_budget_actual', label: 'Budget vs actual variance analysis', status: 'warning', trigger: 'Material variance requires root-cause note.', source: 'Monthly budget pack', required: true },
        { id: 'monthly_cashflow', label: 'Cash flow and payable pressure', status: 'warning', trigger: 'Cash shortfall triggers management intervention.', source: 'Treasury / AP report' }
      ]),
      role('agronomist_monthly', 'Agronomist / Crop Advisor', 'Management', 'Yield projection, crop condition, and input efficiency.', [
        { id: 'monthly_yield_projection', label: 'Yield projection vs seasonal target', status: 'warning', trigger: 'Projection miss above 5% triggers mitigation plan.', source: 'Yield model', required: true },
        { id: 'monthly_soil_trends', label: 'Soil nutrient and pH trends', status: 'warning', trigger: 'Trend deterioration triggers soil intervention.', source: 'Lab tests / field notes' },
        { id: 'monthly_input_roi', label: 'Input application effectiveness', status: 'on_track', trigger: 'Poor ROI triggers agronomy change recommendation.', source: 'Input records + crop response' }
      ]),
      role('qa_monthly', 'QA / Packhouse Officer', 'Post-Harvest', 'Quality, rejects, and certification readiness.', [
        { id: 'monthly_grade_trend', label: 'Grade-out trend and reject reasons', status: 'warning', trigger: 'Reject trend above tolerance triggers process review.', source: 'Packhouse QA data', required: true },
        { id: 'monthly_food_safety', label: 'Food safety and non-conformance closure', status: 'critical', trigger: 'Open major non-conformance blocks sign-off.', source: 'QA CAPA tracker', required: true },
        { id: 'monthly_traceability', label: 'Traceability and lot-record completeness', status: 'on_track', trigger: 'Traceability gaps trigger audit hold.', source: 'Lot tracking register' }
      ]),
      role('me_monthly', 'M&E Officer', 'Technical', 'KPI narrative and monthly deviations.', [
        { id: 'monthly_kpi_pack', label: 'Monthly KPI pack completeness', status: 'on_track', trigger: 'Missing KPI pack blocks circulation.', source: 'Dashboard export', required: true },
        { id: 'monthly_deviation_story', label: 'Deviation analysis and root cause clustering', status: 'warning', trigger: 'Repeated variance pattern triggers leadership action.', source: 'KPI review notes' }
      ])
    ]
  },
  {
    id: 'quarterly',
    label: 'Quarterly',
    cadence: 'End of each quarter',
    audience: 'Board, funders, and strategic partners',
    format: 'Executive narrative with ESG and financial highlights',
    roles: [
      role('manager_quarterly', 'Farm / Project Manager', 'Management', 'Quarterly strategic performance narrative.', [
        { id: 'quarterly_strategy', label: 'Seasonal performance vs strategic targets', status: 'warning', trigger: 'Strategic miss triggers board commentary.', source: 'Quarterly management review', required: true },
        { id: 'quarterly_risks', label: 'Risk register update and mitigation progress', status: 'warning', trigger: 'Open critical risk triggers board attention.', source: 'Risk register', required: true },
        { id: 'quarterly_resource_efficiency', label: 'Resource allocation efficiency', status: 'on_track', trigger: 'Inefficient resource use triggers redesign.', source: 'Operations analytics' }
      ]),
      role('finance_quarterly', 'Financial Controller', 'Admin', 'Quarterly cost, margin, and capital story.', [
        { id: 'quarterly_margin', label: 'Gross margin and operating variance', status: 'warning', trigger: 'Margin pressure triggers cost review.', source: 'Finance pack', required: true },
        { id: 'quarterly_capex', label: 'Capital spend and equipment lifecycle health', status: 'warning', trigger: 'Capex slippage triggers executive decision.', source: 'Capex tracker' }
      ]),
      role('compliance_quarterly', 'Compliance / OHS Officer', 'Compliance', 'Quarterly ESG and audit posture.', [
        { id: 'quarterly_esg', label: 'ESG and sustainability metrics', status: 'warning', trigger: 'Metric deterioration requires action note.', source: 'ESG dashboard', required: true },
        { id: 'quarterly_regulatory', label: 'Regulatory and labour compliance readiness', status: 'on_track', trigger: 'Open findings require closure owners.', source: 'Compliance calendar' }
      ])
    ]
  },
  {
    id: 'closeout',
    label: 'Closeout',
    cadence: 'End of season or project',
    audience: 'All stakeholders and auditors',
    format: 'Audit-ready closeout pack with signatures',
    roles: [
      role('manager_closeout', 'Farm / Project Manager', 'Management', 'End-of-cycle delivery summary and lessons learned.', [
        { id: 'closeout_outcomes', label: 'Final delivery outcomes vs original targets', status: 'warning', trigger: 'Missed targets require accountable lessons learned.', source: 'Season closeout review', required: true },
        { id: 'closeout_lessons', label: 'Lessons learned and next-cycle recommendations', status: 'on_track', trigger: 'Missing learning blocks closeout sign-off.', source: 'Retrospective notes', required: true }
      ]),
      role('finance_closeout', 'Financial Controller', 'Admin', 'Final reconciliation and audit narrative.', [
        { id: 'closeout_financial_recon', label: 'Final financial reconciliation', status: 'warning', trigger: 'Unreconciled balances block closeout.', source: 'Finance closeout workbook', required: true },
        { id: 'closeout_cost_audit', label: 'Input utilisation and waste audit', status: 'warning', trigger: 'High waste requires management action.', source: 'Stock and cost audit' }
      ]),
      role('qa_closeout', 'QA / Packhouse Officer', 'Post-Harvest', 'Quality and traceability closeout evidence.', [
        { id: 'closeout_quality', label: 'Final quality and market-realisation summary', status: 'warning', trigger: 'Unexpected downgrade trend requires narrative.', source: 'Quality summary', required: true },
        { id: 'closeout_traceability', label: 'Audit-ready traceability evidence pack', status: 'on_track', trigger: 'Missing evidence blocks archive completion.', source: 'Traceability file', required: true }
      ]),
      role('compliance_closeout', 'Compliance / OHS Officer', 'Compliance', 'Season-end compliance closure.', [
        { id: 'closeout_compliance', label: 'Open compliance actions and closure status', status: 'warning', trigger: 'Open critical actions block sign-off.', source: 'Compliance tracker', required: true },
        { id: 'closeout_signature', label: 'Digital sign-off readiness', status: 'on_track', trigger: 'Missing signatories delay archive.', source: 'Closeout checklist', required: true }
      ])
    ]
  }
];

export function getDefaultReportData(roleDefinition: ReportRoleDefinition) {
  return roleDefinition.items.reduce<Record<string, string>>((acc, item) => {
    acc[`${item.id}__status`] = item.status;
    acc[`${item.id}__note`] = '';
    return acc;
  }, {
    executive_summary: '',
    variance_root_cause: '',
    corrective_actions: ''
  });
}

export const initialReports: ReportRecord[] = [
  {
    id: 'report_daily_ops_001',
    title: 'Daily operations summary',
    period: 'daily',
    roleId: 'operations_supervisor_daily',
    roleName: 'Operations Supervisor',
    category: 'Management',
    status: 'draft',
    authorId: 'user_shift_lead',
    authorName: 'Shift Lead',
    reviewerId: 'user_farm_manager',
    reviewerName: 'Farm / Project Manager',
    reportingWindow: '18 Apr 2026',
    createdAt: '2026-04-18T05:30:00.000Z',
    updatedAt: '2026-04-18T06:10:00.000Z',
    lastSavedAt: '2026-04-18T06:10:00.000Z',
    data: {
      executive_summary: 'Field teams completed most of the irrigation and scouting plan, with one block delayed by a pump fault.',
      variance_root_cause: 'Pump pressure dropped in Block C which reduced run coverage.',
      corrective_actions: 'Maintenance booked for 14:00 and crew reallocated to Block B in the meantime.',
      daily_team_allocation__status: 'on_track',
      daily_team_allocation__note: 'Four crews assigned across planting, irrigation, and scouting.',
      daily_equipment_uptime__status: 'warning',
      daily_equipment_uptime__note: 'Pump 2 down for 90 minutes; backup unit engaged.',
      daily_block_progress__status: 'warning',
      daily_block_progress__note: 'Block C is 12% behind plan.'
    }
  },
  {
    id: 'report_monthly_fin_001',
    title: 'Monthly financial report',
    period: 'monthly',
    roleId: 'finance_monthly',
    roleName: 'Financial Controller',
    category: 'Admin',
    status: 'submitted',
    authorId: 'user_finance_controller',
    authorName: 'Finance Controller',
    reviewerId: 'user_general_manager',
    reviewerName: 'General Manager',
    reportingWindow: 'April 2026',
    createdAt: '2026-04-15T08:00:00.000Z',
    updatedAt: '2026-04-17T16:00:00.000Z',
    submittedAt: '2026-04-17T16:00:00.000Z',
    lastSavedAt: '2026-04-17T15:40:00.000Z',
    data: {
      executive_summary: 'Monthly spend remained within tolerance despite irrigation repairs and extra logistics cost.',
      variance_root_cause: 'Transport costs rose due to emergency cold-chain movement.',
      corrective_actions: 'Review standing cold-room contingency contract before next month.',
      monthly_cost_per_hectare__status: 'warning',
      monthly_cost_per_hectare__note: 'Cost per hectare is 6% above plan.',
      monthly_budget_actual__status: 'warning',
      monthly_budget_actual__note: 'Repair spend explains most of the variance.',
      monthly_cashflow__status: 'on_track',
      monthly_cashflow__note: 'No near-term liquidity issue.'
    }
  },
  {
    id: 'report_closeout_001',
    title: 'Season closeout quality pack',
    period: 'closeout',
    roleId: 'qa_closeout',
    roleName: 'QA / Packhouse Officer',
    category: 'Post-Harvest',
    status: 'approved',
    authorId: 'user_qa_lead',
    authorName: 'QA Lead',
    reviewerId: 'user_operations_director',
    reviewerName: 'Operations Director',
    reportingWindow: '2025/2026 Season',
    createdAt: '2026-04-02T10:00:00.000Z',
    updatedAt: '2026-04-10T14:00:00.000Z',
    submittedAt: '2026-04-08T09:30:00.000Z',
    reviewedAt: '2026-04-10T14:00:00.000Z',
    lastSavedAt: '2026-04-08T08:45:00.000Z',
    reviewComments: 'Approved with strong traceability evidence and clear market-realisation summary.',
    data: {
      executive_summary: 'Closeout confirms stable grade performance and complete traceability coverage across shipped lots.',
      variance_root_cause: 'Minor export downgrades were tied to weather-related bruising in late harvest.',
      corrective_actions: 'Introduce additional cushioning protocol for final-week harvest windows.',
      closeout_quality__status: 'warning',
      closeout_quality__note: 'Late-season bruise defects increased by 2.3%.',
      closeout_traceability__status: 'on_track',
      closeout_traceability__note: 'All lot records and dispatch logs verified.'
    }
  }
];
