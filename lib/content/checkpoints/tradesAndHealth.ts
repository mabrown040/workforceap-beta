/**
 * Skill checkpoints for trades and health information programs:
 * - Certified Logistics Technician (CLT)
 * - Certified Production Technician (CPT)
 * - Core Construction
 * - Medical Coding & Health Information Technology (MCHIT)
 *
 * Content follows the rules in ./types.ts: workplace scenarios, 8th-grade
 * reading level, no trick questions, safety answers always conservative.
 */

import type { ProgramCheckpointPack } from './types';

export const TRADES_AND_HEALTH_PACKS: ProgramCheckpointPack[] = [
  // ==========================================================================
  // CERTIFIED LOGISTICS TECHNICIAN (CLT)
  // ==========================================================================
  {
    programSlug: 'certified-logistics-technician-clt',
    programTitle: 'Certified Logistics Technician (CLT)',
    whyItMatters:
      'Warehouse and logistics employers hire people who can make safe, smart calls on the floor — these checkpoints prove you can.',
    courses: [
      {
        courseSlug: 'clt-course-1',
        courseName: 'Introduction to Supply Chain Management',
        programSlug: 'certified-logistics-technician-clt',
        checkpoints: [
          {
            id: 'clt-course-1-cp-1',
            courseSlug: 'clt-course-1',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Understand how one delay affects the whole supply chain',
            onetSkills: ['Systems Analysis'],
            scenario:
              'You work at a distribution center. A supplier calls: a truckload of parts will arrive two days late. Your manager asks you what this delay could affect downstream.',
            question: 'What is the best answer?',
            options: [
              { id: 'a', text: 'Nothing — two days is normal and no one needs to know' },
              { id: 'b', text: 'It could delay production, customer orders, and shipping schedules that depend on those parts' },
              { id: 'c', text: 'Only the truck driver is affected' },
              { id: 'd', text: 'The supplier should pay a fine, so the delay does not matter' },
            ],
            correctOptionId: 'b',
            explanation:
              'A supply chain is connected: a late inbound delivery ripples into production, order fulfillment, and outbound shipping. Spotting that ripple early lets the team adjust plans.',
            level: 'foundation',
          },
          {
            id: 'clt-course-1-cp-2',
            courseSlug: 'clt-course-1',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Trace where a customer order problem started',
            onetSkills: ['Systems Analysis'],
            scenario:
              'A customer got the wrong item. The picker says the shelf label was wrong. The receiver says the supplier box was mislabeled. Your lead asks where the process broke first.',
            question: 'What is the most useful first step?',
            options: [
              { id: 'a', text: 'Blame the picker, since they touched the order last' },
              { id: 'b', text: 'Check each step in order — receiving, putaway, picking — to find where the wrong label entered the process' },
              { id: 'c', text: 'Ship a replacement and skip the investigation' },
              { id: 'd', text: 'Switch suppliers right away' },
            ],
            correctOptionId: 'b',
            explanation:
              'Walking the process step by step finds the root cause instead of blaming the last person. Fixing the real break point stops the error from repeating.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'clt-course-2',
        courseName: 'Inventory Management and Control',
        programSlug: 'certified-logistics-technician-clt',
        checkpoints: [
          {
            id: 'clt-course-2-cp-1',
            courseSlug: 'clt-course-2',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Handle an inventory count that does not match the system',
            onetSkills: ['Mathematics', 'Management of Material Resources'],
            scenario:
              'You count a shelf during a cycle count. The system says 48 units, but you count 42. This item is a fast seller.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Change the system to 42 yourself without telling anyone' },
              { id: 'b', text: 'Recount carefully, then report the difference so it can be verified and adjusted the right way' },
              { id: 'c', text: 'Leave it — 6 units is close enough' },
              { id: 'd', text: 'Add 6 units from another shelf to make the numbers match' },
            ],
            correctOptionId: 'b',
            explanation:
              'Recount first to rule out your own error, then report it. Hiding or forcing a match breaks inventory accuracy and can hide theft or process problems.',
            level: 'foundation',
          },
          {
            id: 'clt-course-2-cp-2',
            courseSlug: 'clt-course-2',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Prioritize counting the inventory that matters most',
            onetSkills: ['Mathematics', 'Management of Material Resources'],
            scenario:
              'Your warehouse uses ABC analysis. You only have time to cycle count one group this week: "A" items (high value, fast moving) or "C" items (low value, slow moving).',
            question: 'Which group should you count, and why?',
            options: [
              { id: 'a', text: 'C items — there are more of them' },
              { id: 'b', text: 'A items — errors there cost the most money and hurt customers fastest' },
              { id: 'c', text: 'Neither — counting can wait until the yearly inventory' },
              { id: 'd', text: 'Whichever shelf is closest to your desk' },
            ],
            correctOptionId: 'b',
            explanation:
              'ABC analysis exists so you spend counting time where errors hurt most. A items drive most of the value, so they get counted most often.',
            level: 'applied',
          },
          {
            id: 'clt-course-2-cp-3',
            courseSlug: 'clt-course-2',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Decide when to reorder stock before it runs out',
            onetSkills: ['Mathematics'],
            scenario:
              'An item sells about 20 units a day. The supplier takes 5 days to deliver. The system flags a reorder point of 100 units. Stock just hit 95 and no order is placed.',
            question: 'What is the right move?',
            options: [
              { id: 'a', text: 'Wait until stock hits zero, then order' },
              { id: 'b', text: 'Flag it now — stock is below the reorder point, so an order should already be in' },
              { id: 'c', text: 'Order 1,000 units to be safe' },
              { id: 'd', text: 'Lower the reorder point so the alert goes away' },
            ],
            correctOptionId: 'b',
            explanation:
              'The reorder point (20 per day x 5 days lead time = 100) is the last safe moment to order. Below it, you risk a stockout before the next delivery arrives.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'clt-course-3',
        courseName: 'Transportation and Distribution',
        programSlug: 'certified-logistics-technician-clt',
        checkpoints: [
          {
            id: 'clt-course-3-cp-1',
            courseSlug: 'clt-course-3',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Pick the right shipping method for the job',
            onetSkills: ['Operations Analysis'],
            scenario:
              'A customer needs a 30-pound replacement part in two days, 800 miles away. Your options: standard truck freight (4-6 days), air express (1-2 days, costs more), or rail (7+ days).',
            question: 'Which option fits the need?',
            options: [
              { id: 'a', text: 'Rail, because it is the cheapest' },
              { id: 'b', text: 'Air express — it is the only option that meets the two-day deadline' },
              { id: 'c', text: 'Standard truck freight and hope it arrives early' },
              { id: 'd', text: 'Wait for the next scheduled weekly shipment' },
            ],
            correctOptionId: 'b',
            explanation:
              'Mode choice starts with the customer requirement. When the deadline rules out cheaper modes, the faster, costlier mode is the correct business call.',
            level: 'foundation',
          },
          {
            id: 'clt-course-3-cp-2',
            courseSlug: 'clt-course-3',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Handle a damaged delivery the right way',
            onetSkills: ['Operations Analysis', 'Management of Material Resources'],
            scenario:
              'A carrier delivers 10 pallets. One pallet has crushed boxes and the shrink wrap is torn. The driver asks you to sign the delivery receipt so he can leave.',
            question: 'What should you do before signing?',
            options: [
              { id: 'a', text: 'Sign it clean — you can deal with the damage later' },
              { id: 'b', text: 'Note the damage on the delivery receipt, take photos, and then sign' },
              { id: 'c', text: 'Refuse the entire delivery, including the 9 good pallets' },
              { id: 'd', text: 'Ask the driver to take the damaged pallet away without any paperwork' },
            ],
            correctOptionId: 'b',
            explanation:
              'Noting damage on the receipt before signing protects your company’s claim with the carrier. A clean signature usually means you accepted the freight in good condition.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'clt-course-4',
        courseName: 'Warehouse Operations',
        programSlug: 'certified-logistics-technician-clt',
        checkpoints: [
          {
            id: 'clt-course-4-cp-1',
            courseSlug: 'clt-course-4',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Respond safely to an unstable forklift load',
            onetSkills: ['Operations Analysis'],
            scenario:
              'You are driving a forklift. Halfway to the dock, you notice the pallet load is leaning and a box shifts. Coworkers are walking nearby.',
            question: 'What is the safest action?',
            options: [
              { id: 'a', text: 'Speed up to finish the trip before the load falls' },
              { id: 'b', text: 'Stop, lower the load fully, and restack or rewrap it before moving again' },
              { id: 'c', text: 'Keep driving slowly and steer away from people' },
              { id: 'd', text: 'Honk so coworkers move, then continue' },
            ],
            correctOptionId: 'b',
            explanation:
              'An unstable load can fall at any moment. Stopping and lowering the load removes the hazard; driving on — at any speed — keeps people at risk.',
            level: 'foundation',
          },
          {
            id: 'clt-course-4-cp-2',
            courseSlug: 'clt-course-4',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Work safely around forklifts as a pedestrian',
            onetSkills: ['Operations Analysis'],
            scenario:
              'You need to walk past a forklift that is backing out of a trailer. The driver has not seen you. The marked pedestrian aisle is a short detour away.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Walk quickly behind the forklift while it is still moving' },
              { id: 'b', text: 'Use the marked pedestrian aisle and make eye contact with the driver before crossing near the forklift' },
              { id: 'c', text: 'Wave and assume the driver sees you' },
              { id: 'd', text: 'Duck under the raised forks to save time' },
            ],
            correctOptionId: 'b',
            explanation:
              'Forklift drivers have blind spots, especially backing up. Marked aisles and confirmed eye contact are how pedestrians stay out of the most common warehouse injury.',
            level: 'applied',
          },
          {
            id: 'clt-course-4-cp-3',
            courseSlug: 'clt-course-4',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Use scanning to keep inventory accurate during putaway',
            onetSkills: ['Technology Design', 'Operations Analysis'],
            scenario:
              'You are putting away stock. The assigned bin is full, so you place the items in the empty bin next to it. Your scanner asks you to confirm the bin location.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Scan the assigned bin anyway so the system stops asking' },
              { id: 'b', text: 'Scan the bin you actually used so the system shows the true location' },
              { id: 'c', text: 'Skip the scan — you will remember where you put it' },
              { id: 'd', text: 'Leave the items on the floor by the full bin' },
            ],
            correctOptionId: 'b',
            explanation:
              'The system is only useful if it matches reality. Scanning the real location keeps the next picker from hunting for "lost" stock.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'clt-course-5',
        courseName: 'Procurement and Vendor Management',
        programSlug: 'certified-logistics-technician-clt',
        checkpoints: [
          {
            id: 'clt-course-5-cp-1',
            courseSlug: 'clt-course-5',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Compare vendor offers on more than just price',
            onetSkills: ['Negotiation', 'Management of Material Resources'],
            scenario:
              'You are comparing two vendors for packing supplies. Vendor A is 5% cheaper but often delivers late. Vendor B costs a bit more, delivers on time, and replaces defects fast.',
            question: 'What is the best recommendation?',
            options: [
              { id: 'a', text: 'Vendor A — lowest price always wins' },
              { id: 'b', text: 'Vendor B — reliable delivery and service can be worth more than a small price difference' },
              { id: 'c', text: 'Neither — keep searching until a vendor is both cheapest and perfect' },
              { id: 'd', text: 'Split every order 50/50 so no one is upset' },
            ],
            correctOptionId: 'b',
            explanation:
              'Total cost includes late deliveries, stockouts, and defect handling — not just the invoice price. A slightly higher price with reliable service is often the cheaper choice overall.',
            level: 'applied',
          },
          {
            id: 'clt-course-5-cp-2',
            courseSlug: 'clt-course-5',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Handle a vendor gift without crossing an ethics line',
            onetSkills: ['Negotiation'],
            scenario:
              'A vendor you help evaluate sends you a $200 gift card "as a thank you" right before your company decides next year’s contract.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Keep it quietly — it is just a thank you' },
              { id: 'b', text: 'Report it to your manager and follow your company’s gift policy, which usually means returning it' },
              { id: 'c', text: 'Keep it but promise yourself it will not affect your vote' },
              { id: 'd', text: 'Ask the vendor for cash instead' },
            ],
            correctOptionId: 'b',
            explanation:
              'A gift during a contract decision can look like a bribe even if you stay fair. Reporting it and following policy protects you and keeps the decision clean.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'clt-course-6',
        courseName: 'Supply Chain Technology and SAP',
        programSlug: 'certified-logistics-technician-clt',
        checkpoints: [
          {
            id: 'clt-course-6-cp-1',
            courseSlug: 'clt-course-6',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Fix a data entry mistake in the ERP system the right way',
            onetSkills: ['Technology Design', 'Systems Analysis'],
            scenario:
              'In SAP, you accidentally received 500 units against a purchase order that was only for 50. You notice right after saving.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Leave it — the numbers will sort themselves out at month end' },
              { id: 'b', text: 'Tell your supervisor right away and reverse or correct the receipt using the proper transaction' },
              { id: 'c', text: 'Delete random inventory records until totals look right' },
              { id: 'd', text: 'Create a new purchase order for -450 units' },
            ],
            correctOptionId: 'b',
            explanation:
              'ERP systems have proper correction steps that keep an audit trail. Quick honest correction prevents bad data from spreading into payments, inventory, and planning.',
            level: 'foundation',
          },
          {
            id: 'clt-course-6-cp-2',
            courseSlug: 'clt-course-6',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Trust but verify what the system says before acting',
            onetSkills: ['Systems Analysis'],
            scenario:
              'SAP shows 200 units available, but a picker says the bin looks almost empty. A big customer order for 180 units is about to be confirmed.',
            question: 'What is the best next step?',
            options: [
              { id: 'a', text: 'Confirm the order — the system is always right' },
              { id: 'b', text: 'Hold the confirmation briefly and request a quick physical count of the bin' },
              { id: 'c', text: 'Cancel the customer order to be safe' },
              { id: 'd', text: 'Tell the picker to stop worrying about it' },
            ],
            correctOptionId: 'b',
            explanation:
              'When a person on the floor and the system disagree, a quick count settles it. Confirming an order you cannot fill damages the customer relationship more than a short delay.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'clt-course-7',
        courseName: 'Global Supply Chain and Trade',
        programSlug: 'certified-logistics-technician-clt',
        checkpoints: [
          {
            id: 'clt-course-7-cp-1',
            courseSlug: 'clt-course-7',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Handle customs paperwork honestly',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'You are preparing an export shipment. A coworker suggests listing the goods at a lower value on the customs form "to save the customer money on duties."',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Do it — everyone does this' },
              { id: 'b', text: 'Refuse and declare the true value; undervaluing goods on customs forms is illegal' },
              { id: 'c', text: 'List the lower value but keep the real invoice in case anyone asks' },
              { id: 'd', text: 'Leave the value field blank' },
            ],
            correctOptionId: 'b',
            explanation:
              'Falsifying customs declarations is fraud and can mean fines, seized goods, and lost import privileges for your company. The true value always goes on the form.',
            level: 'applied',
          },
          {
            id: 'clt-course-7-cp-2',
            courseSlug: 'clt-course-7',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Plan around longer international lead times',
            onetSkills: ['Management of Material Resources'],
            scenario:
              'A part you usually buy locally (3-day lead time) will now come from overseas by ocean freight (35-day lead time). Your manager asks what needs to change.',
            question: 'What is the most important adjustment?',
            options: [
              { id: 'a', text: 'Nothing — order the same way as before' },
              { id: 'b', text: 'Order much earlier and hold more safety stock to cover the longer, less predictable lead time' },
              { id: 'c', text: 'Stop selling products that use that part' },
              { id: 'd', text: 'Air-freight every order, no matter the cost' },
            ],
            correctOptionId: 'b',
            explanation:
              'Longer lead times mean you must order further ahead and buffer against delays like port congestion. That is the core trade-off of cheaper overseas sourcing.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'clt-course-8',
        courseName: 'CLT Certification Preparation',
        programSlug: 'certified-logistics-technician-clt',
        checkpoints: [
          {
            id: 'clt-course-8-cp-1',
            courseSlug: 'clt-course-8',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Build a study plan that fits a working schedule',
            onetSkills: ['Learning Strategies', 'Time Management'],
            scenario:
              'Your CLT exam is in four weeks. You work full time. Practice tests show you are strong on warehousing but weak on inventory math.',
            question: 'What is the smartest study plan?',
            options: [
              { id: 'a', text: 'Cram everything the night before the exam' },
              { id: 'b', text: 'Schedule short, regular sessions and spend extra time on inventory math, your weakest area' },
              { id: 'c', text: 'Only review warehousing, since you are best at it' },
              { id: 'd', text: 'Skip practice tests so you do not get discouraged' },
            ],
            correctOptionId: 'b',
            explanation:
              'Spaced practice beats cramming, and time goes furthest when aimed at your weakest topics. Practice tests are how you find those topics.',
            level: 'applied',
          },
          {
            id: 'clt-course-8-cp-2',
            courseSlug: 'clt-course-8',
            programSlug: 'certified-logistics-technician-clt',
            demonstratedSkill: 'Use exam time wisely under pressure',
            onetSkills: ['Time Management'],
            scenario:
              'During the CLT exam, you hit a question you cannot solve. You have 40 questions left and time is tight.',
            question: 'What is the best move?',
            options: [
              { id: 'a', text: 'Stay on the question until you crack it, no matter how long' },
              { id: 'b', text: 'Mark it, make your best guess, move on, and return if time allows' },
              { id: 'c', text: 'Leave it blank and never come back' },
              { id: 'd', text: 'Rush through the rest of the exam to make up lost time' },
            ],
            correctOptionId: 'b',
            explanation:
              'One hard question should not cost you ten easy ones. Mark, guess, and move keeps your pace while leaving the door open to return.',
            level: 'foundation',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // CERTIFIED PRODUCTION TECHNICIAN (CPT)
  // ==========================================================================
  {
    programSlug: 'certified-production-technician-cpt',
    programTitle: 'Certified Production Technician (CPT)',
    whyItMatters:
      'Manufacturers hire people who catch quality problems early and never cut corners on safety — these checkpoints show you do both.',
    courses: [
      {
        courseSlug: 'cpt-course-1',
        courseName: 'Introduction to Manufacturing',
        programSlug: 'certified-production-technician-cpt',
        checkpoints: [
          {
            id: 'cpt-course-1-cp-1',
            courseSlug: 'cpt-course-1',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Follow the standard process on a production line',
            onetSkills: ['Technology Design'],
            scenario:
              'It is your first week on a production line. You find a faster way to do your assembly step than the posted work instruction shows.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Switch to your faster way right away' },
              { id: 'b', text: 'Keep following the posted instruction and suggest your idea to your lead for review' },
              { id: 'c', text: 'Use your way only when no one is watching' },
              { id: 'd', text: 'Teach your faster way to coworkers first' },
            ],
            correctOptionId: 'b',
            explanation:
              'Work instructions exist for quality and safety reasons you may not see yet. Good plants want your ideas — through the review process, not as silent changes.',
            level: 'foundation',
          },
          {
            id: 'cpt-course-1-cp-2',
            courseSlug: 'cpt-course-1',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Speak up when something on the line looks wrong',
            onetSkills: ['Technology Design'],
            scenario:
              'A machine on your line starts making a new grinding noise. It is still producing parts, and stopping the line will slow today’s output.',
            question: 'What is the right call?',
            options: [
              { id: 'a', text: 'Ignore it — it is still working' },
              { id: 'b', text: 'Report the noise to your lead or maintenance now, before it becomes a breakdown or a safety issue' },
              { id: 'c', text: 'Open the machine guard and look inside while it runs' },
              { id: 'd', text: 'Turn up the line speed to finish before it breaks' },
            ],
            correctOptionId: 'b',
            explanation:
              'New noises are early warnings. Reporting early usually means a small fix; waiting often means a breakdown, scrap, or injury. Never open guards on a running machine.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'cpt-course-2',
        courseName: 'Blueprint Reading and Technical Drawing',
        programSlug: 'certified-production-technician-cpt',
        checkpoints: [
          {
            id: 'cpt-course-2-cp-1',
            courseSlug: 'cpt-course-2',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Use a blueprint tolerance to accept or reject a part',
            onetSkills: ['Visualization'],
            scenario:
              'The blueprint calls for a hole 10.0 mm wide, with a tolerance of plus or minus 0.2 mm. You measure a part’s hole at 10.3 mm.',
            question: 'What does this measurement tell you?',
            options: [
              { id: 'a', text: 'The part is fine — 10.3 is close to 10.0' },
              { id: 'b', text: 'The part is out of tolerance — the allowed range is 9.8 to 10.2 mm' },
              { id: 'c', text: 'The blueprint must be wrong' },
              { id: 'd', text: 'You should drill the hole bigger to be safe' },
            ],
            correctOptionId: 'b',
            explanation:
              'Tolerance sets the allowed range: 10.0 ± 0.2 means 9.8 to 10.2 mm. At 10.3 mm the part is out of spec and needs to be flagged, not waved through.',
            level: 'foundation',
          },
          {
            id: 'cpt-course-2-cp-2',
            courseSlug: 'cpt-course-2',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Resolve a conflict between a drawing and a verbal instruction',
            onetSkills: ['Visualization', 'Spatial Orientation'],
            scenario:
              'A coworker tells you to cut a bracket at 150 mm. The current revision of the drawing says 155 mm. Material is expensive and cuts cannot be undone.',
            question: 'What should you do before cutting?',
            options: [
              { id: 'a', text: 'Cut at 150 mm — your coworker has more experience' },
              { id: 'b', text: 'Pause and confirm the correct dimension against the latest drawing with your lead' },
              { id: 'c', text: 'Cut at 152.5 mm to split the difference' },
              { id: 'd', text: 'Cut one at each size and pick later' },
            ],
            correctOptionId: 'b',
            explanation:
              'The released drawing is the official spec. When word-of-mouth and the drawing disagree, stop and confirm — a wrong cut wastes material and time.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'cpt-course-3',
        courseName: 'Machining and CNC Operations',
        programSlug: 'certified-production-technician-cpt',
        checkpoints: [
          {
            id: 'cpt-course-3-cp-1',
            courseSlug: 'cpt-course-3',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Respond safely when a CNC machine sounds wrong mid-cycle',
            onetSkills: ['Operation and Control', 'Equipment Maintenance'],
            scenario:
              'Your CNC machine starts chattering loudly mid-cycle and the cut looks rough through the window. The part is half finished.',
            question: 'What is the safest correct response?',
            options: [
              { id: 'a', text: 'Open the door to look while the spindle is turning' },
              { id: 'b', text: 'Use the feed hold or stop, let the machine come to a safe state, then inspect the tool and part' },
              { id: 'c', text: 'Let the cycle finish — stopping wastes the part anyway' },
              { id: 'd', text: 'Increase the feed rate to push through the chatter' },
            ],
            correctOptionId: 'b',
            explanation:
              'Chatter often means a worn or loose tool, which can break and throw metal. Stop safely first; never reach into or open a machine that is still cutting.',
            level: 'foundation',
          },
          {
            id: 'cpt-course-3-cp-2',
            courseSlug: 'cpt-course-3',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Verify the first part before running a full batch',
            onetSkills: ['Quality Control Analysis', 'Operation and Control'],
            scenario:
              'You just set up a CNC job for 300 parts. The program ran fine in a dry run. You are ready to start cutting.',
            question: 'What should you do after the first part comes off?',
            options: [
              { id: 'a', text: 'Run the rest — the setup worked once' },
              { id: 'b', text: 'Measure the first part against the print and only continue after it checks out' },
              { id: 'c', text: 'Measure a part somewhere around number 150' },
              { id: 'd', text: 'Wait and measure all 300 at the end' },
            ],
            correctOptionId: 'b',
            explanation:
              'First-article inspection catches setup errors before they multiply. If part one is wrong, you scrap one part — not 300.',
            level: 'applied',
          },
          {
            id: 'cpt-course-3-cp-3',
            courseSlug: 'cpt-course-3',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Clear a machine jam without risking your hands',
            onetSkills: ['Equipment Maintenance', 'Operation and Control'],
            scenario:
              'Chips have jammed around a fixture inside your machine. The cycle is paused but the machine is still powered and could restart. You can almost reach the jam.',
            question: 'What must you do before clearing the jam?',
            options: [
              { id: 'a', text: 'Reach in quickly while it is paused' },
              { id: 'b', text: 'Follow lockout/tagout: shut down and isolate the machine’s energy so it cannot start while your hands are inside' },
              { id: 'c', text: 'Have a coworker watch the controls while you reach in' },
              { id: 'd', text: 'Poke the jam loose with a long screwdriver while it is paused' },
            ],
            correctOptionId: 'b',
            explanation:
              'A paused machine can restart without warning. Lockout/tagout is the only safe way to put any part of your body into a machine — a coworker at the controls is not protection.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'cpt-course-4',
        courseName: 'Welding Fundamentals',
        programSlug: 'certified-production-technician-cpt',
        checkpoints: [
          {
            id: 'cpt-course-4-cp-1',
            courseSlug: 'cpt-course-4',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Protect yourself and others from welding arc flash',
            onetSkills: ['Operation and Control'],
            scenario:
              'You are about to tack weld a bracket. Your helmet lens is cracked, and a coworker is grinding ten feet away with no welding screen between you.',
            question: 'What should you do before striking an arc?',
            options: [
              { id: 'a', text: 'Weld fast — it is only a small tack' },
              { id: 'b', text: 'Replace the cracked lens and set up a screen or warn your coworker before welding' },
              { id: 'c', text: 'Close your eyes during the tack' },
              { id: 'd', text: 'Hold the helmet away from your face so you can see better' },
            ],
            correctOptionId: 'b',
            explanation:
              'Arc light burns eyes in seconds — yours through a cracked lens, and your coworker’s without a screen. No weld is too small for full protection.',
            level: 'foundation',
          },
          {
            id: 'cpt-course-4-cp-2',
            courseSlug: 'cpt-course-4',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Check the work area for fire hazards before welding',
            onetSkills: ['Operation and Control', 'Equipment Maintenance'],
            scenario:
              'You are asked to weld a rack in a corner of the shop. You see cardboard boxes and a rag bin within a few feet of where sparks will land.',
            question: 'What is the right first step?',
            options: [
              { id: 'a', text: 'Weld carefully and watch where the sparks go' },
              { id: 'b', text: 'Move or cover the flammable materials and have a fire extinguisher nearby before welding' },
              { id: 'c', text: 'Wet the cardboard a little and start welding' },
              { id: 'd', text: 'Weld quickly so sparks have less time to start a fire' },
            ],
            correctOptionId: 'b',
            explanation:
              'Welding sparks travel and can smolder for a long time before flaming. Clearing combustibles and having an extinguisher ready is standard hot-work practice.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'cpt-course-5',
        courseName: 'Quality Control and Inspection',
        programSlug: 'certified-production-technician-cpt',
        checkpoints: [
          {
            id: 'cpt-course-5-cp-1',
            courseSlug: 'cpt-course-5',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Act on a defect found on the production line',
            onetSkills: ['Quality Control Analysis'],
            scenario:
              'During inspection you find three parts in a row with the same scratch in the same spot. The line is still running and making more parts.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Toss the three bad parts and keep inspecting' },
              { id: 'b', text: 'Alert your lead to pause and check the line — a repeating defect points to a process problem still making bad parts' },
              { id: 'c', text: 'Polish out the scratches yourself and pass the parts' },
              { id: 'd', text: 'Lower your inspection standard since the scratch is small' },
            ],
            correctOptionId: 'b',
            explanation:
              'Three identical defects in a row is a pattern, not bad luck. Until the cause is found, the line keeps producing scrap — stopping it early saves money.',
            level: 'foundation',
          },
          {
            id: 'cpt-course-5-cp-2',
            courseSlug: 'cpt-course-5',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Read a control chart and respond to a drift',
            onetSkills: ['Quality Control Analysis', 'Mathematics', 'Operations Analysis'],
            scenario:
              'Your SPC chart shows the last seven measurements all trending upward toward the upper control limit, but none are out of spec yet.',
            question: 'What does this trend mean you should do?',
            options: [
              { id: 'a', text: 'Nothing — every point is still in spec' },
              { id: 'b', text: 'Flag it now — a steady trend signals the process is drifting and will make bad parts if not corrected' },
              { id: 'c', text: 'Erase the last few points and remeasure' },
              { id: 'd', text: 'Widen the control limits so the trend fits' },
            ],
            correctOptionId: 'b',
            explanation:
              'SPC exists to catch problems before parts go out of spec. A run of points trending one way is a signal to investigate, even while parts still measure good.',
            level: 'applied',
          },
          {
            id: 'cpt-course-5-cp-3',
            courseSlug: 'cpt-course-5',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Use calibrated tools so measurements can be trusted',
            onetSkills: ['Quality Control Analysis', 'Mathematics'],
            scenario:
              'You grab a caliper for final inspection and notice its calibration sticker expired last month. A shipment is waiting on your sign-off.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Use it anyway — it was fine last month' },
              { id: 'b', text: 'Set it aside and use a tool with current calibration, reporting the expired one' },
              { id: 'c', text: 'Measure twice with the expired caliper and average the numbers' },
              { id: 'd', text: 'Skip measuring and sign off by eye' },
            ],
            correctOptionId: 'b',
            explanation:
              'An out-of-calibration tool may read wrong, which makes every measurement — and your sign-off — unreliable. Quality systems require current calibration on inspection tools.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'cpt-course-6',
        courseName: 'Safety and OSHA Compliance',
        programSlug: 'certified-production-technician-cpt',
        checkpoints: [
          {
            id: 'cpt-course-6-cp-1',
            courseSlug: 'cpt-course-6',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Wear the required PPE even when it slows you down',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'You need to cut one strap on a pallet. Your safety glasses are at your station, a one-minute walk away. The area requires eye protection.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Make the quick cut without glasses — it takes two seconds' },
              { id: 'b', text: 'Walk back and get your safety glasses before cutting' },
              { id: 'c', text: 'Squint and turn your face away while cutting' },
              { id: 'd', text: 'Borrow regular sunglasses from a coworker' },
            ],
            correctOptionId: 'b',
            explanation:
              'Strap ends snap back fast and eye injuries happen in exactly these "two-second" jobs. PPE rules apply to every task, not just the long ones.',
            level: 'foundation',
          },
          {
            id: 'cpt-course-6-cp-2',
            courseSlug: 'cpt-course-6',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Refuse to bypass a machine safety guard',
            onetSkills: ['Judgment and Decision Making', 'Management of Material Resources'],
            scenario:
              'A press keeps stopping because its light curtain triggers. A coworker shows you how to tape over the sensor "so we can hit our numbers today."',
            question: 'What is the right response?',
            options: [
              { id: 'a', text: 'Tape it — production targets matter' },
              { id: 'b', text: 'Refuse to bypass the guard and report the problem so maintenance can fix the real cause' },
              { id: 'c', text: 'Bypass it but stand extra far from the press' },
              { id: 'd', text: 'Bypass it only for your shift, then remove the tape' },
            ],
            correctOptionId: 'b',
            explanation:
              'Safety devices like light curtains keep hands out of presses. Bypassing one is an OSHA violation and a common cause of amputations — no production goal is worth it.',
            level: 'applied',
          },
          {
            id: 'cpt-course-6-cp-3',
            courseSlug: 'cpt-course-6',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Respond correctly to a chemical spill',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'A container of cleaning solvent tips over near your station. Strong fumes spread fast. You do not know what protection the chemical requires.',
            question: 'What should you do first?',
            options: [
              { id: 'a', text: 'Grab paper towels and wipe it up quickly' },
              { id: 'b', text: 'Move away, alert others, and report the spill so trained people with the SDS and right PPE can handle it' },
              { id: 'c', text: 'Pour water on it to dilute the fumes' },
              { id: 'd', text: 'Open a window and keep working' },
            ],
            correctOptionId: 'b',
            explanation:
              'Never clean an unknown chemical without checking the Safety Data Sheet and wearing the right PPE. Getting people clear and reporting it is the safe, compliant first move.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'cpt-course-7',
        courseName: 'Lean Manufacturing Principles',
        programSlug: 'certified-production-technician-cpt',
        checkpoints: [
          {
            id: 'cpt-course-7-cp-1',
            courseSlug: 'cpt-course-7',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Spot waste in a daily work routine',
            onetSkills: ['Systems Analysis', 'Operations Analysis'],
            scenario:
              'Every hour, you walk across the plant to get fasteners because your station only stores a tiny bin. The walk takes five minutes each way.',
            question: 'In lean terms, what is this walking time?',
            options: [
              { id: 'a', text: 'Value-added work, because the fasteners are needed' },
              { id: 'b', text: 'Waste (motion/transport) — it adds no value and could be removed by stocking more at the station' },
              { id: 'c', text: 'Good exercise that the company should encourage' },
              { id: 'd', text: 'A quality control step' },
            ],
            correctOptionId: 'b',
            explanation:
              'Customers pay for the assembled product, not your walking. Lean calls this motion waste — the fix is to bring materials to the point of use.',
            level: 'foundation',
          },
          {
            id: 'cpt-course-7-cp-2',
            courseSlug: 'cpt-course-7',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Use root-cause thinking instead of quick blame',
            onetSkills: ['Systems Analysis', 'Systems Evaluation'],
            scenario:
              'Parts keep arriving late at your station. Your team starts a 5 Whys exercise. The first answer is "the upstream operator is slow."',
            question: 'What should the team do next?',
            options: [
              { id: 'a', text: 'Stop there — the problem is the slow operator' },
              { id: 'b', text: 'Keep asking why — for example, why is that step slow? — until you reach a process cause you can fix' },
              { id: 'c', text: 'Ask management to replace the operator' },
              { id: 'd', text: 'Add a big buffer of parts and call it solved' },
            ],
            correctOptionId: 'b',
            explanation:
              '5 Whys digs past people-blame to process causes — maybe the upstream station has a worn tool or missing materials. Fixing the process fixes the delay for everyone.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'cpt-course-8',
        courseName: 'Production Technology Capstone',
        programSlug: 'certified-production-technician-cpt',
        checkpoints: [
          {
            id: 'cpt-course-8-cp-1',
            courseSlug: 'cpt-course-8',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Balance safety, quality, and output when they conflict',
            onetSkills: ['Complex Problem Solving', 'Systems Evaluation'],
            scenario:
              'It is end of shift. You can hit today’s production target only if you skip the final inspection step on the last 20 parts. These parts go into customer vehicles.',
            question: 'What is the right decision?',
            options: [
              { id: 'a', text: 'Skip inspection — the target matters most today' },
              { id: 'b', text: 'Inspect every part and report the shortfall honestly; uninspected parts must not ship' },
              { id: 'c', text: 'Inspect a couple and assume the rest are fine' },
              { id: 'd', text: 'Mark the parts inspected and check them tomorrow' },
            ],
            correctOptionId: 'b',
            explanation:
              'Quality and safety steps are never the corner to cut, especially on parts that affect end users. A missed target is recoverable; a defective shipped part may not be.',
            level: 'job_ready',
          },
          {
            id: 'cpt-course-8-cp-2',
            courseSlug: 'cpt-course-8',
            programSlug: 'certified-production-technician-cpt',
            demonstratedSkill: 'Troubleshoot a production problem step by step',
            onetSkills: ['Complex Problem Solving'],
            scenario:
              'Your line’s scrap rate doubled overnight. A new material lot started yesterday, a tool was changed, and a new operator joined — all at once.',
            question: 'What is the best troubleshooting approach?',
            options: [
              { id: 'a', text: 'Assume the new operator is the cause' },
              { id: 'b', text: 'Check one variable at a time — for example, run the old material lot first — to isolate which change caused it' },
              { id: 'c', text: 'Change all three things back at once' },
              { id: 'd', text: 'Wait a week to see if it fixes itself' },
            ],
            correctOptionId: 'b',
            explanation:
              'When several things changed, testing one variable at a time tells you which one matters. Changing everything back may hide the cause and the lesson.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // CORE CONSTRUCTION
  // ==========================================================================
  {
    programSlug: 'core-construction-training-certificate',
    programTitle: 'Core Construction',
    whyItMatters:
      'Construction crews hire people who work safe and measure right the first time — these checkpoints prove you are jobsite-ready.',
    courses: [
      {
        courseSlug: 'construction-course-1',
        courseName: 'Introduction to Construction Industry',
        programSlug: 'core-construction-training-certificate',
        checkpoints: [
          {
            id: 'construction-course-1-cp-1',
            courseSlug: 'construction-course-1',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Show up jobsite-ready on day one',
            onetSkills: ['Technology Design'],
            scenario:
              'It is your first day as a construction laborer. The job posting said "PPE required." You are deciding what to bring and wear.',
            question: 'What is the right way to show up?',
            options: [
              { id: 'a', text: 'Sneakers and shorts — you will figure out gear later' },
              { id: 'b', text: 'Sturdy work boots, long pants, and any required PPE like a hard hat and safety glasses, arriving a little early' },
              { id: 'c', text: 'Whatever is comfortable — the company provides everything' },
              { id: 'd', text: 'Just a hard hat; the rest is optional' },
            ],
            correctOptionId: 'b',
            explanation:
              'Jobsites require boots, long pants, hard hat, and eye protection in most work areas. Showing up dressed and on time is the first thing crews notice about a new hire.',
            level: 'foundation',
          },
          {
            id: 'construction-course-1-cp-2',
            courseSlug: 'construction-course-1',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Know who to ask when instructions are unclear',
            onetSkills: ['Technology Design'],
            scenario:
              'Your foreman tells you to "stage the materials by the east wall." You are not sure which wall is east or exactly what "stage" means here.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Guess — asking questions makes you look weak' },
              { id: 'b', text: 'Ask the foreman to point out the spot and confirm what they want before you start' },
              { id: 'c', text: 'Stack the materials wherever there is room' },
              { id: 'd', text: 'Wait quietly until someone notices you are stuck' },
            ],
            correctOptionId: 'b',
            explanation:
              'On a jobsite, a wrong guess wastes labor and can block other trades. Foremen respect a quick, clear question far more than redone work.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'construction-course-2',
        courseName: 'Blueprint Reading and Construction Math',
        programSlug: 'core-construction-training-certificate',
        checkpoints: [
          {
            id: 'construction-course-2-cp-1',
            courseSlug: 'construction-course-2',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Use the drawing scale to find a real-world length',
            onetSkills: ['Visualization', 'Mathematics'],
            scenario:
              'A floor plan uses the scale 1/4 inch = 1 foot. On the plan, a wall measures 6 inches long. Your partner says the wall is 6 feet.',
            question: 'How long is the wall really?',
            options: [
              { id: 'a', text: '6 feet — the plan says 6' },
              { id: 'b', text: '24 feet — every 1/4 inch equals 1 foot, and 6 inches holds 24 quarter-inches' },
              { id: 'c', text: '12 feet' },
              { id: 'd', text: 'You cannot tell from a drawing' },
            ],
            correctOptionId: 'b',
            explanation:
              'With 1/4" = 1', divide the drawing length by 1/4: 6 ÷ 0.25 = 24 feet. Mixing up plan inches with real feet is one of the most common beginner errors.',
            level: 'foundation',
          },
          {
            id: 'construction-course-2-cp-2',
            courseSlug: 'construction-course-2',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Calculate materials before cutting or ordering',
            onetSkills: ['Mathematics', 'Number Facility'],
            scenario:
              'You need to order plywood for a floor that is 20 feet by 12 feet. Each sheet covers 32 square feet. Your lead asks how many sheets to order.',
            question: 'What is the right order, allowing no waste factor?',
            options: [
              { id: 'a', text: '6 sheets' },
              { id: 'b', text: '8 sheets — the floor is 240 square feet, and 240 divided by 32 is 7.5, so round up' },
              { id: 'c', text: '7 sheets — round 7.5 down to save money' },
              { id: 'd', text: '32 sheets, one per square foot' },
            ],
            correctOptionId: 'b',
            explanation:
              'Area is 20 x 12 = 240 sq ft; 240 ÷ 32 = 7.5 sheets. You cannot buy half a sheet, so you round up — rounding down leaves the job short.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'construction-course-3',
        courseName: 'Construction Safety and OSHA-10',
        programSlug: 'core-construction-training-certificate',
        checkpoints: [
          {
            id: 'construction-course-3-cp-1',
            courseSlug: 'construction-course-3',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Act on a jobsite fall hazard',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'You spot a coworker working near an open floor edge on the second story. There is no guardrail and he is not wearing a harness.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Mind your own business — he knows his job' },
              { id: 'b', text: 'Warn him right away and report the unprotected edge to the supervisor so fall protection gets put in place' },
              { id: 'c', text: 'Take a photo for proof and keep working' },
              { id: 'd', text: 'Yell at him to be careful and move on' },
            ],
            correctOptionId: 'b',
            explanation:
              'Falls are the leading killer in construction. OSHA requires fall protection at 6 feet in construction — warn the worker now and report so the hazard is fixed, not just avoided.',
            level: 'foundation',
          },
          {
            id: 'construction-course-3-cp-2',
            courseSlug: 'construction-course-3',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Stay safe around trenches and excavations',
            onetSkills: ['Judgment and Decision Making', 'Management of Material Resources'],
            scenario:
              'You are told to retrieve a tool from the bottom of a 6-foot-deep trench. The trench walls are straight dirt with no shoring, shields, or sloping.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Hop in quickly — you will only be down there a few seconds' },
              { id: 'b', text: 'Stay out and tell your supervisor — a trench 5 feet or deeper needs a protective system before anyone enters' },
              { id: 'c', text: 'Enter, but have a coworker watch the walls' },
              { id: 'd', text: 'Lower yourself halfway and grab it with a stick' },
            ],
            correctOptionId: 'b',
            explanation:
              'Trench cave-ins happen in seconds and the soil weight kills. OSHA requires cave-in protection at 5 feet — no quick errand is an exception.',
            level: 'applied',
          },
          {
            id: 'construction-course-3-cp-3',
            courseSlug: 'construction-course-3',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Set up and use a ladder safely',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'You need to get on a 12-foot roof. The extension ladder reaches the edge exactly, with nothing extending above. The ground under one foot is soft.',
            question: 'What must you fix before climbing?',
            options: [
              { id: 'a', text: 'Nothing — the ladder reaches, so climb carefully' },
              { id: 'b', text: 'Set the ladder so it extends about 3 feet above the roof edge and is on firm, level footing' },
              { id: 'c', text: 'Have someone hold the bottom and climb fast' },
              { id: 'd', text: 'Stack a board under the soft side and go' },
            ],
            correctOptionId: 'b',
            explanation:
              'A ladder must extend about 3 feet past the landing so you can hold it while stepping off, and it must sit on stable, level ground. Both problems here must be fixed first.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'construction-course-4',
        courseName: 'Hand and Power Tools',
        programSlug: 'core-construction-training-certificate',
        checkpoints: [
          {
            id: 'construction-course-4-cp-1',
            courseSlug: 'construction-course-4',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Take a damaged power tool out of service',
            onetSkills: ['Equipment Maintenance', 'Operation and Control'],
            scenario:
              'You pick up a circular saw and see its blade guard is stuck open and the power cord has a cut showing bare wire.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Use it carefully — guards just slow you down' },
              { id: 'b', text: 'Tag it out of service and report it so it gets repaired or replaced; use a safe tool instead' },
              { id: 'c', text: 'Wrap electrical tape on the cord and use it' },
              { id: 'd', text: 'Use it but wear thicker gloves' },
            ],
            correctOptionId: 'b',
            explanation:
              'A stuck-open guard and exposed wiring are both serious injury risks. Damaged tools come out of service immediately — tape and gloves are not fixes.',
            level: 'foundation',
          },
          {
            id: 'construction-course-4-cp-2',
            courseSlug: 'construction-course-4',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Change tool accessories without getting hurt',
            onetSkills: ['Equipment Maintenance', 'Operation and Control'],
            scenario:
              'You need to swap the blade on a corded circular saw. The saw is plugged in nearby, switched off.',
            question: 'What must you do before touching the blade?',
            options: [
              { id: 'a', text: 'Nothing extra — the switch is off' },
              { id: 'b', text: 'Unplug the saw first, then change the blade with the wrench' },
              { id: 'c', text: 'Hold the trigger lock while you work' },
              { id: 'd', text: 'Change it quickly so there is less time for an accident' },
            ],
            correctOptionId: 'b',
            explanation:
              'A switch can be bumped; an unplugged saw cannot start. Disconnect power before any blade change, adjustment, or jam clearing on a power tool.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'construction-course-5',
        courseName: 'Concrete and Masonry Fundamentals',
        programSlug: 'core-construction-training-certificate',
        checkpoints: [
          {
            id: 'construction-course-5-cp-1',
            courseSlug: 'construction-course-5',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Protect your skin when working with wet concrete',
            onetSkills: ['Operation and Control'],
            scenario:
              'You are finishing a slab and wet concrete has soaked through your glove onto your hand. The pour still has an hour to go.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Keep working — concrete is just wet rock' },
              { id: 'b', text: 'Stop, wash the skin right away, and put on a dry waterproof glove before continuing' },
              { id: 'c', text: 'Wipe your hand on your pants and keep finishing' },
              { id: 'd', text: 'Wait to wash up at the end of the pour' },
            ],
            correctOptionId: 'b',
            explanation:
              'Wet concrete is caustic and causes chemical burns the longer it sits on skin — often without early pain. Wash promptly and replace wet gloves.',
            level: 'foundation',
          },
          {
            id: 'construction-course-5-cp-2',
            courseSlug: 'construction-course-5',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Get a concrete mix right instead of guessing',
            onetSkills: ['Operation and Control', 'Mathematics'],
            scenario:
              'Your bagged concrete mix says to add 3 quarts of water per bag. The mix looks stiff, and a coworker says "just hose it down until it pours easy."',
            question: 'What is the right call?',
            options: [
              { id: 'a', text: 'Add water until it flows like soup — easier to place' },
              { id: 'b', text: 'Stay close to the specified water amount — extra water weakens the cured concrete' },
              { id: 'c', text: 'Add less water than listed so it sets harder' },
              { id: 'd', text: 'Water amount does not matter once it dries' },
            ],
            correctOptionId: 'b',
            explanation:
              'Too much water raises the water-cement ratio and permanently weakens the slab, even though it looks fine while wet. Follow the mix instructions.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'construction-course-6',
        courseName: 'Carpentry and Framing Basics',
        programSlug: 'core-construction-training-certificate',
        checkpoints: [
          {
            id: 'construction-course-6-cp-1',
            courseSlug: 'construction-course-6',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Measure and check before cutting lumber',
            onetSkills: ['Operation and Control', 'Visualization'],
            scenario:
              'You are cutting expensive lumber for stair stringers. You marked your line from one quick tape measurement. The saw is ready.',
            question: 'What should you do before cutting?',
            options: [
              { id: 'a', text: 'Cut — you already measured' },
              { id: 'b', text: 'Measure again and confirm the mark — measure twice, cut once' },
              { id: 'c', text: 'Cut a little long on purpose every time and trim later' },
              { id: 'd', text: 'Ask someone else to cut so it is not your mistake' },
            ],
            correctOptionId: 'b',
            explanation:
              'A second measurement costs seconds; a wrong cut costs a board. On layout-critical pieces like stringers, double-checking is standard practice.',
            level: 'foundation',
          },
          {
            id: 'construction-course-6-cp-2',
            courseSlug: 'construction-course-6',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Lay out wall studs to standard spacing',
            onetSkills: ['Visualization', 'Operation and Control'],
            scenario:
              'You are framing a wall that the plans call out at 16 inches on center. A coworker suggests spreading studs to 24 inches to save lumber.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Use 24 inches — fewer studs, faster wall' },
              { id: 'b', text: 'Frame at 16 inches on center as the plans require; spacing is a structural spec, not a preference' },
              { id: 'c', text: 'Mix spacings wherever boards land' },
              { id: 'd', text: 'Use 16 inches only on the ends' },
            ],
            correctOptionId: 'b',
            explanation:
              'Stud spacing comes from the plans and the building code — it carries load and lines up with sheathing and drywall edges. Changing it without approval can fail inspection.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'construction-course-7',
        courseName: 'Electrical and Plumbing Basics',
        programSlug: 'core-construction-training-certificate',
        checkpoints: [
          {
            id: 'construction-course-7-cp-1',
            courseSlug: 'construction-course-7',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Treat electrical wires as live until proven dead',
            onetSkills: ['Technology Design', 'Installation'],
            scenario:
              'You are asked to remove an old light fixture. The wall switch is off, but you have not checked the wires with a tester and the breaker is not locked off.',
            question: 'What must happen before you touch the wires?',
            options: [
              { id: 'a', text: 'Nothing — the switch is off' },
              { id: 'b', text: 'Turn off the breaker and verify the wires are dead with a tester before touching them' },
              { id: 'c', text: 'Wear rubber-soled shoes and work fast' },
              { id: 'd', text: 'Touch one wire at a time so current cannot flow' },
            ],
            correctOptionId: 'b',
            explanation:
              'A switch can be miswired and still leave wires hot. De-energize at the breaker and test before touch — that rule prevents most electrocutions.',
            level: 'foundation',
          },
          {
            id: 'construction-course-7-cp-2',
            courseSlug: 'construction-course-7',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Respect code limits and licensing on trade work',
            onetSkills: ['Technology Design', 'Installation'],
            scenario:
              'A homeowner on a side job asks you to move a gas water heater line. You have basic plumbing training but no license, and gas work in your area requires one.',
            question: 'What is the right response?',
            options: [
              { id: 'a', text: 'Do it — you have seen it done before' },
              { id: 'b', text: 'Decline the gas work and tell them it needs a licensed professional; unpermitted gas work risks leaks, fire, and legal trouble' },
              { id: 'c', text: 'Do it but tell them not to mention your name' },
              { id: 'd', text: 'Watch a video first, then do it' },
            ],
            correctOptionId: 'b',
            explanation:
              'Gas lines are licensed work for a reason — a small mistake can cause an explosion or carbon monoxide leak. Knowing the limits of your training is a job skill employers value.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'construction-course-8',
        courseName: 'Construction Readiness Capstone',
        programSlug: 'core-construction-training-certificate',
        checkpoints: [
          {
            id: 'construction-course-8-cp-1',
            courseSlug: 'construction-course-8',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Handle multiple hazards in the right order',
            onetSkills: ['Complex Problem Solving'],
            scenario:
              'Walking the site at start of shift you notice: a frayed extension cord in a puddle, a missing guardrail section on a walkway, and scrap wood blocking an exit path.',
            question: 'What is the best response?',
            options: [
              { id: 'a', text: 'Fix the scrap wood since it is easiest, and let someone else find the rest' },
              { id: 'b', text: 'Report all three to the supervisor right away, and keep people clear of the cord and the open edge until they are fixed' },
              { id: 'c', text: 'Unplug the cord yourself by pulling it out of the puddle barehanded' },
              { id: 'd', text: 'Note them in your head and mention them at lunch' },
            ],
            correctOptionId: 'b',
            explanation:
              'Electrocution and fall hazards can kill before lunch. Report immediately and guard the hazards — and never grab a frayed cord in water with bare hands.',
            level: 'job_ready',
          },
          {
            id: 'construction-course-8-cp-2',
            courseSlug: 'construction-course-8',
            programSlug: 'core-construction-training-certificate',
            demonstratedSkill: 'Plan a small task from drawings to done',
            onetSkills: ['Complex Problem Solving'],
            scenario:
              'Your foreman hands you a sketch and says: "Build three sawhorses by end of day." Lumber, tools, and fasteners are available in the yard.',
            question: 'What is the best first step?',
            options: [
              { id: 'a', text: 'Start cutting boards to the sizes you remember sawhorses being' },
              { id: 'b', text: 'Read the sketch, list the cuts and materials for all three, then gather everything before cutting' },
              { id: 'c', text: 'Build one however it works out, then copy it twice' },
              { id: 'd', text: 'Ask a coworker to build them with you watching' },
            ],
            correctOptionId: 'b',
            explanation:
              'Planning cuts and materials first avoids waste and mid-job trips to the yard. Working from the sketch — not memory — is how you match what was asked.',
            level: 'applied',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // MEDICAL CODING & HEALTH INFORMATION TECHNOLOGY (MCHIT)
  // ==========================================================================
  {
    programSlug: 'health-information-technology-mchit',
    programTitle: 'Medical Coding & Health Information Technology',
    whyItMatters:
      'Healthcare employers trust people who protect patient privacy and keep records accurate — these checkpoints prove you can be trusted with both.',
    courses: [
      {
        courseSlug: 'mchit-course-1',
        courseName: 'Introduction to Health Information Technology',
        programSlug: 'health-information-technology-mchit',
        checkpoints: [
          {
            id: 'mchit-course-1-cp-1',
            courseSlug: 'mchit-course-1',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Keep patient information private in everyday situations',
            onetSkills: ['Social Perceptiveness'],
            scenario:
              'In the break room, a coworker asks, "Did you see that famous patient admitted today? What are they in for?" You saw the record while doing your job.',
            question: 'What should you say?',
            options: [
              { id: 'a', text: 'Share it quietly — it is just one coworker' },
              { id: 'b', text: 'Decline to discuss it — patient information is only shared with people who need it for the patient’s care or their job' },
              { id: 'c', text: 'Share it but leave out the diagnosis' },
              { id: 'd', text: 'Tell them to look it up themselves' },
            ],
            correctOptionId: 'b',
            explanation:
              'HIPAA limits patient information to people with a job-related need to know. Curiosity is never a valid reason — telling them to look it up would also be a violation.',
            level: 'foundation',
          },
          {
            id: 'mchit-course-1-cp-2',
            courseSlug: 'mchit-course-1',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Handle a record you opened by mistake',
            onetSkills: ['Social Perceptiveness', 'Reading Comprehension'],
            scenario:
              'While searching the EHR, you accidentally open the record of a neighbor you know personally. It is not a patient you are assigned to work on.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Read it quickly since it is already open' },
              { id: 'b', text: 'Close it right away and tell your supervisor or privacy officer about the accidental access' },
              { id: 'c', text: 'Close it and never mention it to anyone' },
              { id: 'd', text: 'Mention to your neighbor that you saw their chart' },
            ],
            correctOptionId: 'b',
            explanation:
              'Accidental access happens; reading on or hiding it is what turns it into a violation. Reporting it promptly protects the patient and protects you, since access is logged.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'mchit-course-2',
        courseName: 'Medical Terminology and Anatomy',
        programSlug: 'health-information-technology-mchit',
        checkpoints: [
          {
            id: 'mchit-course-2-cp-1',
            courseSlug: 'mchit-course-2',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Break down an unfamiliar medical term to understand a chart',
            onetSkills: ['Science', 'Reading Comprehension'],
            scenario:
              'A chart note says the patient has "gastritis." You need to route this record to the right department and have never seen the word.',
            question: 'Using word parts, what does gastritis mean?',
            options: [
              { id: 'a', text: 'Inflammation of the stomach — "gastr" means stomach, "-itis" means inflammation' },
              { id: 'b', text: 'Surgical removal of the stomach' },
              { id: 'c', text: 'A disease of the joints' },
              { id: 'd', text: 'An imaging test of the abdomen' },
            ],
            correctOptionId: 'a',
            explanation:
              'Medical terms are built from parts: the root "gastr/o" means stomach and the suffix "-itis" means inflammation. Removal would be "-ectomy."',
            level: 'foundation',
          },
          {
            id: 'mchit-course-2-cp-2',
            courseSlug: 'mchit-course-2',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Catch a left-right mix-up in clinical documentation',
            onetSkills: ['Reading Comprehension', 'Memorization'],
            scenario:
              'A surgery note describes a procedure on the "right knee," but the billing sheet you received says "left knee." The claim is about to be processed.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Process the claim using the billing sheet — it came last' },
              { id: 'b', text: 'Stop and query the provider or check the full record to confirm the correct side before processing' },
              { id: 'c', text: 'Pick "right" because the surgeon’s note sounds more official' },
              { id: 'd', text: 'Remove the side from the claim so it cannot be wrong' },
            ],
            correctOptionId: 'b',
            explanation:
              'Laterality conflicts must be resolved at the source, not guessed. Even when one document seems more reliable, the standard practice is to verify before the claim goes out.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'mchit-course-3',
        courseName: 'Health Information Management',
        programSlug: 'health-information-technology-mchit',
        checkpoints: [
          {
            id: 'mchit-course-3-cp-1',
            courseSlug: 'mchit-course-3',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Correct a medical record without destroying history',
            onetSkills: ['Systems Analysis', 'Management of Material Resources'],
            scenario:
              'A nurse asks you to "just delete" a vital-signs entry she typed into the wrong patient’s chart and retype it in the right one.',
            question: 'What is the correct way to fix this?',
            options: [
              { id: 'a', text: 'Delete it like she asked — it is her entry' },
              { id: 'b', text: 'Follow the amendment/correction process so the error is marked, the fix is documented, and the audit trail stays intact' },
              { id: 'c', text: 'Leave the wrong entry and add a sticky note' },
              { id: 'd', text: 'Copy the entry to the right chart and leave the wrong one too' },
            ],
            correctOptionId: 'b',
            explanation:
              'Medical records are legal documents — errors get corrected through a documented amendment process, never silent deletion. The audit trail must show what changed and why.',
            level: 'applied',
          },
          {
            id: 'mchit-course-3-cp-2',
            courseSlug: 'mchit-course-3',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Spot and fix a duplicate patient record problem',
            onetSkills: ['Systems Analysis'],
            scenario:
              'You find two records for what looks like the same patient: "Maria Lopez, 3/4/1989" and "Maria Lopes, 3/4/1989." Each record holds different visit history.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Delete the one with fewer visits' },
              { id: 'b', text: 'Flag it for the duplicate-record (MPI) review process so the records can be verified and safely merged' },
              { id: 'c', text: 'Merge them yourself right now based on the birth date' },
              { id: 'd', text: 'Ignore it — clinicians will figure it out' },
            ],
            correctOptionId: 'b',
            explanation:
              'Duplicates split a patient’s history, which can hide allergies or results from clinicians. Merging requires verification — a wrong merge mixes two real patients, which is worse.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'mchit-course-4',
        courseName: 'Electronic Health Records (EHR)',
        programSlug: 'health-information-technology-mchit',
        checkpoints: [
          {
            id: 'mchit-course-4-cp-1',
            courseSlug: 'mchit-course-4',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Keep your EHR login secure',
            onetSkills: ['Technology Design'],
            scenario:
              'A busy physician’s assistant says, "My account is locked — log me in under yours real quick so I can chart this patient."',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Log them in — patient care comes first' },
              { id: 'b', text: 'Decline and help them reach IT or a supervisor to restore their own access' },
              { id: 'c', text: 'Log in and watch them while they chart' },
              { id: 'd', text: 'Give them your password just this once' },
            ],
            correctOptionId: 'b',
            explanation:
              'Every EHR entry is tied to the logged-in user — sharing access makes records untraceable and violates security policy. Helping them restore their own access solves the real problem.',
            level: 'foundation',
          },
          {
            id: 'mchit-course-4-cp-2',
            courseSlug: 'mchit-course-4',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Protect patient data on an unattended screen',
            onetSkills: ['Technology Design', 'Systems Analysis'],
            scenario:
              'You are charting at a hallway workstation when you are called away for a few minutes. A patient’s full record is on screen and visitors walk through this hallway.',
            question: 'What should you do before stepping away?',
            options: [
              { id: 'a', text: 'Leave it — you will be right back' },
              { id: 'b', text: 'Lock the screen or log out so no one can view or change the record while you are gone' },
              { id: 'c', text: 'Turn the monitor slightly toward the wall' },
              { id: 'd', text: 'Ask a passing visitor to watch your station' },
            ],
            correctOptionId: 'b',
            explanation:
              'An open record on an unattended screen is a privacy breach waiting to happen. Locking the workstation takes two seconds and is required practice in clinical settings.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'mchit-course-5',
        courseName: 'Healthcare Law, Ethics & HIPAA',
        programSlug: 'health-information-technology-mchit',
        checkpoints: [
          {
            id: 'mchit-course-5-cp-1',
            courseSlug: 'mchit-course-5',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Verify identity before releasing patient information',
            onetSkills: ['Judgment and Decision Making', 'Social Perceptiveness'],
            scenario:
              'A caller says he is a patient’s husband and asks for her test results. He sounds sincere and knows her birth date. You have no release authorization on file for him.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Give the results — he is family and knows her birth date' },
              { id: 'b', text: 'Politely decline and follow your release-of-information process; without authorization, results stay private even from family' },
              { id: 'c', text: 'Give just a summary instead of full results' },
              { id: 'd', text: 'Tell him to call back when a manager is in' },
            ],
            correctOptionId: 'b',
            explanation:
              'HIPAA does not let marriage substitute for authorization, and knowing a birth date proves nothing on a phone call. The release process exists for exactly this situation.',
            level: 'foundation',
          },
          {
            id: 'mchit-course-5-cp-2',
            courseSlug: 'mchit-course-5',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Respond correctly to a possible privacy breach',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'You realize a fax with patient records went to a wrong number yesterday. No one else seems to know, and reporting it might make your department look bad.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Stay quiet — the damage is already done' },
              { id: 'b', text: 'Report it to your supervisor or privacy officer immediately so the breach process can start' },
              { id: 'c', text: 'Call the wrong number yourself and ask them to shred it, then drop it' },
              { id: 'd', text: 'Wait to see if anyone complains first' },
            ],
            correctOptionId: 'b',
            explanation:
              'Misdirected faxes are reportable privacy incidents with required follow-up steps and timelines. Prompt internal reporting is what the law and your training expect — hiding it makes it far worse.',
            level: 'applied',
          },
          {
            id: 'mchit-course-5-cp-3',
            courseSlug: 'mchit-course-5',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Apply the minimum necessary rule under pressure',
            onetSkills: ['Judgment and Decision Making', 'Social Perceptiveness'],
            scenario:
              'A billing coworker asks you to export full medical histories for 50 patients. To do her billing task, she only needs dates of service and procedure codes.',
            question: 'What is the right response?',
            options: [
              { id: 'a', text: 'Send the full histories — more information is more helpful' },
              { id: 'b', text: 'Provide only the dates and procedure codes she needs for the task' },
              { id: 'c', text: 'Refuse to share anything at all' },
              { id: 'd', text: 'Send everything but ask her to delete what she does not use' },
            ],
            correctOptionId: 'b',
            explanation:
              'HIPAA’s minimum necessary rule says share only what the task requires. Billing needs billing data — full histories expose patients without reason. Refusing everything blocks legitimate work.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'mchit-course-6',
        courseName: 'Medical Coding: ICD-10 and CPT',
        programSlug: 'health-information-technology-mchit',
        checkpoints: [
          {
            id: 'mchit-course-6-cp-1',
            courseSlug: 'mchit-course-6',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Code only what the documentation supports',
            onetSkills: ['Reading Comprehension', 'Information Ordering'],
            scenario:
              'A provider’s note says "probable pneumonia, await chest X-ray." You are coding this outpatient visit and the X-ray result is not back yet.',
            question: 'What should you code?',
            options: [
              { id: 'a', text: 'Pneumonia — the provider said probable' },
              { id: 'b', text: 'The documented signs and symptoms — uncertain outpatient diagnoses are not coded as confirmed' },
              { id: 'c', text: 'Whatever pays best' },
              { id: 'd', text: 'Nothing until the X-ray comes back, even if the claim is late' },
            ],
            correctOptionId: 'b',
            explanation:
              'In outpatient coding, "probable" or "suspected" conditions are not coded as if confirmed — you code the signs and symptoms documented. Coding unconfirmed diagnoses misstates the record and the claim.',
            level: 'applied',
          },
          {
            id: 'mchit-course-6-cp-2',
            courseSlug: 'mchit-course-6',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Refuse to upcode, even when asked',
            onetSkills: ['Category Flexibility', 'Information Ordering'],
            scenario:
              'A manager hints you should "pick the higher-level visit code when in doubt — it is only a level apart and the office needs revenue."',
            question: 'What is the right approach?',
            options: [
              { id: 'a', text: 'Use the higher code — one level barely matters' },
              { id: 'b', text: 'Code the level the documentation actually supports; choosing higher codes for revenue is fraud' },
              { id: 'c', text: 'Always pick the lower code so no one can accuse you' },
              { id: 'd', text: 'Alternate high and low codes so it averages out' },
            ],
            correctOptionId: 'b',
            explanation:
              'Upcoding is billing fraud with serious penalties for the coder, not just the office. The documentation decides the code — always undercoding is also wrong because it misstates care.',
            level: 'job_ready',
          },
          {
            id: 'mchit-course-6-cp-3',
            courseSlug: 'mchit-course-6',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Use the coding manual instead of memory for tricky codes',
            onetSkills: ['Reading Comprehension', 'Category Flexibility'],
            scenario:
              'You think you remember the ICD-10 code for type 2 diabetes with neuropathy, but the chart includes details you have not coded before.',
            question: 'What is the right habit?',
            options: [
              { id: 'a', text: 'Type the code from memory — you are pretty sure' },
              { id: 'b', text: 'Look it up: use the Alphabetic Index, then verify the full code in the Tabular List before entering it' },
              { id: 'c', text: 'Use a general diabetes code and move on' },
              { id: 'd', text: 'Copy the code from the patient’s last visit' },
            ],
            correctOptionId: 'b',
            explanation:
              'Combination codes change with details, and last visit’s code may not match today’s documentation. Index first, verify in the Tabular — that is the professional standard.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'mchit-course-7',
        courseName: 'Revenue Cycle Management',
        programSlug: 'health-information-technology-mchit',
        checkpoints: [
          {
            id: 'mchit-course-7-cp-1',
            courseSlug: 'mchit-course-7',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Work a denied insurance claim instead of writing it off',
            onetSkills: ['Mathematics', 'Management of Material Resources'],
            scenario:
              'An insurance claim comes back denied with reason code "missing prior authorization." The chart shows an authorization number was actually obtained before the procedure.',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Write off the charge — denials are final' },
              { id: 'b', text: 'Appeal or resubmit the claim with the authorization number and supporting documentation' },
              { id: 'c', text: 'Bill the full amount to the patient instead' },
              { id: 'd', text: 'Resubmit the same claim unchanged and hope' },
            ],
            correctOptionId: 'b',
            explanation:
              'Many denials are fixable paperwork problems. When you have proof the requirement was met, an appeal with documentation recovers revenue the practice earned — billing the patient for a payer error is unfair and often not allowed.',
            level: 'applied',
          },
          {
            id: 'mchit-course-7-cp-2',
            courseSlug: 'mchit-course-7',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Stop billing errors at the front of the revenue cycle',
            onetSkills: ['Mathematics', 'Management of Material Resources'],
            scenario:
              'You notice many claims are denied for "patient not eligible on date of service." Digging in, you find front-desk staff rarely verify insurance before appointments.',
            question: 'What is the best long-term fix to suggest?',
            options: [
              { id: 'a', text: 'Hire more staff to appeal the denials faster' },
              { id: 'b', text: 'Verify insurance eligibility before each visit so bad claims never go out' },
              { id: 'c', text: 'Bill all patients cash up front' },
              { id: 'd', text: 'Stop accepting that insurance company' },
            ],
            correctOptionId: 'b',
            explanation:
              'The cheapest place to fix a revenue cycle problem is the front end. Eligibility checks before the visit prevent the denial instead of paying people to clean it up afterward.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'mchit-course-8',
        courseName: 'Capstone: HIT Practice Simulation',
        programSlug: 'health-information-technology-mchit',
        checkpoints: [
          {
            id: 'mchit-course-8-cp-1',
            courseSlug: 'mchit-course-8',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Resolve a patient record discrepancy end to end',
            onetSkills: ['Complex Problem Solving', 'Systems Evaluation'],
            scenario:
              'A patient calls upset: her bill lists a procedure she says she never had. The claim was paid, the chart includes the procedure note, but the note is signed by a provider she never saw.',
            question: 'What is the best course of action?',
            options: [
              { id: 'a', text: 'Tell her bills are always right and end the call' },
              { id: 'b', text: 'Open an investigation: verify the documentation, check for a wrong-chart entry or identity mix-up, and escalate to compliance if it does not add up' },
              { id: 'c', text: 'Quietly delete the procedure from her chart' },
              { id: 'd', text: 'Refund her and close the case without checking the record' },
            ],
            correctOptionId: 'b',
            explanation:
              'This could be a wrong-chart error, an identity mix-up, or even fraud — each needs documented investigation, not a quick fix. Deleting records or paying without checking hides the real problem.',
            level: 'job_ready',
          },
          {
            id: 'mchit-course-8-cp-2',
            courseSlug: 'mchit-course-8',
            programSlug: 'health-information-technology-mchit',
            demonstratedSkill: 'Prioritize competing tasks like a working HIT professional',
            onetSkills: ['Complex Problem Solving', 'Systems Evaluation'],
            scenario:
              'Monday morning: a possible privacy breach report is in your inbox, 30 routine charts need coding by Friday, and a coworker wants help formatting a spreadsheet.',
            question: 'What order do you work in?',
            options: [
              { id: 'a', text: 'Spreadsheet first — it is quickest' },
              { id: 'b', text: 'Escalate the possible breach immediately, then start the coding backlog, then help with the spreadsheet' },
              { id: 'c', text: 'Code all 30 charts first since they have a deadline' },
              { id: 'd', text: 'Handle everything in the order it arrived' },
            ],
            correctOptionId: 'b',
            explanation:
              'Privacy breaches have legal clocks and grow worse with delay, so they outrank routine deadlines. Coding has a Friday deadline; the spreadsheet is the lowest stakes.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },
];
