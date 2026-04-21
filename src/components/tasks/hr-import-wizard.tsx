'use client';

import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { useTaskOpsStore } from '@/store/use-task-ops-store';
import { agriculturalRoleTemplates, categoryIcons, categoryLabels } from '@/data/agricultural-roles';
import { formatCurrency } from '@/utils/agricultural-import-validator';

type WizardStep = 'categories' | 'roles' | 'configure' | 'confirm';

interface HrImportWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

export function HrImportWizard({ onClose, onComplete }: HrImportWizardProps) {
  const { importAgriculturalRoles } = useTaskOpsStore();
  const [step, setStep] = useState<WizardStep>('categories');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleQuantities, setRoleQuantities] = useState<Record<string, number>>({});
  const [teamName, setTeamName] = useState('Field Operations');

  const categories = Array.from(
    new Set(Object.values(agriculturalRoleTemplates).map((r) => r.category))
  );

  const getRolesByCategory = (category: string) => {
    return Object.entries(agriculturalRoleTemplates).filter(([, role]) => role.category === category);
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
      const role = agriculturalRoleTemplates[roleKey];
      const quantity = roleQuantities[roleKey] || 1;
      return total + role.totalCostToEmployer * quantity;
    }, 0);
  };

  const handleImport = () => {
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
            <h2 className="text-2xl font-bold text-white">Import Agricultural Roles</h2>
            <p className="text-sm text-gray-300 mt-1">Add SA-compliant HR roles with cost tracking</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-300 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {(['categories', 'roles', 'configure', 'confirm'] as WizardStep[]).map((s, i) => {
              const steps = ['categories', 'roles', 'configure', 'confirm'];
              const currentIndex = steps.indexOf(step);
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
                  {i < 3 && (
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
          {/* Step 1: Category Selection */}
          {step === 'categories' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4 text-white">Select Categories</h3>
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

          {/* Step 2: Role Selection */}
          {step === 'roles' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4 text-white">Select Roles</h3>
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
                                  {roleKey.replace(/_/g, ' ')}
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
                                  {role.engagementType.replace('_', ' ')}
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

          {/* Step 3: Configuration */}
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
                    const role = agriculturalRoleTemplates[roleKey];
                    const quantity = roleQuantities[roleKey] || 1;

                    return (
                      <div
                        key={roleKey}
                        className="flex items-center justify-between p-4 border border-gray-700 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-white capitalize">
                            {roleKey.replace(/_/g, ' ')}
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

          {/* Step 4: Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4 text-white">Review & Import</h3>
              
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
                        const role = agriculturalRoleTemplates[roleKey];
                        const quantity = roleQuantities[roleKey] || 1;
                        const total = role.totalCostToEmployer * quantity;

                        return (
                          <tr key={roleKey} className="border-t border-gray-700 hover:bg-gray-800/50 transition-colors">
                            <td className="p-4 capitalize text-white">{roleKey.replace(/_/g, ' ')}</td>
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
                    <strong className="text-yellow-300">✓ Compliance Note:</strong> All roles meet SA minimum wage requirements (R30.23/hr).
                    UIF, SDL, and statutory costs are included in the employer cost.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
          <button
            onClick={step === 'categories' ? onClose : () => {
              const steps: WizardStep[] = ['categories', 'roles', 'configure', 'confirm'];
              const currentIndex = steps.indexOf(step);
              setStep(steps[currentIndex - 1]);
            }}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
          >
            <ChevronLeft size={16} />
            {step === 'categories' ? 'Cancel' : 'Back'}
          </button>

          <div className="text-sm text-gray-400">
            <span className="text-blue-400 font-semibold">{selectedRoles.length}</span> roles selected · <span className="text-purple-400 font-semibold">{totalWorkers}</span> workers
          </div>

          <button
            onClick={() => {
              const steps: WizardStep[] = ['categories', 'roles', 'configure', 'confirm'];
              const currentIndex = steps.indexOf(step);
              
              if (step === 'confirm') {
                handleImport();
              } else {
                setStep(steps[currentIndex + 1]);
              }
            }}
            disabled={
              (step === 'categories' && selectedCategories.length === 0) ||
              (step === 'roles' && selectedRoles.length === 0) ||
              (step === 'configure' && !teamName.trim())
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
