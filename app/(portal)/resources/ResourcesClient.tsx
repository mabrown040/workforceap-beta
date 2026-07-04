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
          <span
            className="material-symbols-outlined"
            aria-hidden
            style={{ fontSize: '1.75rem', opacity: 0.6 }}
          >
            filter_alt_off
          </span>
          <p style={{ fontWeight: 700, marginTop: '0.5rem' }}>
            {category || stage ? 'No resources match those filters.' : 'No resources available right now.'}
          </p>
          <p className="resource-empty-hint">
            {category || stage
              ? 'Try a different category or stage — or clear your filters to see everything we have.'
              : 'Check back soon, or explore your other career tools in the meantime.'}
          </p>
          {(category || stage) && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => {
                setCategory('');
                setStage('');
              }}
            >
              Clear filters
            </button>
          )}
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
