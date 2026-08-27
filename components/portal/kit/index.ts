/**
 * Portal Design Kit — public barrel (Phase 0).
 * Spec: docs/PORTAL_DESIGN_KIT.md
 * READ FIRST: docs/KIT_GUIDE.md — token families, surface modes, status-tone
 * semantics, the KitBaseProps contract, and the anti-pattern list. If you
 * change exports here, update the guide's component index in the same PR.
 *
 * Phase 0 ships the foundation + primitives. Layout/data/persona components
 * fan out Astryx under the hood (Badge, Card, Avatar, ProgressBar, EmptyState,
 * Switch, ClickableCard, StatusDot, Token) — see ./astryxMap.ts for tone maps.
 */
export { DesignSurface, useSurface, type SurfaceMode } from './DesignSurface';
export { cx, type KitBaseProps, type KitDataAttrs } from './base';
export { useFocusTrap, getFocusable, type FocusTrapOptions } from './hooks/useFocusTrap';
export { useListFocus, LIST_ITEM_ATTR, type ListFocusOptions } from './hooks/useListFocus';
export { useAnnounce, announce } from './hooks/useAnnounce';
export { StatTile } from './StatTile';
export { KpiStrip, type KpiItem } from './KpiStrip';
export { StatusTag } from './StatusTag';
export { JobListingRow, JobListingRowSkeleton } from './JobListingRow';
export { KitEmptyState } from './KitEmptyState';
export { SectionHeader } from './SectionHeader';
export { PageOpener } from './PageOpener';
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
