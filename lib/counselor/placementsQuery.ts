export function buildPlacementsQuery(options: {
  staffUserId: string;
  isAdmin: boolean;
  memberId: string | null;
  days: number;
}) {
  let query = `
    SELECT 
      pr.*,
      u.email as member_email
    FROM placement_records pr
    JOIN users u ON u.id = pr.user_id
    WHERE 1=1
  `;

  const params: Array<string | Date> = [];

  if (options.memberId) {
    query += ` AND pr.user_id = $${params.length + 1}`;
    params.push(options.memberId);
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

  query += ` ORDER BY pr.placed_at DESC`;

  return { query, params };
}
