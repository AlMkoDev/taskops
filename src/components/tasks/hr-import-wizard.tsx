'use client';

import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTaskOpsStore } from '../../store/use-task-ops-store';
import {
  WorkforceIndustry,
  categoryIcons,
  categoryLabels,
  industryCategoryMap,
  industryDescriptions,
  industryLabels,
  workforceRoleTemplates
} from '../../data/agricultural-roles';
import { User } from '../../types/domain';
import { formatCurrency } from '../../utils/agricultural-import-validator';

type ImportSource = 'templates' | 'csv';
type WizardStep = 'source' | 'industry' | 'upload' | 'mapping' | 'categories' | 'roles' | 'configure' | 'confirm';
type CsvColumnKey = 'name' | 'roleName' | 'team' | 'position' | 'quantity' | 'email' | 'capacityHoursPerWeek';

type ImportPreviewUser = User & {
  sourceRow: number;
  issueMessages: string[];
};

const csvColumnLabels: Record<CsvColumnKey, string> = {
  name: 'Member Name',
  roleName: 'Role / Position Name',
  team: 'Team / Department / Site',
  position: 'Position Title',
  quantity: 'Quantity',
  email: 'Email',
  capacityHoursPerWeek: 'Capacity / Week'
};

const csvColumnSynonyms: Record<CsvColumnKey, string[]> = {
  name: ['name', 'member name', 'employee name', 'worker name', 'person', 'full name'],
  roleName: ['role', 'role name', 'job title', 'position', 'position name', 'title', 'job role'],
  team: ['team', 'department', 'unit', 'site', 'location', 'branch', 'store', 'facility', 'plant', 'crew'],
  position: ['position', 'position title', 'job title', 'title'],
  quantity: ['quantity', 'qty', 'headcount', 'workers', 'count', 'number'],
  email: ['email', 'email address', 'work email'],
  capacityHoursPerWeek: ['capacity', 'capacity hours', 'capacity / week', 'weekly capacity', 'hours per week']
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [] as string[], rows: [] as Record<string, string>[] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = cells[index] ?? '';
      return record;
    }, {});
  });
  return { headers, rows };
}

function suggestColumn(headers: string[], key: CsvColumnKey) {
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeHeader(header) }));
  const synonyms = csvColumnSynonyms[key];
  return normalizedHeaders.find((item) => synonyms.includes(item.normalized))?.header ?? '';
}

interface HrImportWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

function labelFromToken(value: unknown, fallback = 'unknown') {
  return typeof value === 'string' && value.trim()
    ? value.replace(/_/g, ' ')
    : fallback;
}

