'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Portal Design Kit — surface mode seam (Phase 0).
 *
 * Sets `data-surface` so the token layer (css/portal-tokens.css) swaps
 * density / pop / radius, and exposes the mode via context for components
 * that need to branch in JS. Wrap a route-group layout:
 *
 *   <DesignSurface surface="warm">{children}</DesignSurface>   // member
 *   <DesignSurface surface="dense">{children}</DesignSurface>  // admin / staff / data
 *
 * Spec: docs/PORTAL_DESIGN_KIT.md
 */
export type SurfaceMode = 'warm' | 'dense';

const SurfaceContext = createContext<SurfaceMode>('dense');

export function useSurface(): SurfaceMode {
  return useContext(SurfaceContext);
}

interface DesignSurfaceProps {
  surface: SurfaceMode;
  children: ReactNode;
  /** Render as a different element; defaults to a plain div wrapper. */
  className?: string;
}

export function DesignSurface({ surface, children, className }: DesignSurfaceProps) {
  return (
    <SurfaceContext.Provider value={surface}>
      <div data-surface={surface} className={className}>
        {children}
      </div>
    </SurfaceContext.Provider>
  );
}
