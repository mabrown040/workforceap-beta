import type { PortalNavItem } from './portalNav';
import type { AgeGroup } from '@/lib/util/ageCalculation';

/**
 * Filter navigation items based on user's age group
 * Hides age-inappropriate features from minors
 */
export function filterNavItemsByAge(items: PortalNavItem[], ageGroup: AgeGroup): PortalNavItem[] {
  // Under 14: Hide jobs, applications, most external features
  if (ageGroup === 'under14') {
    return items.filter((item) => {
      // Hide job board and job applications
      if (item.href === '/jobs') return false;
      if (item.href === '/dashboard/ai-tools/application-tracker') return false;
      // Keep training, learning, messages, profile
      return true;
    });
  }

  // Youth 14-17: Show job board but with youth jobs only, hide some AI tools
  if (ageGroup === 'youth14to17') {
    return items.filter((item) => {
      // Keep job board (will show age-filtered jobs)
      // Keep most features
      // Could hide specific AI tools if needed
      return true;
    });
  }

  // Adult 18+: Show everything
  return items;
}

/**
 * Get age-appropriate messaging for job board access
 */
export function getJobBoardAccessMessage(ageGroup: AgeGroup): {
  canAccess: boolean;
  title?: string;
  message?: string;
  ctaLabel?: string;
  ctaHref?: string;
} {
  if (ageGroup === 'under14') {
    return {
      canAccess: false,
      title: 'Career Exploration for Young Learners',
      message: 'Job applications are available for members 14 and older. Focus on exploring career paths and building skills through training programs.',
      ctaLabel: 'Explore Training Programs',
      ctaHref: '/programs',
    };
  }

  if (ageGroup === 'youth14to17') {
    return {
      canAccess: true,
      title: 'Youth Job Board',
      message: 'Showing jobs appropriate for ages 14-17. These positions comply with youth labor laws and work permit requirements.',
    };
  }

  return { canAccess: true };
}

/**
 * Get age-appropriate feature restrictions
 */
export function getAgeRestrictedFeatures(ageGroup: AgeGroup): {
  canApplyToJobs: boolean;
  canUseAllAITools: boolean;
  canAccessJobBoard: boolean;
  requiresParentalConsent: boolean;
  requiresWorkPermit: boolean;
} {
  if (ageGroup === 'under14') {
    return {
      canApplyToJobs: false,
      canUseAllAITools: false,
      canAccessJobBoard: false,
      requiresParentalConsent: true,
      requiresWorkPermit: true,
    };
  }

  if (ageGroup === 'youth14to17') {
    return {
      canApplyToJobs: true,
      canUseAllAITools: true,
      canAccessJobBoard: true,
      requiresParentalConsent: true,
      requiresWorkPermit: true,
    };
  }

  return {
    canApplyToJobs: true,
    canUseAllAITools: true,
    canAccessJobBoard: true,
    requiresParentalConsent: false,
    requiresWorkPermit: false,
  };
}
