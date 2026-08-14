'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import PartnerEditModal from './PartnerEditModal';
import PartnerDeactivateDialog from './PartnerDeactivateDialog';

type Partner = {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  active: boolean;
  notes: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  partnerType: string;
  referralCode: string | null;
  sponsoredEnrollment: boolean;
  sponsorshipFundingSource: string | null;
  sponsorshipTermLabel: string | null;
  enrollmentPageEnabled: boolean;
  enrollmentHeadline: string | null;
  enrollmentBlurb: string | null;
  schoolDistrict: string | null;
  programCatalog: { programSlug: string }[];
  _count: { counselors: number; referrals: number };
};

type Subgroup = {
  id: string;
  name: string;
  type: string;
  partnerId: string | null;
};

type Props = {
  partner: Partner;
  subgroups: Subgroup[];
  allPartners: { id: string; name: string; active: boolean }[];
  programs: { slug: string; title: string }[];
};

export default function PartnerDetailActions({ partner, subgroups, allPartners, programs }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Pencil size={14} />
          Edit
        </button>
        {partner.active ? (
          <button
            type="button"
            onClick={() => setDeactivateOpen(true)}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-on-surface-variant)' }}
          >
            <Trash2 size={14} />
            Deactivate
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              setReactivating(true);
              try {
                const res = await fetch(`/api/admin/partners/${partner.id}/reactivate`, { method: 'POST' });
                if (res.ok) router.refresh();
              } finally {
                setReactivating(false);
              }
            }}
            disabled={reactivating}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RotateCcw size={14} />
            {reactivating ? 'Reactivating…' : 'Reactivate'}
          </button>
        )}
      </div>

      {editOpen && (
        <PartnerEditModal
          partner={partner}
          subgroups={subgroups}
          programs={programs}
          onClose={() => setEditOpen(false)}
        />
      )}

      {deactivateOpen && (
        <PartnerDeactivateDialog
          partner={partner}
          partners={allPartners}
          onClose={() => setDeactivateOpen(false)}
        />
      )}
    </>
  );
}
