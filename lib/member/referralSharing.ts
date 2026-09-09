import { z } from 'zod';

export const ReferralShareDataSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{4,16}$/),
  sharePath: z.string(),
  rewardedCount: z.number().int().nonnegative(),
}).refine(data => data.sharePath === `/r/${data.code}`, { message: 'Invalid referral path' });
export type ReferralShareData = z.infer<typeof ReferralShareDataSchema>;

export function buildReferralInvitation(shareUrl: string): string {
  return `I thought WorkforceAP's career training and support might interest you. You can explore programs and apply here: ${shareUrl}\n\nThe team can explain eligibility, funding and next steps.`;
}
