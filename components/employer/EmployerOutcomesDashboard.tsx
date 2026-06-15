'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Metrics {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  newApplications: number;
  reviewedApplications: number;
  hiredApplications: number;
  rejectedApplications: number;
  conversionRate: number;
}

interface Job {
  id: string;
  title: string;
  status: string;
  applications: number;
}

interface ProgramStat {
  name: string;
  applications: number;
  hired: number;
  conversionRate: number;
}

interface EmployerOutcomesData {
  employer: {
    companyName: string;
    hiringPipelineActive: boolean;
  };
  metrics: Metrics;
  jobs: Job[];
  programStats: ProgramStat[];
}

export default function EmployerOutcomesDashboard() {
  const [data, setData] = useState<EmployerOutcomesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/employer/outcomes');
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
        <div className="text-slate-500">Loading hiring outcomes...</div>
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

  const { employer, metrics, jobs, programStats } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {employer.companyName} — Hiring Outcomes
          </h1>
          <p className="text-slate-500 mt-1">
            Pipeline effectiveness and conversion metrics
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Pipeline Status */}
      {!employer.hiringPipelineActive && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800">
          Your hiring pipeline is currently inactive. 
          <a href="/employer/loi" className="underline font-medium ml-1">
            Submit a Letter of Intent
          </a> to activate partnerships.
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm text-slate-500">Total Jobs</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">
            {metrics.totalJobs}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-slate-500">Active Jobs</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">
            {metrics.activeJobs}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-slate-500">Total Applications</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">
            {metrics.totalApplications}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-slate-500">Conversion Rate</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">
            {metrics.conversionRate}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {metrics.hiredApplications} hired / {metrics.totalApplications} applied
          </div>
        </Card>
      </div>

      {/* Application Funnel */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Application Funnel</h2>
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: 'New', value: metrics.newApplications, color: 'bg-slate-100 text-slate-700' },
            { label: 'Reviewed', value: metrics.reviewedApplications, color: 'bg-blue-100 text-blue-700' },
            { label: 'Hired', value: metrics.hiredApplications, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Rejected', value: metrics.rejectedApplications, color: 'bg-red-100 text-red-700' },
          ].map((stage) => (
            <div key={stage.label} className={`rounded-lg p-4 text-center ${stage.color}`}>
              <div className="text-2xl font-bold">{stage.value}</div>
              <div className="text-sm">{stage.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Jobs Table */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Job Postings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-500">Title</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Status</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Applications</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{job.title}</td>
                  <td className="text-right py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      job.status === 'live' ? 'bg-emerald-100 text-emerald-700' :
                      job.status === 'filled' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="text-right py-3 px-4 text-slate-600">{job.applications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Program Stats */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Program Effectiveness</h2>
        <p className="text-sm text-slate-500 mb-4">
          Which training programs produce the best candidates for your roles
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-500">Program</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Applications</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Hired</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Conversion %</th>
              </tr>
            </thead>
            <tbody>
              {programStats.map((program) => (
                <tr key={program.name} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{program.name}</td>
                  <td className="text-right py-3 px-4 text-slate-600">{program.applications}</td>
                  <td className="text-right py-3 px-4 text-slate-600">{program.hired}</td>
                  <td className="text-right py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      program.conversionRate >= 50 ? 'bg-emerald-100 text-emerald-700' :
                      program.conversionRate >= 25 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {program.conversionRate}%
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