export function HrImportWizard({ onClose, onComplete }: HrImportWizardProps) {
  const { importAgriculturalRoles, bulkAddUsers } = useTaskOpsStore();
  const [source, setSource] = useState<ImportSource>('templates');
  const [step, setStep] = useState<WizardStep>('source');
  const [selectedIndustry, setSelectedIndustry] = useState<WorkforceIndustry>('agriculture');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleQuantities, setRoleQuantities] = useState<Record<string, number>>({});
  const [teamName, setTeamName] = useState('Field Operations');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<CsvColumnKey, string>>({
    name: '',
    roleName: '',
    team: '',
    position: '',
    quantity: '',
    email: '',
    capacityHoursPerWeek: ''
  });

  const steps: WizardStep[] = source === 'templates'
    ? ['source', 'industry', 'categories', 'roles', 'configure', 'confirm']
    : ['source', 'upload', 'mapping', 'confirm'];
  const currentStepIndex = steps.indexOf(step);

  const categories = useMemo(() => {
    const availableCategories = Array.from(new Set(Object.values(workforceRoleTemplates).map((role) => role.category)));
    return industryCategoryMap[selectedIndustry].filter((category) => availableCategories.includes(category));
  }, [selectedIndustry]);

  const getRolesByCategory = (category: string) => {
    return Object.entries(workforceRoleTemplates).filter(([, role]) => {
      const roleIndustry = role.industry ?? 'agriculture';
      const isIndustryMatch = selectedIndustry === 'other'
        ? roleIndustry === 'other' || ['management', 'production', 'technical', 'quality_safety', 'customer_service', 'support'].includes(role.category)
        : roleIndustry === selectedIndustry;
      return role.category === category && isIndustryMatch;
    });
  };

  const handleIndustrySelect = (industry: WorkforceIndustry) => {
    setSelectedIndustry(industry);
    setSelectedCategories([]);
    setSelectedRoles([]);
    setRoleQuantities({});
    setTeamName(industry === 'agriculture' ? 'Field Operations' : industry === 'retail' ? 'Store Operations' : 'Operations');
  };

  const handleSourceSelect = (nextSource: ImportSource) => {
    setSource(nextSource);
    setStep(nextSource === 'templates' ? 'industry' : 'upload');
  };

  const handleCsvFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    const nextMapping = (Object.keys(csvColumnLabels) as CsvColumnKey[]).reduce<Record<CsvColumnKey, string>>((mapping, key) => {
      mapping[key] = suggestColumn(parsed.headers, key);
      return mapping;
    }, {
      name: '',
      roleName: '',
      team: '',
      position: '',
      quantity: '',
      email: '',
      capacityHoursPerWeek: ''
    });

    setCsvFileName(file.name);
    setCsvHeaders(parsed.headers);
    setCsvRows(parsed.rows);
    setColumnMapping(nextMapping);
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleRoleToggle = (roleKey: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey]
    );
    if (!roleQuantities[roleKey]) {
      setRoleQuantities((prev) => ({ ...prev, [roleKey]: 1 }));
    }
  };

  const handleQuantityChange = (roleKey: string, quantity: number) => {
    setRoleQuantities((prev) => ({ ...prev, [roleKey]: Math.max(1, quantity) }));
  };

  const calculateTotalCost = () => {
    return selectedRoles.reduce((total, roleKey) => {
      const role = workforceRoleTemplates[roleKey];
      const quantity = roleQuantities[roleKey] || 1;
      return total + role.totalCostToEmployer * quantity;
    }, 0);
  };

  const csvPreview = useMemo<ImportPreviewUser[]>(() => {
    const getValue = (row: Record<string, string>, key: CsvColumnKey) => {
      const header = columnMapping[key];
      return header ? (row[header] ?? '').trim() : '';
    };

    const preview: ImportPreviewUser[] = [];
    csvRows.forEach((row, rowIndex) => {
      const roleName = getValue(row, 'roleName') || getValue(row, 'position') || getValue(row, 'name');
      const explicitName = getValue(row, 'name');
      const rowTeam = getValue(row, 'team') || teamName || 'Unassigned';
      const rowPosition = getValue(row, 'position') || roleName;
      const rawQuantity = getValue(row, 'quantity');
      const quantity = rawQuantity ? Number(rawQuantity) : 1;
      const capacity = Number(getValue(row, 'capacityHoursPerWeek')) || 40;
      const email = getValue(row, 'email');
      const rowIssues: string[] = [];

      if (!roleName) rowIssues.push('Missing role or position name.');
      if (!Number.isInteger(quantity) || quantity < 1) rowIssues.push('Quantity must be a whole number greater than zero.');
      if (email && quantity > 1) rowIssues.push('Email is only applied when quantity is 1.');

      if (!roleName || !Number.isInteger(quantity) || quantity < 1) {
        preview.push({
          id: `csv_error_${rowIndex}`,
          name: explicitName || roleName || `Row ${rowIndex + 2}`,
          role: 'member',
          team: rowTeam,
          position: rowPosition || undefined,
          capacityHoursPerWeek: capacity,
          email: email || undefined,
          sourceRow: rowIndex + 2,
          issueMessages: rowIssues
        });
        return;
      }

      for (let count = 0; count < quantity; count += 1) {
        const name = explicitName && quantity === 1 ? explicitName : `${roleName} ${count + 1}`;
        preview.push({
          id: `csv_${Date.now()}_${rowIndex}_${count}`,
          name,
          role: 'member',
          team: rowTeam,
          position: rowPosition || undefined,
          capacityHoursPerWeek: capacity,
          email: quantity === 1 ? email || undefined : undefined,
          sourceRow: rowIndex + 2,
          issueMessages: rowIssues
        });
      }
    });

    const nameCounts = preview.reduce<Record<string, number>>((counts, user) => {
      const normalized = user.name.trim().toLowerCase();
      if (normalized) counts[normalized] = (counts[normalized] ?? 0) + 1;
      return counts;
    }, {});

    return preview.map((user) => ({
      ...user,
      issueMessages: nameCounts[user.name.trim().toLowerCase()] > 1
        ? [...user.issueMessages, 'Duplicate member name in preview.']
        : user.issueMessages
    }));
  }, [columnMapping, csvRows, teamName]);

  const csvBlockingIssues = csvPreview.filter((user) =>
    user.issueMessages.some((issue) => issue.startsWith('Missing') || issue.startsWith('Quantity'))
  );

  const handleImport = () => {
    if (source === 'csv') {
      const importableUsers = csvPreview
        .filter((user) => !csvBlockingIssues.some((issueUser) => issueUser.id === user.id))
        .map<User>(({ sourceRow, issueMessages, ...user }) => user);
      bulkAddUsers(importableUsers);
      onComplete();
      return;
    }

    const roleImports = selectedRoles.map((roleKey) => ({
      roleKey,
      quantity: roleQuantities[roleKey] || 1,
      team: teamName
    }));

    console.log('Importing roles:', roleImports);
    importAgriculturalRoles(roleImports);
    
    // Force localStorage save
    setTimeout(() => {
      const stored = localStorage.getItem('taskops-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('Verified localStorage after import:', {
          usersCount: parsed.state?.users?.length || 0
        });
      }
    }, 100);
    
    onComplete();
  };

  const totalWorkers = selectedRoles.reduce((sum, role) => sum + (roleQuantities[role] || 1), 0);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
          <div>
            <h2 className="text-2xl font-bold text-white">Import Job Roles</h2>
            <p className="text-sm text-gray-300 mt-1">Add workforce roles with cost, compliance, and staffing assumptions</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-300 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {steps.map((s, i) => {
              const currentIndex = currentStepIndex;
              const stepIndex = steps.indexOf(s);
              const isActive = stepIndex <= currentIndex;
              const isCurrent = step === s;

              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        isCurrent
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                          : isActive
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {isActive && !isCurrent ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs mt-2 ${
                      isCurrent ? 'text-blue-400 font-semibold' : isActive ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-1 mx-2 rounded-full bg-gray-700">
                      <div
                        className="h-1 rounded-full transition-all duration-300 bg-gradient-to-r from-blue-500 to-green-500"
                        style={{ width: isActive ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-900 to-gray-800">
          {/* Step 1: Import Source */}
          {step === 'source' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Choose Import Source</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Start from built-in workforce templates or upload a CSV from your HR, payroll, or planning spreadsheet.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  onClick={() => handleSourceSelect('templates')}
                  className={`p-5 border-2 rounded-xl text-left transition-all ${source === 'templates' ? 'border-blue-500 bg-gradient-to-br from-blue-900/40 to-purple-900/40 shadow-lg shadow-blue-500/20' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'}`}
                >
                  <div className="font-semibold text-white text-base">Use role templates</div>
                  <div className="text-sm text-gray-400 mt-2">Pick an industry, choose roles, set quantities, and import a starting team structure.</div>
                </button>
                <button
                  onClick={() => handleSourceSelect('csv')}
                  className={`p-5 border-2 rounded-xl text-left transition-all ${source === 'csv' ? 'border-blue-500 bg-gradient-to-br from-blue-900/40 to-purple-900/40 shadow-lg shadow-blue-500/20' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'}`}
                >
                  <div className="font-semibold text-white text-base">Upload CSV</div>
                  <div className="text-sm text-gray-400 mt-2">Map spreadsheet columns like Job Title, Department, Quantity, Email, and Capacity before importing.</div>
                </button>
              </div>
            </div>
          )}

          {/* CSV Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Upload CSV</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Use a comma-separated file with a header row. XLSX can be exported to CSV from Excel, Google Sheets, or payroll tools.
                </p>
              </div>
              <label className="block rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/50 p-6 text-center transition-colors hover:border-blue-500">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => void handleCsvFile(event.target.files?.[0] ?? null)}
                />
                <div className="font-semibold text-white">{csvFileName || 'Choose a CSV file'}</div>
                <div className="mt-2 text-sm text-gray-400">Recommended columns: Role Name, Team, Quantity, Position, Email, Capacity / Week.</div>
              </label>
              {csvRows.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-400">Rows</div>
                    <div className="mt-1 text-2xl font-bold text-white">{csvRows.length}</div>
                  </div>
                  <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-400">Columns</div>
                    <div className="mt-1 text-2xl font-bold text-white">{csvHeaders.length}</div>
                  </div>
                  <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-400">Preview Members</div>
                    <div className="mt-1 text-2xl font-bold text-white">{csvPreview.length}</div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* CSV Mapping */}
          {step === 'mapping' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Map Columns</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Match spreadsheet headers to TaskOps profile fields. Role / Position Name is the only required mapping.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(Object.keys(csvColumnLabels) as CsvColumnKey[]).map((key) => (
                  <label key={key} className="block rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                    <span className="mb-2 block text-sm font-medium text-gray-300">{csvColumnLabels[key]}</span>
                    <select
                      value={columnMapping[key]}
                      onChange={(event) => setColumnMapping((current) => ({ ...current, [key]: event.target.value }))}
                      className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
                    >
                      <option value="">Not mapped</option>
                      {csvHeaders.map((header) => <option key={header} value={header}>{header}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div className={csvBlockingIssues.length > 0 ? 'rounded-xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-200' : 'rounded-xl border border-green-700 bg-green-950/30 p-4 text-sm text-green-200'}>
                {csvBlockingIssues.length > 0
                  ? `${csvBlockingIssues.length} row${csvBlockingIssues.length === 1 ? '' : 's'} need a role/position name or valid quantity before import.`
                  : `${csvPreview.length} member profile${csvPreview.length === 1 ? '' : 's'} ready to preview.`}
              </div>
            </div>
          )}

          {/* Step 1: Industry Selection */}
          {step === 'industry' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Choose an Industry Template</h3>
                <p className="mt-1 text-sm text-gray-400">
                  This only tunes examples and suggested roles. The imported people still become normal team members that you can edit later.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(Object.keys(industryLabels) as WorkforceIndustry[]).map((industry) => {
                  const isSelected = selectedIndustry === industry;
                  return (
                    <button
                      key={industry}
                      onClick={() => handleIndustrySelect(industry)}
                      className={`p-5 border-2 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-gradient-to-br from-blue-900/40 to-purple-900/40 shadow-lg shadow-blue-500/20'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                      }`}
                    >
                      <div className="font-semibold text-white text-base">{industryLabels[industry]}</div>
                      <div className="text-sm text-gray-400 mt-2">{industryDescriptions[industry]}</div>
                      {isSelected && <div className="mt-3 text-xs text-blue-400 font-semibold">✓ Selected</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Category Selection */}
          {step === 'categories' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Select Role Categories</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {industryLabels[selectedIndustry]} templates are grouped into operating categories. Pick the categories that match this import.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {categories.map((category) => {
                  const roleCount = getRolesByCategory(category).length;
                  const isSelected = selectedCategories.includes(category);

                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryToggle(category)}
                      className={`p-5 border-2 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-gradient-to-br from-blue-900/40 to-purple-900/40 shadow-lg shadow-blue-500/20'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                      }`}
                    >
                      <div className="text-3xl mb-3">{categoryIcons[category]}</div>
                      <div className="font-semibold text-white text-base">{categoryLabels[category]}</div>
                      <div className="text-sm text-gray-400 mt-1">{roleCount} roles available</div>
                      {isSelected && (
                        <div className="mt-2 text-xs text-blue-400 font-semibold">✓ Selected</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Role Selection */}
          {step === 'roles' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4 text-white">Select Job Roles</h3>
              <div className="space-y-6">
                {selectedCategories.map((category) => (
                  <div key={category}>
                    <h4 className="font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <span className="text-xl">{categoryIcons[category]}</span>
                      <span>{categoryLabels[category]}</span>
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {getRolesByCategory(category).map(([roleKey, role]) => {
                        const isSelected = selectedRoles.includes(roleKey);

                        return (
                          <button
                            key={roleKey}
                            onClick={() => handleRoleToggle(roleKey)}
                            className={`p-4 border-2 rounded-xl text-left transition-all ${
                              isSelected
                                ? 'border-green-500 bg-gradient-to-r from-green-900/30 to-blue-900/30 shadow-lg shadow-green-500/20'
                                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-semibold text-white capitalize text-base">
                                  {labelFromToken(roleKey)}
                                </div>
                                <div className="text-sm text-gray-400 mt-1">{role.notes}</div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="font-bold text-green-400 text-lg">
                                  {formatCurrency(role.hourlyRate)}/hr
                                </div>
                                <div className="text-sm text-blue-400 mt-1">
                                  {formatCurrency(role.totalCostToEmployer)}/mo
                                </div>
                                <div className="text-xs text-gray-500 mt-1 capitalize px-2 py-1 bg-gray-700 rounded inline-block">
                                  {labelFromToken(role.engagementType)}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-2 text-xs text-green-400 font-semibold">✓ Selected</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Configuration */}
          {step === 'configure' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4 text-white">Configure Import</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                    placeholder="Enter team name"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Worker Quantities
                  </label>
                  {selectedRoles.map((roleKey) => {
                    const role = workforceRoleTemplates[roleKey];
                    const quantity = roleQuantities[roleKey] || 1;

                    return (
                      <div
                        key={roleKey}
                        className="flex items-center justify-between p-4 border border-gray-700 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-white capitalize">
                            {labelFromToken(roleKey)}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            {formatCurrency(role.totalCostToEmployer)} per worker
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <button
                            onClick={() => handleQuantityChange(roleKey, quantity - 1)}
                            className="w-9 h-9 rounded-lg border border-gray-600 hover:bg-gray-700 hover:border-gray-500 flex items-center justify-center text-white transition-colors"
                            disabled={quantity <= 1}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) => handleQuantityChange(roleKey, parseInt(e.target.value) || 1)}
                            className="w-16 text-center px-2 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-semibold"
                            min="1"
                          />
                          <button
                            onClick={() => handleQuantityChange(roleKey, quantity + 1)}
                            className="w-9 h-9 rounded-lg border border-gray-600 hover:bg-gray-700 hover:border-gray-500 flex items-center justify-center text-white transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-5 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700 rounded-xl mt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-blue-300">Total Workers</div>
                      <div className="text-3xl font-bold text-white">{totalWorkers}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-purple-300">Monthly Cost</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {formatCurrency(calculateTotalCost())}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4 text-white">Review & Import</h3>

              {source === 'csv' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Profiles</div>
                      <div className="mt-1 text-2xl font-bold text-white">{csvPreview.length}</div>
                    </div>
                    <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Blocking Issues</div>
                      <div className="mt-1 text-2xl font-bold text-white">{csvBlockingIssues.length}</div>
                    </div>
                    <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Source</div>
                      <div className="mt-1 truncate text-lg font-bold text-white">{csvFileName || 'CSV'}</div>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-auto rounded-xl border border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-800">
                        <tr>
                          <th className="p-3 text-left text-gray-300">Row</th>
                          <th className="p-3 text-left text-gray-300">Member</th>
                          <th className="p-3 text-left text-gray-300">Position</th>
                          <th className="p-3 text-left text-gray-300">Team</th>
                          <th className="p-3 text-left text-gray-300">Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(0, 50).map((user) => (
                          <tr key={user.id} className="border-t border-gray-700">
                            <td className="p-3 text-gray-400">{user.sourceRow}</td>
                            <td className="p-3 text-white">{user.name}</td>
                            <td className="p-3 text-gray-300">{user.position ?? 'Not set'}</td>
                            <td className="p-3 text-gray-300">{user.team}</td>
                            <td className={user.issueMessages.length > 0 ? 'p-3 text-yellow-200' : 'p-3 text-green-300'}>
                              {user.issueMessages.length > 0 ? user.issueMessages.join(' ') : 'Ready'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvPreview.length > 50 ? <div className="text-sm text-gray-400">Showing first 50 preview rows.</div> : null}
                </div>
              ) : (
              <div className="space-y-3">
                <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <div className="text-sm text-gray-400">Team Name</div>
                  <div className="font-semibold text-white text-lg">{teamName}</div>
                </div>

                <div className="border border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="text-left p-4 text-gray-300 font-semibold">Role</th>
                        <th className="text-center p-4 text-gray-300 font-semibold">Qty</th>
                        <th className="text-right p-4 text-gray-300 font-semibold">Cost/Mo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRoles.map((roleKey) => {
                        const role = workforceRoleTemplates[roleKey];
                        const quantity = roleQuantities[roleKey] || 1;
                        const total = role.totalCostToEmployer * quantity;

                        return (
                          <tr key={roleKey} className="border-t border-gray-700 hover:bg-gray-800/50 transition-colors">
                            <td className="p-4 capitalize text-white">{labelFromToken(roleKey)}</td>
                            <td className="p-4 text-center text-gray-300">{quantity}</td>
                            <td className="p-4 text-right font-semibold text-blue-400">{formatCurrency(total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 font-bold">
                      <tr className="border-t border-gray-700">
                        <td className="p-4 text-white">Total</td>
                        <td className="p-4 text-center text-white">{totalWorkers}</td>
                        <td className="p-4 text-right text-2xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                          {formatCurrency(calculateTotalCost())}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="p-4 bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-700 rounded-xl">
                  <div className="text-sm text-yellow-200">
                    <strong className="text-yellow-300">✓ Compliance Note:</strong> Employer cost includes statutory assumptions where configured.
                    Review wages, certifications, licenses, overtime eligibility, and local rules before using the import for payroll decisions.
                  </div>
                </div>
              </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
          <button
            onClick={step === 'source' ? onClose : () => {
              const currentIndex = steps.indexOf(step);
              setStep(steps[currentIndex - 1]);
            }}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
          >
            <ChevronLeft size={16} />
            {step === 'source' ? 'Cancel' : 'Back'}
          </button>

          <div className="text-sm text-gray-400">
            {source === 'csv' ? (
              <><span className="text-blue-400 font-semibold">{csvRows.length}</span> source rows · <span className="text-purple-400 font-semibold">{csvPreview.length}</span> profiles</>
            ) : (
              <><span className="text-blue-400 font-semibold">{selectedRoles.length}</span> roles selected · <span className="text-purple-400 font-semibold">{totalWorkers}</span> workers</>
            )}
          </div>

          <button
            onClick={() => {
              const currentIndex = steps.indexOf(step);
              
              if (step === 'confirm') {
                handleImport();
              } else {
                setStep(steps[currentIndex + 1]);
              }
            }}
            disabled={
              (step === 'upload' && csvRows.length === 0) ||
              (step === 'mapping' && csvPreview.length === 0) ||
              (step === 'categories' && selectedCategories.length === 0) ||
              (step === 'roles' && selectedRoles.length === 0) ||
              (step === 'configure' && !teamName.trim()) ||
              (step === 'confirm' && source === 'csv' && (csvPreview.length === 0 || csvBlockingIssues.length > 0))
            }
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
          >
            {step === 'confirm' ? (
              <>
                <Check size={16} />
                Import to Team
              </>
            ) : (
              <>
                Next
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
