
import { buildPortalSwitcherRoles } from './lib/auth/portalRoleSwitcher';

const testCases = [
  {
    name: 'Admin user should see member portal',
    input: {
      userRoleNames: ['admin'],
      hasEmployer: false,
      hasPartner: false,
      hasCounselor: false,
      hasAdmin: true,
    },
    expectMember: true,
  },
  {
    name: 'Employer user should see member portal',
    input: {
      userRoleNames: ['employer'],
      hasEmployer: true,
      hasPartner: false,
      hasCounselor: false,
      hasAdmin: false,
    },
    expectMember: true,
  },
  {
    name: 'Pure member should see member portal',
    input: {
      userRoleNames: ['member'],
      hasEmployer: false,
      hasPartner: false,
      hasCounselor: false,
      hasAdmin: false,
    },
    expectMember: true,
  }
];

testCases.forEach(tc => {
  const roles = buildPortalSwitcherRoles(tc.input);
  const hasMember = roles.some(r => r.role === 'member');
  if (hasMember === tc.expectMember) {
    console.log(`✅ ${tc.name}`);
  } else {
    console.error(`❌ ${tc.name} (Expected member: ${tc.expectMember}, got: ${hasMember})`);
    process.exit(1);
  }
});

console.log('All role switcher tests passed!');
process.exit(0);
