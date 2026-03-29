'use client';

export default function ShareButtons() {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/apply');
  };

  const handleEmail = () => {
    window.location.href =
      'mailto:?subject=Free Career Training&body=Check out WorkforceAP: ' + window.location.origin;
  };

  const handleSms = () => {
    window.location.href =
      'sms:?body=Check out WorkforceAP free career training: ' + window.location.origin;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
      <button
        onClick={handleCopyLink}
        className="flex flex-col items-center justify-center py-4 bg-white border border-[#debfc2]/10 rounded-xl hover:bg-[#f0edec] transition-colors group"
      >
        <span className="material-symbols-outlined text-[#584144] group-hover:text-[#8c0f37] transition-colors">content_copy</span>
        <span className="text-[10px] mt-2 font-medium text-[#584144]">Copy Link</span>
      </button>
      <button
        onClick={handleEmail}
        className="flex flex-col items-center justify-center py-4 bg-white border border-[#debfc2]/10 rounded-xl hover:bg-[#f0edec] transition-colors group"
      >
        <span className="material-symbols-outlined text-[#584144] group-hover:text-[#8c0f37] transition-colors">mail</span>
        <span className="text-[10px] mt-2 font-medium text-[#584144]">Email</span>
      </button>
      <button
        onClick={handleSms}
        className="flex flex-col items-center justify-center py-4 bg-white border border-[#debfc2]/10 rounded-xl hover:bg-[#f0edec] transition-colors group"
      >
        <span className="material-symbols-outlined text-[#584144] group-hover:text-[#8c0f37] transition-colors">chat_bubble</span>
        <span className="text-[10px] mt-2 font-medium text-[#584144]">SMS</span>
      </button>
    </div>
  );
}
