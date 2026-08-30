// Matches the `take: 500` cap used by the sibling admin listing for the same
// table (app/api/admin/placements/route.ts's `placementRecord.findMany`).
const PLACEMENTS_QUERY_LIMIT = 500;

export function buildPlacementsQuery(options: {
  staffUserId: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  organizationId: string | null;
  memberId: string | null;
  days: number;
}) {
  let query = `
    SELECT 
      pr.*,
      u.full_name as member_name,
      u.email as member_email
    FROM placement_records pr
    JOIN users u ON u.id = pr.user_id
    WHERE 1=1
  `;

  const params: Array<string | Date> = [];

  if (options.memberId) {
    query += ` AND pr.user_id = $${params.length + 1}`;
    params.push(options.memberId);
  } else if (options.isAdmin && !options.isSuperAdmin) {
    query += ` AND u.organization_id = $${params.length + 1}`;
    params.push(options.organizationId ?? '');
  } else if (!options.isAdmin) {
    query += `
      AND EXISTS (
        SELECT 1
        FROM counselor_assignments ca
        JOIN counselors c ON c.id = ca.counselor_id
        WHERE ca.member_id = pr.user_id
          AND ca.active = true
          AND c.active = true
          AND c.user_id = $${params.length + 1}
      )
    `;
    params.push(options.staffUserId);
  }

  if (options.days > 0) {
    query += ` AND pr.placed_at >= $${params.length + 1}`;
    params.push(new Date(Date.now() - options.days * 24 * 60 * 60 * 1000));
  }

  query += ` ORDER BY pr.placed_at DESC LIMIT ${PLACEMENTS_QUERY_LIMIT}`;

  return { query, params };
}
