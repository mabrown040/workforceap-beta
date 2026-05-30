export type PlacementForPayout = {
  id: string;
  userId: string;
  placedAt: Date | null;
  startDateVerified: boolean;
  paidEvent: { id: string } | null;
} | null;

export function getPlacementPayoutRejection(
  placement: PlacementForPayout,
): { error: string; status: 400 | 404 } | null {
  if (!placement) {
    return { error: 'Placement not found for this partner', status: 404 };
  }

  if (!placement.placedAt || !placement.startDateVerified) {
    return { error: 'Placement is not eligible for payout until verified', status: 400 };
  }

  if (placement.paidEvent) {
    return { error: 'Placement has already been paid out', status: 400 };
  }

  return null;
}
