
const { buildPortalSwitcherRoles } = require('../lib/auth/portalRoleSwitcher');

// Mocking required modules if necessary, but buildPortalSwitcherRoles is pure.
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
