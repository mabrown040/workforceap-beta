import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isInactive,
  slaPriority,
  isStaleTraining,
  needsComputerSupportFollowUp,
  isMilestoneRecent,
  pickPrimaryFlag,
  NO_ACTIVITY_DAYS,
  SLA_BREACH_HOURS,
  SLA_WARNING_HOURS,
  STALE_TRAINING_WINDOW_DAYS,
  MILESTONE_WINDOW_DAYS,
  type TriageFlagType,
} from './triageFlags';

const NOW = new Date('2026-05-07T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// ─── isInactive ─────────────────────────────────────────────────────────────

test('isInactive: false for unenrolled member regardless of activity', () => {
  assert.equal(isInactive(null, false, NOW), false);
  assert.equal(isInactive(new Date(NOW.getTime() - 100 * DAY), false, NOW), false);
});

test('isInactive: true for enrolled member with no activity ever', () => {
  assert.equal(isInactive(null, true, NOW), true);
});

test(`isInactive: true for enrolled member inactive longer than ${NO_ACTIVITY_DAYS} days`, () => {
  const past = new Date(NOW.getTime() - (NO_ACTIVITY_DAYS + 1) * DAY);
  assert.equal(isInactive(past, true, NOW), true);
});

test(`isInactive: false for enrolled member active within ${NO_ACTIVITY_DAYS} days`, () => {
  const past = new Date(NOW.getTime() - (NO_ACTIVITY_DAYS - 1) * DAY);
  assert.equal(isInactive(past, true, NOW), false);
});

test(`isInactive: false at exactly ${NO_ACTIVITY_DAYS} days (boundary)`, () => {
  const exactly = new Date(NOW.getTime() - NO_ACTIVITY_DAYS * DAY);
  assert.equal(isInactive(exactly, true, NOW), false);
});

// ─── slaPriority ────────────────────────────────────────────────────────────

test('slaPriority: null when no member-authored last message', () => {
  assert.equal(slaPriority(null, NOW), null);
});

test(`slaPriority: red when waiting >= ${SLA_BREACH_HOURS}h`, () => {
  const at = new Date(NOW.getTime() - SLA_BREACH_HOURS * HOUR);
  assert.equal(slaPriority(at, NOW), 'red');
  const older = new Date(NOW.getTime() - (SLA_BREACH_HOURS + 24) * HOUR);
  assert.equal(slaPriority(older, NOW), 'red');
});

test(`slaPriority: yellow when waiting between ${SLA_WARNING_HOURS}h and ${SLA_BREACH_HOURS}h`, () => {
  const at = new Date(NOW.getTime() - SLA_WARNING_HOURS * HOUR);
  assert.equal(slaPriority(at, NOW), 'yellow');
  const between = new Date(NOW.getTime() - 36 * HOUR);
  assert.equal(slaPriority(between, NOW), 'yellow');
});

test(`slaPriority: null when waiting < ${SLA_WARNING_HOURS}h`, () => {
  const recent = new Date(NOW.getTime() - (SLA_WARNING_HOURS - 1) * HOUR);
  assert.equal(slaPriority(recent, NOW), null);
});

// ─── isStaleTraining ────────────────────────────────────────────────────────

test('isStaleTraining: false when not flagged', () => {
  assert.equal(isStaleTraining(null, NOW), false);
});

test(`isStaleTraining: true when flagged within ${STALE_TRAINING_WINDOW_DAYS}d`, () => {
  const within = new Date(NOW.getTime() - 5 * DAY);
  assert.equal(isStaleTraining(within, NOW), true);
});

test(`isStaleTraining: false when flag is older than ${STALE_TRAINING_WINDOW_DAYS}d`, () => {
  const older = new Date(NOW.getTime() - (STALE_TRAINING_WINDOW_DAYS + 1) * DAY);
  assert.equal(isStaleTraining(older, NOW), false);
});

test('isStaleTraining: false when flag is in the future (clock skew defense)', () => {
  const future = new Date(NOW.getTime() + DAY);
  assert.equal(isStaleTraining(future, NOW), false);
});

// ─── needsComputerSupportFollowUp ───────────────────────────────────────────

test('needsComputerSupportFollowUp: false when flag is not set', () => {
  assert.equal(needsComputerSupportFollowUp(false, null), false);
  assert.equal(needsComputerSupportFollowUp(false, new Date()), false);
});

test('needsComputerSupportFollowUp: true when flagged and no follow-up event', () => {
  assert.equal(needsComputerSupportFollowUp(true, null), true);
});

test('needsComputerSupportFollowUp: false once a follow-up event is recorded', () => {
  assert.equal(needsComputerSupportFollowUp(true, new Date()), false);
});

// ─── isMilestoneRecent ──────────────────────────────────────────────────────

test('isMilestoneRecent: false when no milestone', () => {
  assert.equal(isMilestoneRecent(null, null, NOW), false);
});

test(`isMilestoneRecent: true within ${MILESTONE_WINDOW_DAYS}d and no counselor message`, () => {
  const milestoneAt = new Date(NOW.getTime() - 2 * DAY);
  assert.equal(isMilestoneRecent(milestoneAt, null, NOW), true);
});

test('isMilestoneRecent: false when counselor messaged after the milestone', () => {
  const milestoneAt = new Date(NOW.getTime() - 2 * DAY);
  const counselorMsg = new Date(NOW.getTime() - 1 * DAY);
  assert.equal(isMilestoneRecent(milestoneAt, counselorMsg, NOW), false);
});

test('isMilestoneRecent: true when counselor messaged BEFORE the milestone (still owed celebration)', () => {
  const counselorMsg = new Date(NOW.getTime() - 5 * DAY);
  const milestoneAt = new Date(NOW.getTime() - 2 * DAY);
  assert.equal(isMilestoneRecent(milestoneAt, counselorMsg, NOW), true);
});

test(`isMilestoneRecent: false when milestone is older than ${MILESTONE_WINDOW_DAYS}d`, () => {
  const old = new Date(NOW.getTime() - (MILESTONE_WINDOW_DAYS + 1) * DAY);
  assert.equal(isMilestoneRecent(old, null, NOW), false);
});

test('isMilestoneRecent: false when milestone is in the future', () => {
  const future = new Date(NOW.getTime() + DAY);
  assert.equal(isMilestoneRecent(future, null, NOW), false);
});

// ─── pickPrimaryFlag ────────────────────────────────────────────────────────

test('pickPrimaryFlag: null when no flags', () => {
  assert.equal(pickPrimaryFlag([]), null);
});

test('pickPrimaryFlag: red beats yellow beats blue', () => {
  const flags: TriageFlagType[] = ['stale_training', 'milestone_reached', 'no_activity_10d'];
  const result = pickPrimaryFlag(flags);
  assert.ok(result);
  assert.equal(result.primary, 'no_activity_10d');
  assert.equal(result.priority, 'red');
  assert.deepEqual([...result.additional].sort(), ['milestone_reached', 'stale_training'].sort());
});

test('pickPrimaryFlag: stable within priority — first-passed wins', () => {
  // both yellow
  const a = pickPrimaryFlag(['stale_training', 'computer_support_followup']);
  const b = pickPrimaryFlag(['computer_support_followup', 'stale_training']);
  assert.ok(a && b);
  assert.equal(a.primary, 'stale_training');
  assert.equal(b.primary, 'computer_support_followup');
});

test('pickPrimaryFlag: single flag — empty additional', () => {
  const result = pickPrimaryFlag(['milestone_reached']);
  assert.ok(result);
  assert.equal(result.primary, 'milestone_reached');
  assert.equal(result.priority, 'blue');
  assert.deepEqual(result.additional, []);
});

test('pickPrimaryFlag: two reds — second still appears in additional', () => {
  const result = pickPrimaryFlag(['no_activity_10d', 'sla_breach_48h']);
  assert.ok(result);
  assert.equal(result.priority, 'red');
  assert.equal(result.additional.length, 1);
});
