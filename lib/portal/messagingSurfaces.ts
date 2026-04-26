/**
 * VoiceAgentSurface presets for messaging — same gradient-ring + badge language as voice agents.
 */
type MessagingSurface = {
  badge: string;
  subtext?: string;
  icon: string;
  glowColor: string;
  gradient: string;
};

export const memberMessagingSurface: MessagingSurface = {
  badge: 'Messages',
  subtext: 'Private thread with your counselor — replies in real time.',
  icon: '💬',
  glowColor: '#8c0f37',
  gradient: 'linear-gradient(135deg, #670024, #8c0f37, #e8a0b3)',
};

export const partnerMessagingSurface: MessagingSurface = {
  badge: 'Partnership desk',
  subtext: 'Direct line to WorkforceAP — referrals, milestones, and resources.',
  icon: '🤝',
  glowColor: '#ea580c',
  gradient: 'linear-gradient(135deg, #ea580c, #f97316, #fdba74)',
};

export const employerMessagingSurface: MessagingSurface = {
  badge: 'Employer messages',
  subtext: 'Your team channel and candidate threads in one place.',
  icon: '🏢',
  glowColor: '#4f46e5',
  gradient: 'linear-gradient(135deg, #4f46e5, #6366f1, #a5b4fc)',
};

export const counselorStaffMessagingSurface: MessagingSurface = {
  badge: 'Member thread',
  subtext: 'Staff view — synced with the member inbox.',
  icon: '💬',
  glowColor: '#c026d3',
  gradient: 'linear-gradient(135deg, #86198f, #c026d3, #f0abfc)',
};

export const adminMessagingSurface: MessagingSurface = {
  badge: 'Member messages',
  subtext: 'Admin view — use responsibly; members are notified on send.',
  icon: '🛡️',
  glowColor: '#475569',
  gradient: 'linear-gradient(135deg, #1e293b, #475569, #94a3b8)',
};
