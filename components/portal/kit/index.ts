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
export { colorVar, type KitColor, type KitTone } from './tokens';
