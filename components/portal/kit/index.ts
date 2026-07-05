/**
 * Portal Design Kit — public barrel (Phase 0).
 * Spec: docs/PORTAL_DESIGN_KIT.md
 *
 * Phase 0 ships the foundation + primitives. Layout/data/persona components
 * (DataTable, AppShell*, FeatureTile, QueueRow, Kanban, ChatThread, …) land in
 * subsequent Phase 0 steps before any real page conversion.
 */
export { DesignSurface, useSurface, type SurfaceMode } from './DesignSurface';
export { StatTile } from './StatTile';
export { KpiStrip, type KpiItem } from './KpiStrip';
export { StatusTag } from './StatusTag';
export { SectionHeader } from './SectionHeader';
export { ProgressRing } from './ProgressRing';
export { ProgressBar } from './ProgressBar';
export { Avatar } from './Avatar';
export { DataTable, type Column } from './DataTable';
export { FeatureTile } from './FeatureTile';
export { QueueRow, type QueueTone } from './QueueRow';
export { WorkQueueItem } from './WorkQueueItem';
export { KanbanBoard, KanbanColumnHeader, type KanbanColumnData, type KanbanCardData } from './Kanban';
export { BarChartMini, RankBars, Sparkline, AreaChartMini, type ChartDatum, type RankDatum } from './Charts';
export {
  CardHead,
  DeltaChip,
  StatSparkTile,
  StageTrack,
  SegmentedProgress,
  type SparkStat,
} from './CommandCenter';
export { FormField, Toggle } from './FormField';
export { ChatThread, type ChatMessage } from './ChatThread';
export { AppShellSidebar, type NavItem, type NavGroup } from './AppShellSidebar';
export { AppShellMember, type MemberTab } from './AppShellMember';
export { UniversalSearch } from './UniversalSearch';
export { MemberDashboardKit, type MemberDashboardKitProps } from './MemberDashboardKit';
export { colorVar, type KitColor, type KitTone } from './tokens';
