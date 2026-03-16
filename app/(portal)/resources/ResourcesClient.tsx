'use client';

import { useMemo, useState } from 'react';
import type { MemberResource, ResourceCategory, ResourceStage } from '@/lib/content/memberResources';
import ResourceCard from '@/components/portal/ResourceCard';
import ResourceFilters from '@/components/portal/ResourceFilters';

type ProgressRecord = { completedAt: string | Date | null; savedAt: string | Date | null };

type ResourcesClientProps = {
  resources: MemberResource[];
  progressByResource?: Record<string, ProgressRecord>;
};

export default function ResourcesClient({ resources, progressByResource = {} }: ResourcesClientProps) {
  const [category, setCategory] = useState<ResourceCategory | ''>('');
  const [stage, setStage] = useState<ResourceStage | ''>('');

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (category && r.category !== category) return false;
      if (stage && r.stage !== stage) return false;
      return true;
    });
  }, [resources, category, stage]);

  return (
    <>
      <ResourceFilters
        selectedCategory={category}
        selectedStage={stage}
        onCategoryChange={setCategory}
        onStageChange={setStage}
      />
      {filtered.length === 0 ? (
        <div className="resource-empty-state">
          <p>No resources match your filters.</p>
          <p className="resource-empty-hint">
            Try adjusting your filters, or explore our recommended next actions: Build your resume, practice interview questions, or start a learning path.
          </p>
        </div>
      ) : (
        <ul className="resource-grid">
          {filtered.map((r) => (
            <li key={r.id}>
              <ResourceCard resource={r} progress={progressByResource[r.id]} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
