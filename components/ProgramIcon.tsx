'use client';

import { Monitor, Wifi, ClipboardList, HeartPulse, Factory, HardHat, Cpu, Cloud, Briefcase } from 'lucide-react';
import type { Program } from '@/lib/content/programs';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'digital-literacy': Monitor,
  'ai-software': Cpu,
  'cloud-data': Cloud,
  'it-cyber': Wifi,
  'business': Briefcase,
  'healthcare': HeartPulse,
  'manufacturing': Factory,
};

export function ProgramIcon({ program, size = 28, className = 'text-current' }: { program: Program; size?: number; className?: string }) {
  const Icon = program.slug.includes('construction') ? HardHat : (CATEGORY_ICONS[program.category] ?? Monitor);
  return <Icon size={size} className={className} />;
}
