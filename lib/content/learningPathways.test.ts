import assert from 'node:assert/strict';
import { getPathwayForProgram } from '@/lib/content/learningPathways';

assert.equal(getPathwayForProgram('it-support-professional-certificate-ibm').id, 'it-support');
assert.equal(getPathwayForProgram('cybersecurity-professional-certificate-google').id, 'cybersecurity');
assert.equal(getPathwayForProgram('comptia-security-professional-certificate').id, 'cybersecurity');
assert.equal(getPathwayForProgram('data-analytics-professional-certificate-google').id, 'data-analytics');
assert.equal(getPathwayForProgram('ai-professional-developer-certificate-ibm').id, 'data-analytics');
assert.equal(getPathwayForProgram('project-management-professional-certificate-microsoft').id, 'project-management');

console.log('learningPathways tests passed');
