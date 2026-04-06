import assert from 'node:assert/strict';
import { computeWioaSignal, parseWioaAnswers } from './wioaQualification';

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
