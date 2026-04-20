'use client';

import { BarChart3, Filter, Grid, List, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { categoryIcons, categoryLabels } from '@/data/agricultural-roles';
import { useTaskOpsStore } from '@/store/use-task-ops-store';
import { calculateTeamSummary } from '@/utils/export';
import { formatCurrency } from '@/utils/agricultural-import-validator';

type SortKey = 'name' | 'monthlyCost' | 'hourlyRate';
type AnalyticsView = 'overview' | 'roster';

export function LaborCostAnalytics() {
  const { users } = useTaskOpsStore();
  const summary = calculateTeamSummary(users);
  const [activeView, setActiveView] = useState<AnalyticsView>('overview');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [engagementFilter, setEngagementFilter] = useState<'all' | string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('monthlyCost');
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);

  const agriUsers = useMemo(() => users.filter((user) => user.agriculturalRole), [users]);

  const categoryData = useMemo(
    () =>
      Object.entries(summary.byCategory)
        .map(([category, data]) => ({
          category,
          label: categoryLabels[category] || category,
          icon: categoryIcons[category] || '📋',
          ...data,
          percentage: summary.totalMonthlyCost > 0 ? (data.totalCost / summary.totalMonthlyCost) * 100 : 0
        }))
        .sort((a, b) => b.totalCost - a.totalCost),
    [summary.byCategory, summary.totalMonthlyCost]
  );

  const engagementData = useMemo(
    () =>
      Object.entries(summary.byEngagementType)
        .map(([type, count]) => ({
          type,
          label: type.replace(/_/g, ' '),
          count,
          percentage: summary.totalWorkers > 0 ? (count / summary.totalWorkers) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count),
    [summary.byEngagementType, summary.totalWorkers]
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return agriUsers
      .filter((user) => {
        const role = user.agriculturalRole!;
        const matchesSearch =
          normalizedSearch.length === 0 ||
          user.name.toLowerCase().includes(normalizedSearch) ||
          categoryLabels[role.category].toLowerCase().includes(normalizedSearch) ||
          role.engagementType.replace(/_/g, ' ').toLowerCase().includes(normalizedSearch);
        const matchesCategory = categoryFilter === 'all' || role.category === categoryFilter;
        const matchesEngagement = engagementFilter === 'all' || role.engagementType === engagementFilter;
        return matchesSearch && matchesCategory && matchesEngagement;
      })
      .sort((left, right) => {
        const leftRole = left.agriculturalRole!;
        const rightRole = right.agriculturalRole!;
        if (sortKey === 'name') return left.name.localeCompare(right.name);
        if (sortKey === 'hourlyRate') return rightRole.hourlyRate - leftRole.hourlyRate;
        return rightRole.totalCostToEmployer - leftRole.totalCostToEmployer;
      });
  }, [agriUsers, categoryFilter, engagementFilter, searchTerm, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const pagedUsers = filteredUsers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const fixedCost = agriUsers
    .filter((user) => ['full_time', 'part_time'].includes(user.agriculturalRole!.engagementType))
    .reduce((sum, user) => sum + user.agriculturalRole!.totalCostToEmployer, 0);
  const variableCost = agriUsers
    .filter((user) => ['seasonal', 'casual', 'contract'].includes(user.agriculturalRole!.engagementType))
    .reduce((sum, user) => sum + user.agriculturalRole!.totalCostToEmployer, 0);

  if (summary.totalWorkers === 0) {
    return (
      <div className="p-12 text-center bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border border-gray-700">
        <div className="p-4 bg-gray-700/50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <BarChart3 size={40} className="text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">No Agricultural Team Data</h3>
        <p className="text-gray-400">Import agricultural roles to see labor cost analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Labor Cost Command View</div>
            <h3 className="text-2xl font-bold text-white">Same rich palette, fewer competing panels.</h3>
            <p className="max-w-3xl text-sm text-slate-300">
              Switch between a high-level overview and the detailed roster. The screen now shows one decision context at a time instead of every module at once.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 p-1.5">
            <button
              onClick={() => setActiveView('overview')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeView === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('roster')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeView === 'roster' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              Workforce roster
            </button>
          </div>
        </div>
      </section>

      {activeView === 'overview' ? (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
            <section className="rounded-2xl border border-slate-700 bg-gradient-to-br from-blue-950/35 via-slate-900 to-slate-950 p-6 shadow-lg">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Primary focus</div>
                  <h4 className="mt-2 text-3xl font-bold text-white">{formatCurrency(summary.totalMonthlyCost)}</h4>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">
                    Total monthly labor exposure anchored by {categoryData[0]?.label ?? 'your largest category'} and a statutory burden of{' '}
                    {summary.totalMonthlyCost > 0 ? ((summary.totalStatutoryCosts / summary.totalMonthlyCost) * 100).toFixed(1) : 0}%.
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-blue-700/40 bg-slate-950/70 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Workers</div>
                    <div className="mt-1 text-2xl font-bold text-white">{summary.totalWorkers}</div>
                  </div>
                  <div className="rounded-2xl border border-emerald-700/40 bg-slate-950/70 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Average</div>
                    <div className="mt-1 text-2xl font-bold text-white">{formatCurrency(summary.averageCostPerWorker)}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-lg">
              <div className="text-sm font-semibold text-white">Three quick reads</div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-blue-700/30 bg-blue-950/25 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Fixed cost base</div>
                  <div className="mt-2 text-2xl font-bold text-white">{formatCurrency(fixedCost)}</div>
                </div>
                <div className="rounded-2xl border border-emerald-700/30 bg-emerald-950/25 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Variable cost pool</div>
                  <div className="mt-2 text-2xl font-bold text-white">{formatCurrency(variableCost)}</div>
                </div>
                <div className="rounded-2xl border border-amber-700/30 bg-amber-950/25 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Annual projection</div>
                  <div className="mt-2 text-2xl font-bold text-white">{formatCurrency(summary.totalMonthlyCost * 12)}</div>
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.8fr)]">
            <section className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-lg">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white">Cost by Category</h3>
                  <p className="mt-1 text-sm text-slate-400">One primary chart, ranked for comparison.</p>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {categoryData.length} categories
                </div>
              </div>
              <div className="space-y-4">
                {categoryData.map((category) => (
                  <div key={category.category} className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-lg">{category.icon}</div>
                        <div>
                          <div className="font-semibold text-white">{category.label}</div>
                          <div className="text-xs text-slate-400">{category.count} workers</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-cyan-300">{formatCurrency(category.totalCost)}</div>
                        <div className="text-xs text-slate-400">{category.percentage.toFixed(1)}% of spend</div>
                      </div>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" style={{ width: `${category.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-lg">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">Workforce Mix</h3>
                <p className="mt-1 text-sm text-slate-400">Secondary composition only, kept compact.</p>
              </div>
              <div className="space-y-3">
                {engagementData.map((engagement) => (
                  <div key={engagement.type} className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold capitalize text-white">{engagement.label}</div>
                        <div className="text-sm text-slate-400">{engagement.count} workers</div>
                      </div>
                      <div className="text-3xl font-bold text-emerald-300">{engagement.percentage.toFixed(0)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : (
        <section className="space-y-6 rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-lg">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,0.65fr))]">
            <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              <Search size={16} className="text-slate-500" />
              <input
                className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by worker, category, or engagement"
              />
            </label>
            <label className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                <Filter size={14} />
                Category
              </div>
              <select className="w-full bg-transparent text-white outline-none" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setCurrentPage(1); }}>
                <option value="all">All categories</option>
                {categoryData.map((category) => <option key={category.category} value={category.category}>{category.label}</option>)}
              </select>
            </label>
            <label className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Engagement</div>
              <select className="w-full bg-transparent text-white outline-none" value={engagementFilter} onChange={(event) => { setEngagementFilter(event.target.value); setCurrentPage(1); }}>
                <option value="all">All engagements</option>
                {engagementData.map((engagement) => <option key={engagement.type} value={engagement.type}>{engagement.label}</option>)}
              </select>
            </label>
            <label className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Sort</div>
              <select className="w-full bg-transparent text-white outline-none" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                <option value="monthlyCost">Highest monthly cost</option>
                <option value="hourlyRate">Highest hourly rate</option>
                <option value="name">Name A-Z</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-blue-700/30 bg-blue-950/25 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-blue-300">Monthly</div>
                <div className="mt-2 text-2xl font-bold text-white">{formatCurrency(summary.totalMonthlyCost)}</div>
              </div>
              <div className="rounded-2xl border border-emerald-700/30 bg-emerald-950/25 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-emerald-300">Filtered</div>
                <div className="mt-2 text-2xl font-bold text-white">{filteredUsers.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 p-1">
              <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><List size={16} />Table</button>
              <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Grid size={16} />Cards</button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/80">
                  <tr className="border-b border-slate-700">
                    <th className="p-4 text-left font-semibold text-slate-300">Worker</th>
                    <th className="p-4 text-left font-semibold text-slate-300">Category</th>
                    <th className="p-4 text-left font-semibold text-slate-300">Engagement</th>
                    <th className="p-4 text-right font-semibold text-slate-300">Hourly Rate</th>
                    <th className="p-4 text-right font-semibold text-slate-300">Monthly Cost</th>
                    <th className="p-4 text-center font-semibold text-slate-300">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user) => {
                    const role = user.agriculturalRole!;
                    return (
                      <tr key={user.id} className="border-b border-slate-800/80 bg-slate-950/30 transition-colors hover:bg-slate-900/60">
                        <td className="p-4 font-semibold text-white">{user.name}</td>
                        <td className="p-4 text-slate-300"><span className="flex items-center gap-2"><span className="text-lg">{categoryIcons[role.category]}</span><span>{categoryLabels[role.category]}</span></span></td>
                        <td className="p-4"><span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs capitalize text-slate-200">{role.engagementType.replace(/_/g, ' ')}</span></td>
                        <td className="p-4 text-right font-semibold text-emerald-400">{formatCurrency(role.hourlyRate)}</td>
                        <td className="p-4 text-right text-base font-bold text-white">{formatCurrency(role.totalCostToEmployer)}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            {role.statutoryCompliance.uifRegistered ? <span className="rounded-full border border-emerald-700/50 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">UIF</span> : null}
                            {role.statutoryCompliance.overtimeEligible ? <span className="rounded-full border border-amber-700/50 bg-amber-500/15 px-2 py-1 text-xs text-amber-300">OT</span> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {pagedUsers.map((user) => {
                const role = user.agriculturalRole!;
                return (
                  <article key={user.id} className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-white">{user.name}</h4>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-300"><span className="text-lg">{categoryIcons[role.category]}</span>{categoryLabels[role.category]}</div>
                      </div>
                      <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs capitalize text-slate-200">{role.engagementType.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">Hourly</div><div className="mt-1 font-semibold text-emerald-400">{formatCurrency(role.hourlyRate)}</div></div>
                      <div className="rounded-xl border border-blue-700/30 bg-blue-950/30 p-3"><div className="text-xs uppercase tracking-[0.16em] text-blue-300">Monthly</div><div className="mt-1 text-lg font-bold text-white">{formatCurrency(role.totalCostToEmployer)}</div></div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-400">
              Showing {pagedUsers.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, filteredUsers.length)} of {filteredUsers.length} workers
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-400">
                Rows
                <select className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" value={rowsPerPage} onChange={(event) => { setRowsPerPage(Number(event.target.value)); setCurrentPage(1); }}>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={20}>20</option>
                </select>
              </label>
              <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 disabled:opacity-40" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>Previous</button>
              <span className="text-sm text-slate-400">Page {currentPage} of {totalPages}</span>
              <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 disabled:opacity-40" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>Next</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
