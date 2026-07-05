import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import {
  DesignSurface,
  SectionHeader,
  DataTable,
  Avatar,
  StatusTag,
  type Column,
} from '@/components/portal/kit';

/**
 * Users roster — staff accounts & roles (dense).
 * Mockup: workforceap-admin-full.html "users" view.
 * Target route: /admin/users
 *
 * Server-rendered (no interactivity). The page loader filters to staff/admin/
 * counselor roles (NOT plain members) and maps each into a UserRow. Uses
 * DataTable mobile="cards" so the wide table stacks on mobile.
 */
export interface UserRow {
  id: string;
  name: string;
  initials: string;
  email: string;
  /** Display role label, e.g. "Super Admin", "Counselor". */
  role: string;
  /** Relative last-login caption, e.g. "Now", "2h ago", "Never". */
  lastLogin: string;
  /** Whether the account is considered active. */
  active: boolean;
}

export interface UsersKitProps {
  users: UserRow[];
  /** Total staff accounts (roster footer). */
  total: number;
}

const addUserStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 8,
  background: 'var(--wa-accent)',
  color: 'var(--wa-on-accent)',
  fontWeight: 700,
  fontSize: 13,
  textDecoration: 'none',
};

const manageUsersStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 8,
  color: 'var(--wa-text)',
  fontWeight: 700,
  fontSize: 13,
  textDecoration: 'none',
  border: '1px solid var(--wa-border, rgba(0,0,0,0.12))',
};

export function UsersKit({ users, total }: UsersKitProps) {
  const UserCell = ({ row }: { row: UserRow }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Avatar initials={row.initials} size={32} />
      <div
        style={{
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.name}
      </div>
    </div>
  );

  const columns: Column<UserRow>[] = [
    { key: 'name', header: 'Name', render: (row) => <UserCell row={row} /> },
    {
      key: 'email',
      header: 'Email',
      render: (row) => (
        <span
          style={{
            color: 'var(--wa-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.email}
        </span>
      ),
    },
    { key: 'role', header: 'Role', render: (row) => <span>{row.role}</span> },
    {
      key: 'lastLogin',
      header: 'Last login',
      render: (row) => (
        <span style={{ color: 'var(--wa-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {row.lastLogin}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusTag tone={row.active ? 'ok' : 'muted'}>
          {row.active ? 'Active' : 'Inactive'}
        </StatusTag>
      ),
    },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Users"
        kicker="People"
        goal="Staff accounts & roles"
        action={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Link href="/admin/users?ui=legacy" style={manageUsersStyle} className="wa-kit-focus">
              Manage
            </Link>
            <Link href="/admin/invites/new" style={addUserStyle} className="wa-kit-focus">
              <Plus className="h-4 w-4" aria-hidden /> Add User
            </Link>
          </div>
        }
      />

      <DataTable<UserRow>
        columns={columns}
        rows={users}
        rowKey={(row) => row.id}
        minWidth={680}
        mobile="cards"
        cardRender={(row) => (
          <div className="wa-kit-card wa-kit-card--sm">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <UserCell row={row} />
              </div>
              <div style={{ flexShrink: 0 }}>
                <StatusTag tone={row.active ? 'ok' : 'muted'}>
                  {row.active ? 'Active' : 'Inactive'}
                </StatusTag>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 11,
                color: 'var(--wa-muted)',
                margin: '12px 0 0',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '60%',
                }}
              >
                {row.email}
              </span>
              <span>
                {row.role} · {row.lastLogin}
              </span>
            </div>
          </div>
        )}
        emptyTitle="No staff accounts yet"
        emptyDescription="Invite an admin or counselor to start managing staff access."
      />

      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--wa-muted)',
          marginTop: 16,
        }}
      >
        Showing {users.length} of {total}
      </p>
    </DesignSurface>
  );
}
