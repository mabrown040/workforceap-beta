/**
 * Maps program categories and keys to Lucide icons.
 * Replaces emoji icons with SVG for consistent UI.
 */

import {
  Monitor,
  Wifi,
  ClipboardList,
  HeartPulse,
  Factory,
  HardHat,
  Award,
  Laptop,
  Handshake,
  Home,
  BookOpen,
  GraduationCap,
  FileText,
  User,
  Settings,
  Cloud,
  Cpu,
  BarChart3,
  Briefcase,
  Heart,
  Shield,
  Sparkles,
  Lightbulb,
  TrendingUp,
  Target,
  CheckCircle,
  DollarSign,
  Scale,
  Rocket,
  Users,
  Globe,
  LayoutDashboard,
  Mic,
  Calendar,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  'digital-literacy': Monitor,
  'it-cyber': Wifi,
  'ai-software': Cpu,
  'cloud-data': Cloud,
  business: ClipboardList,
  healthcare: HeartPulse,
  manufacturing: Factory,
};

/** Icon for construction programs (subset of manufacturing) */
export const CONSTRUCTION_ICON = HardHat;

/** Homepage program category labels to Lucide icons */
export const HOMEPAGE_CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Digital Literacy & AI': Monitor,
  'Information Technology': Wifi,
  'Project Management': ClipboardList,
  'Medical Coding': HeartPulse,
  'Manufacturing & Production': Factory,
  'Core Construction': HardHat,
};

/** What You Get section icons */
export const WYG_ICONS = {
  certifications: Award,
  laptop: Laptop,
  jobPlacement: Handshake,
};

/** Dashboard sidebar icons */
export const SIDEBAR_ICONS: Record<string, LucideIcon> = {
  Home: Home,
  'My Program': BookOpen,
  Training: GraduationCap,
  Resources: FileText,
  'Career Brief': ClipboardList,
  Learning: BookOpen,
  'Weekly Recap': BarChart3,
  'Career Readiness': ClipboardList,
  'My Profile': User,
  Settings: Settings,
  'AI Tools': Sparkles,
};

export function getProgramIcon(program: { category: string; slug: string }): LucideIcon {
  if (program.slug.includes('construction') || program.slug.includes('osha')) {
    return CONSTRUCTION_ICON;
  }
  return CATEGORY_ICON[program.category] ?? Monitor;
}

/** Generic UI icons for various pages */
export const UI_ICONS = {
  lightbulb: Lightbulb,
  trendingUp: TrendingUp,
  target: Target,
  check: CheckCircle,
  handshake: Handshake,
  dollarSign: DollarSign,
  scale: Scale,
  rocket: Rocket,
  users: Users,
  clipboard: ClipboardList,
  graduationCap: GraduationCap,
  bookOpen: BookOpen,
  globe: Globe,
};

/** Start Here card icons */
export const START_HERE_ICONS: Record<string, LucideIcon> = {
  'Build Resume': FileText,
  'Practice Interview': Mic,
  'Start Learning Path': BookOpen,
};

/** Admin sidebar icons */
export const ADMIN_SIDEBAR_ICONS: Record<string, LucideIcon> = {
  Overview: LayoutDashboard,
  Members: Users,
  Assessments: ClipboardList,
  Programs: BookOpen,
  Blog: FileText,
  Partners: Handshake,
  Pipeline: BarChart3,
};

/** FAQ section icons */
export const FAQ_ICONS: Record<string, LucideIcon> = {
  Admissions: ClipboardList,
  'Cost & Funding': DollarSign,
  'Programs & Training': GraduationCap,
  'Job Placement': Briefcase,
  'Schedule & Commitment': BarChart3,
};
