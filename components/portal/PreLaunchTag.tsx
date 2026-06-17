'use client';

import { useState } from 'react';
import styles from './PreLaunchTag.module.css';

interface PreLaunchTagProps {
  /** Compact tag for nav/header use */
  compact?: boolean;
  /** Show the full explanation card */
  showCard?: boolean;
  onToggle?: (show: boolean) => void;
}

/**
 * Pre-launch trust indicator for WorkforceAP.
 * Shows "Pilot Program" badge + expandable explanation.
 */
export default function PreLaunchTag({ compact, showCard: controlledShow, onToggle }: PreLaunchTagProps) {
  const [open, setOpen] = useState(false);
  const showCard = controlledShow ?? open;

  const handleToggle = () => {
    const next = !showCard;
    setOpen(next);
    onToggle?.(next);
  };

  if (compact) {
    return (
      <span className={styles['compact-tag']} title="Pilot Program — limited spots available">
        <span className={styles['dot']} aria-hidden="true" />
        Pilot Program
      </span>
    );
  }

  return (
    <div className={styles['container']}>
      <button
        type="button"
        className={styles['tag-btn']}
        onClick={handleToggle}
        aria-expanded={showCard}
        aria-controls="prelaunch-explanation"
      >
        <span className={styles['dot']} aria-hidden="true" />
        <span className={styles['tag-text']}>Pilot Program</span>
        <span className={styles['tag-hint']}>{showCard ? '▲' : '▼'}</span>
      </button>

      {showCard && (
        <div id="prelaunch-explanation" className={styles['card']} role="region" aria-label="Pilot program details">
          <p className={styles['card-title']}>What "Pilot Program" means</p>
          <p className={styles['card-body']}>
            WorkforceAP is currently in a limited pilot phase. We are serving a small
            number of members to ensure our training and job-matching systems work
            reliably before broader launch.
          </p>
          <p className={styles['card-body']}>
            <strong>You are not paying for this.</strong> All programs are no-cost to
            members, funded by grants and community partnerships.
          </p>
          <p className={styles['card-body']}>
            Spots are limited. If you are placed on a waitlist, we will contact you as
            soon as space opens.
          </p>
          <p className={styles['card-footer']}>
            Have questions? <a href="mailto:contact@workforceap.org">Email us</a> or
            call <a href="tel:+15127771808">(512) 777-1808</a>.
          </p>
        </div>
      )}
    </div>
  );
}
