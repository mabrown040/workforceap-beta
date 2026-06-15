'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Metrics {
  totalMembers: number;
  enrolledMembers: number;
  completedMembers: number;
  placedMembers: number;
  placementRate: number;
  completionRate: number;
  avgSalary: number;
  salaryRange: { min: number; max: number };
}

interface ProgramStat {
  slug: string;
  title: string;
  enrollments: number;
  completions: number;
  placements: number;
  completionRate: number;
  placementRate: number;
}

interface OutcomesData {
  metrics: Metrics;
  programStats: ProgramStat[];
}

export default function OutcomesDashboard() {
  const [data, setData] = useState<OutcomesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/outcomes');
      if (!res.ok) {
        throw new Error(`Failed to load: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load outcomes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading outcomes data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { metrics, programStats } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Outcomes Dashboard</h1>
          <p className="text-slate-500 mt-1">Placement rates, salary data, and program effectiveness</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm text-slate-500">Total Members</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">
            {metrics.totalMembers.toLocaleString()}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-slate-500">Placement Rate</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">
            {metrics.placementRate}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {metrics.placedMembers} placed / {metrics.enrolledMembers} enrolled
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-slate-500">Completion Rate</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">
            {metrics.completionRate}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {metrics.completedMembers} completed / {metrics.enrolledMembers} enrolled
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-slate-500">Avg. Salary</div>
          <div className="text-3xl font-bold text-rose-600 mt-1">
            ${metrics.avgSalary.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Range: ${metrics.salaryRange.min.toLocaleString()} - ${metrics.salaryRange.max.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Program Stats */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Program Effectiveness</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-500">Program</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Enrolled</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Completed</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Placed</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Completion %</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Placement %</th>
              </tr>
            </thead>
            <tbody>
              {programStats.map((program) => (
                <tr key={program.slug} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{program.title}</td>
                  <td className="text-right py-3 px-4 text-slate-600">{program.enrollments}</td>
                  <td className="text-right py-3 px-4 text-slate-600">{program.completions}</td>
                  <td className="text-right py-3 px-4 text-slate-600">{program.placements}</td>
                  <td className="text-right py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      program.completionRate >= 70 ? 'bg-emerald-100 text-emerald-700' :
                      program.completionRate >= 40 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {program.completionRate}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      program.placementRate >= 50 ? 'bg-emerald-100 text-emerald-700' :
                      program.placementRate >= 25 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {program.placementRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
