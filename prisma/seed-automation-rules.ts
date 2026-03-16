/**
 * Seed automation rules. Run with: npx tsx prisma/seed-automation-rules.ts
 * Or add to main seed.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RULES = [
  {
    ruleKey: 'inactivity_7_days',
    triggerEvent: 'member_inactive_7_days',
    triggerConditionsJson: { days: 7 },
    actionType: 'send_reminder',
    actionPayloadJson: { template: 'reengagement' },
  },
  {
    ruleKey: 'resume_no_applications',
    triggerEvent: 'resume_complete_no_apps',
    triggerConditionsJson: {},
    actionType: 'nudge',
    actionPayloadJson: { message: 'Suggest application tracker' },
  },
  {
    ruleKey: 'pathway_stalled',
    triggerEvent: 'pathway_no_progress_10_days',
    triggerConditionsJson: { days: 10 },
    actionType: 'send_reminder',
    actionPayloadJson: { template: 'pathway_checkpoint' },
  },
];

async function main() {
  for (const rule of RULES) {
    await prisma.automationRule.upsert({
      where: { ruleKey: rule.ruleKey },
      create: rule,
      update: rule,
    });
  }
  console.log('Automation rules seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
