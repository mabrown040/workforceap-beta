import { lookupWorkforceCenter } from '@/lib/apply/workforceCenters';

export default function WorkforceCenterHint({
  zip,
  county,
  state,
}: {
  zip?: string;
  county?: string;
  state?: string;
}) {
  const match = lookupWorkforceCenter({ zip, county, state });
  if (!match) return null;

  return (
    <aside className="apply-workforce-center" role="note">
      <p className="apply-workforce-center__title">Your nearest workforce / one-stop center</p>
      <p className="apply-workforce-center__board">{match.board}</p>
      <p className="apply-workforce-center__office">
        {match.office}
        {match.city ? ` · ${match.city}` : ''}
        {match.phone ? ` · ${match.phone}` : ''}
      </p>
      <p className="apply-workforce-center__links">
        <a href={match.website} target="_blank" rel="noreferrer">
          Board website
        </a>
        {' · '}
        <a href={match.finderUrl} target="_blank" rel="noreferrer">
          Confirm on CareerOneStop (DOL)
        </a>
      </p>
    </aside>
  );
}
