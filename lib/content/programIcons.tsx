/**
 * Maps program categories to Lucide icons. Replaces emoji icons with SVG.
 */
import {
  Monitor,
  Wifi,
  ClipboardList,
  HeartPulse,
  Factory,
  HardHat,
  Cloud,
  Shield,
  BarChart3,
  Briefcase,
  Cpu,
  type LucideIcon,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'digital-literacy': Monitor,
  'it-cyber': Wifi,
  'ai-software': Cpu,
  'cloud-data': Cloud,
  'business': ClipboardList,
  'healthcare': HeartPulse,
  'manufacturing': Factory,
};

export function getProgramIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? Monitor;
}
