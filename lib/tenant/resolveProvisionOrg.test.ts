import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractTrustedMetadataOrgId,
  resolveProvisionOrganizationId,
} from './resolveProvisionOrg';

const ORG_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DEFAULT_ORG = '00000000-0000-4000-8000-000000000001';

test('extractTrustedMetadataOrgId reads organization_id / organizationId / org_id', () => {
  assert.equal(extractTrustedMetadataOrgId({ organization_id: ORG_A }), ORG_A);
  assert.equal(extractTrustedMetadataOrgId({ organizationId: ` ${ORG_B} ` }), ORG_B);
  assert.equal(extractTrustedMetadataOrgId({ org_id: ORG_A }), ORG_A);
  assert.equal(extractTrustedMetadataOrgId({ full_name: 'Maria' }), null);
  assert.equal(extractTrustedMetadataOrgId(null), null);
});

test('explicitOrganizationId wins over host, metadata, and program', async () => {
  const result = await resolveProvisionOrganizationId({
    explicitOrganizationId: ORG_A,
    headers: { get: () => ORG_B },
    metadata: { organizationId: ORG_B },
    programSlug: 'it-support',
    tryResolveOrg: async () => ORG_B,
    lookupProgramOrg: async () => ORG_B,
    defaultOrgId: async () => DEFAULT_ORG,
  });
  assert.equal(result, ORG_A);
});

test('custom-domain / x-wap-org-id request org wins over default', async () => {
  const result = await resolveProvisionOrganizationId({
    headers: {
      get: (name: string) => (name === 'x-wap-org-id' ? ORG_A : 'partner.example.com'),
    },
    tryResolveOrg: async () => ORG_A,
    defaultOrgId: async () => DEFAULT_ORG,
  });
  assert.equal(result, ORG_A);
});

test('canonical host (tryResolve null) falls through to metadata, then program, then default', async () => {
  const fromMeta = await resolveProvisionOrganizationId({
    headers: { get: () => 'localhost' },
    metadata: { organization_id: ORG_A },
    tryResolveOrg: async () => null,
    defaultOrgId: async () => DEFAULT_ORG,
  });
  assert.equal(fromMeta, ORG_A);

  const fromProgram = await resolveProvisionOrganizationId({
    headers: { get: () => 'www.workforceap.org' },
    programSlug: 'it-support-professional-certificate-ibm',
    tryResolveOrg: async () => null,
    lookupProgramOrg: async (slug) =>
      slug === 'it-support-professional-certificate-ibm' ? ORG_B : null,
    defaultOrgId: async () => DEFAULT_ORG,
  });
  assert.equal(fromProgram, ORG_B);

  const fromDefault = await resolveProvisionOrganizationId({
    headers: { get: () => 'localhost' },
    programSlug: 'it-support-professional-certificate-ibm',
    tryResolveOrg: async () => null,
    lookupProgramOrg: async () => null,
    defaultOrgId: async () => DEFAULT_ORG,
  });
  assert.equal(fromDefault, DEFAULT_ORG);
});

test('ambiguous program catalog (0 orgs) does not guess — uses default', async () => {
  const result = await resolveProvisionOrganizationId({
    programSlug: 'shared-slug',
    tryResolveOrg: async () => null,
    lookupProgramOrg: async () => null,
    defaultOrgId: async () => DEFAULT_ORG,
  });
  assert.equal(result, DEFAULT_ORG);
});
