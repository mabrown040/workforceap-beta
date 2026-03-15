'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ResourceCategory, ResourceStage } from '@/lib/content/memberResources';
import { CATEGORIES, STAGES } from '@/lib/content/memberResources';

type ResourceFiltersProps = {
  selectedCategory: ResourceCategory | '';
  selectedStage: ResourceStage | '';
  onCategoryChange: (cat: ResourceCategory | '') => void;
  onStageChange: (stage: ResourceStage | '') => void;
};

export default function ResourceFilters({
  selectedCategory,
  selectedStage,
  onCategoryChange,
  onStageChange,
}: ResourceFiltersProps) {
  const [tagFilter, setTagFilter] = useState('');

  const clearFilters = useCallback(() => {
    onCategoryChange('');
    onStageChange('');
    setTagFilter('');
  }, [onCategoryChange, onStageChange]);

  const hasActiveFilters = selectedCategory || selectedStage || tagFilter;

  return (
    <div className="resource-filters" role="search" aria-label="Filter resources">
      <div className="resource-filters-row">
        <div className="resource-filter-group">
          <label htmlFor="filter-category" className="resource-filter-label">
            Category
          </label>
          <select
            id="filter-category"
            value={selectedCategory}
            onChange={(e) => onCategoryChange((e.target.value || '') as ResourceCategory | '')}
            className="resource-filter-select"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="resource-filter-group">
          <label htmlFor="filter-stage" className="resource-filter-label">
            Career stage
          </label>
          <select
            id="filter-stage"
            value={selectedStage}
            onChange={(e) => onStageChange((e.target.value || '') as ResourceStage | '')}
            className="resource-filter-select"
            aria-label="Filter by career stage"
          >
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="resource-filter-clear"
            aria-label="Clear all filters"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
