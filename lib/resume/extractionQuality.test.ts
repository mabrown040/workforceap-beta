import assert from 'node:assert/strict';
import test from 'node:test';

import { getResumeExtractionWarning } from './extractionQuality';

test('flags merged section headings that stayed on the same line as content', () => {
  const text = `Michael Brown II\nExperience Founding Account Executive | Contango IT | Remote\nExceeded quota in ramp and Q1 2025 through targeted prospecting.\nEducation MBA | Abilene Christian University`;
  assert.match(getResumeExtractionWarning(text) ?? '', /flattened headings or bullets/i);
});

test('flags flattened extraction when common sections exist but bullets disappear', () => {
  const text = `Jane Doe\nProfessional Summary\nOperations leader with ten years of experience.\nExperience\nLed regional expansion across four markets and increased retention by 18 percent.\nEducation\nState University`;
  assert.match(getResumeExtractionWarning(text) ?? '', /paste plain text/i);
});

test('does not warn for reasonably structured plain-text resumes', () => {
  const text = `Jane Doe\n\nProfessional Summary\nOperations leader with 10 years of experience.\n\nExperience\n• Led regional expansion across four markets and increased retention by 18%.\n• Built reporting workflows that cut review time by 6 hours per week.\n\nEducation\nState University\n\nSkills\nSalesforce, Tableau, SQL`;
  assert.equal(getResumeExtractionWarning(text), null);
});
