'use client';

import { useScrollAffordance } from '@/components/portal/useScrollAffordance';

export default function SalaryTableWrapper({ children }: { children: React.ReactNode }) {
  const scrollRef = useScrollAffordance<HTMLDivElement>();
  return (
    <div className="salary-table-wrapper" ref={scrollRef}>
      {children}
    </div>
  );
}
