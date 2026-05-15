'use client';

export default function PartnerConnectPayoutButton({
  label,
  fullWidth = false,
}: {
  label: string;
  fullWidth?: boolean;
}) {
  const handleClick = async () => {
    const res = await fetch('/api/partner/connect', { method: 'POST' });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    alert(data.error || 'Something went wrong');
  };

  return (
    <button
      type="button"
      className="btn btn-primary"
      style={fullWidth ? { width: '100%' } : undefined}
      onClick={handleClick}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '0.375rem' }}>
        account_balance
      </span>
      {label}
    </button>
  );
}
