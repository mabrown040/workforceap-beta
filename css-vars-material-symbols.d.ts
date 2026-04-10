/**
 * Material Symbols axes — set on `.material-symbols-outlined` via inline style.
 * See css/main.css (`--ms-fill`, `--ms-wght`).
 */
import 'react';

declare module 'react' {
  interface CSSProperties {
    '--ms-fill'?: 0 | 1;
    '--ms-wght'?: number;
  }
}

export {};
