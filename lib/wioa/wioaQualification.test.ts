import assert from 'node:assert/strict';
import { computeWioaSignal, parseWioaAnswers, parseWioaQualificationSnapshot } from './wioaQualification';

const base = {
  countyOrZip: '78701',
  primaryBarrier: 'none' as const,
  dislocatedWorker: false,
  lowIncomeSelfReport: false,
  trainingInterest: true,
  completedIntakeSelfReport: false,
};

{
  const a = parseWioaAnswers({
    ...base,
    ageBracket: '25_54',
  });
  assert.equal(a?.ageBracket, '25_54');
}

assert.equal(parseWioaAnswers({ ...base, ageBracket: 'x' }), null);

const validSnapshot = {
  answers: {
    ...base,
    ageBracket: '25_54' as const,
    countyOrZip: ' 78701 ',
  },
  signal: 'possible' as const,
  reasons: ['Training interest may fit common WIOA pathways.'],
  submittedAt: '2026-05-30T00:00:00Z',
  version: 1 as const,
};

{
  const snapshot = parseWioaQualificationSnapshot(validSnapshot);
  assert.equal(snapshot?.signal, 'possible');
  assert.equal(snapshot?.answers.countyOrZip, '78701');
}

assert.equal(parseWioaQualificationSnapshot({ ...validSnapshot, signal: 'bad' }), null);
assert.equal(parseWioaQualificationSnapshot({ ...validSnapshot, reasons: 'bad' }), null);
assert.equal(
  parseWioaQualificationSnapshot({
    ...validSnapshot,
    answers: { ...validSnapshot.answers, ageBracket: 'x' },
  }),
  null
);

{
  const { signal } = computeWioaSignal({
    ...base,
    ageBracket: '25_54',
    lowIncomeSelfReport: true,
    dislocatedWorker: true,
    trainingInterest: true,
  });
  assert.equal(signal, 'likely');
}

{
  const { signal } = computeWioaSignal({
    ...base,
    ageBracket: 'under18',
    trainingInterest: false,
  });
  assert.equal(signal, 'unclear');
}

console.log('wioaQualification tests passed');
