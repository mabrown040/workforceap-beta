import { getProgramBySlug } from '@/lib/content/programs';
import { getProgramCoursesForCurriculumVersion } from '@/lib/member/curriculumAssignment';

/** Original, supplied-data practice. Versioned evidence is separate from curriculum completion. */
export const IT_SUPPORT_LAB_CONTENT_VERSION = '2026-09-09.v1';
export const IT_SUPPORT_LAB_RUBRIC_VERSION = '2026-09-09.v1';
export const IT_SUPPORT_LAB_PROGRAM_SLUG = 'it-support-professional-certificate-ibm';
export const IT_SUPPORT_LAB_COURSE_SLUG = 'it-support-professional-certificate-ibm-course-10';

export interface PracticeLab {
  id: string;
  contentVersion: string;
  rubricVersion: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  objectives: readonly string[];
  prerequisites: readonly string[];
  scenario: string;
  materials: readonly { id: string; title: string; format: 'text' | 'csv'; content: string }[];
  steps: readonly { title: string; instructions: readonly string[] }[];
  deliverables: readonly { id: string; title: string; prompt: string }[];
  rubric: readonly {
    id: string;
    title: string;
    description: string;
    maxScore: 2;
    scoring: { 0: string; 1: string; 2: string };
  }[];
  troubleshooting: readonly { problem: string; approach: string }[];
  accessibilityAlternatives: readonly string[];
  sources: readonly { title: string; url: string; supports: string }[];
}

export const IT_SUPPORT_LAB_SCOPE = Object.freeze({
  title: 'IT support starter labs',
  status: 'starter-practice' as const,
  summary: 'Four original, supplied-data activities for practicing support decisions and preparing work for human feedback. Instructional review and learner time validation are still pending.',
  estimateNote: 'Allow about 5 hours across these four activities, including reading, writing, checking, and revision. These are planning estimates, not measured attendance. They do not supply the full 58-hour lab outline, mark a course complete, or award a credential.',
  remainingWork: Object.freeze([
    'An instructional owner still needs to review these briefs, rubrics, and accessible routes and validate the time estimates with learners.',
    'The rest of the 58-hour outline still needs sequenced instruction, supervised practical work, and an assessment plan. The 5-hour estimate is not verified coverage of that outline.',
    'Written evidence can receive feedback. It does not establish independent performance on real equipment or external certification readiness.',
  ]),
});

const ACCESSIBLE = [
  'All required evidence is supplied as text. Use a phone, keyboard, screen reader, or dictation; no Windows computer, paid software, screenshot, download, or administrator access is required.',
  'A numbered text list can replace any table or diagram. Identify each device or row by its label and describe relationships in words.',
  'Work in short sessions and save between sections. There is no timed test; the planning estimate is not a deadline.',
] as const;
const PREREQUISITE = 'Be able to read a short support ticket and write a response. Review your assigned technical support course if terms are unfamiliar; completion is not asserted or awarded here.';
const SOURCE_DATE = 'Technical reference checked 2026-09-09; scenarios, policies, logs, and rubrics below are original simulations, not provider course materials.';

function criterion(id: string, title: string, description: string, partial: string, complete: string): PracticeLab['rubric'][number] {
  return { id, title, description, maxScore: 2, scoring: {
    0: 'Missing, contradicted by the supplied evidence, or proposes action outside the stated permission.',
    1: partial,
    2: complete,
  } };
}

const LABS: readonly PracticeLab[] = [
  {
    id: 'ticket-triage', contentVersion: IT_SUPPORT_LAB_CONTENT_VERSION, rubricVersion: IT_SUPPORT_LAB_RUBRIC_VERSION,
    title: 'Triage a slow workstation without guessing',
    summary: 'Turn a vague complaint into a defensible support ticket, compare evidence, and propose a reversible next step.',
    estimatedMinutes: 60,
    objectives: [
      'Separate a user report, a measured observation, and a proposed cause.',
      'Prioritize support using impact and urgency from the ticket.',
      'Write an authorized next action and a test that could show it did not help.',
    ],
    prerequisites: [PREREQUISITE, 'Use the supplied Windows 11 snapshots only. Do not clean up or change your own device to complete this activity.'],
    scenario: 'You support the fictional Cedar Learning Center. Reception reports a slow intake workstation before an afternoon event. You have read-only evidence and permission to draft a plan, not to delete files. Build a ticket another technician could safely continue.',
    materials: [
      { id: 'ticket', title: 'Ticket CLC-104: reception workstation', format: 'text', content: `All people, devices, and events in this brief are fictional.
09:00 — Sam, reception: "The intake app takes ages to open and said it could not save an export. It worked yesterday. Can you wipe some old stuff?"
Device: CLC-REC-01, Windows 11, 256 GB system drive.
Impact: one workstation; two staff share it. A second reception workstation can handle intake.
Urgency: a 14:00 event needs an export; no current service-wide outage.
Missing information: exact error text, when the problem began, whether a retry saved, recent changes, backup status.
Fictional support policy: record evidence before changes; do not collect client records. Personal folders, Recycle Bin, and rollback files require an owner decision. No deletion, restart, or software removal is authorized by this ticket. Offer the spare workstation while an authorized technician reviews.` },
      { id: 'snapshots', title: 'Two supplied device snapshots', format: 'csv', content: `snapshot,system_drive_free_gb,cpu_percent,memory_percent,intake_launch_seconds,export_result
day_before_16:00,22,12,61,8,success
today_09:05,0.8,15,64,43,failed_insufficient_space
today_09:10,0.8,9,63,39,failed_insufficient_space` },
      { id: 'storage', title: 'Read-only storage inventory and help card', format: 'text', content: `09:12 storage categories, supplied example:
System and applications: 174 GB
User work folders: 41.2 GB
Temporary files category: 32 GB
Recycle Bin: 8 GB
Free space: 0.8 GB
Total: 256 GB

The category labels do not establish which files can be removed. A large temporary-files category is a lead, not permission to delete all of it.
Reading help: CPU is processor activity; memory is working memory; drive free space is storage remaining for files. These snapshots are brief observations, not a complete hardware diagnosis. Windows provides Storage/Cleanup recommendations to inspect candidate categories before a user chooses what to remove.
Hypothesis log template: observation and material/time | possible explanation | evidence against or missing | safest next check.` },
      { id: 'follow-up', title: 'Later simulated follow-up for your verification plan', format: 'text', content: `10:00 — An authorized technician reports reviewing temporary-file categories with the owner and removing 12 GB of confirmed disposable files. This is supplied scenario evidence; you did not perform the action.
10:05 — Free space 12.8 GB; export succeeds; launch time 40 seconds.
10:15 — Staff confirms the export contains the expected columns, but says opening the app still feels slow.
What remains unproven: why space filled, whether startup slowness shares the same cause, and whether the problem will recur.` },
    ],
    steps: [
      { title: 'Define the support problem · about 10 minutes', instructions: ['Read CLC-104 and write a short ticket summary with affected device, people, impact, urgency, and workaround.', 'List four questions that would clarify the issue without requesting passwords or private client files. Explain why “wipe some old stuff” is not enough authorization.'] },
      { title: 'Compare observations · about 15 minutes', instructions: ['Build an evidence log with at least four cited observations using material IDs and times. Keep “Sam reports” separate from snapshot results.', 'Rank storage pressure, sustained memory pressure, and an application-specific problem as hypotheses. Give a supporting or missing observation for each. Do not infer hardware failure from one resource reading.'] },
      { title: 'Draft one controlled next action · about 10 minutes', instructions: ['Propose a read-only storage review, the permission needed for any later cleanup, and a way to protect files. State who must decide what may be removed.', 'Include a stopping condition and an escalation if cleanup is not authorized. The available spare workstation is a workaround, not a verified repair.'] },
      { title: 'Evaluate the follow-up · about 15 minutes', instructions: ['Use the later supplied follow-up to compare free space, export success, and launch time with the baseline.', 'Write two separate conclusions: what improved and what remains unresolved. Design the next test for the persistent launch delay and identify the evidence that would disprove your leading explanation.'] },
      { title: 'Explain and revise · about 10 minutes', instructions: ['Write a brief user update with the workaround, known progress, remaining uncertainty, and next owner. Avoid declaring the whole ticket fixed.', 'Check your four deliverables against the rubric. Revise any unsupported claim and record the correction in your verification note.'] },
    ],
    deliverables: [
      { id: 'intake', title: 'Structured intake', prompt: 'Record device, impact, urgency, workaround, and four clarifying questions. Distinguish missing information from facts.' },
      { id: 'evidence-log', title: 'Evidence and hypotheses', prompt: 'Cite at least four material/time observations. Compare three possible causes and identify what would weaken each explanation.' },
      { id: 'action-plan', title: 'Permission and verification plan', prompt: 'Give the proposed read-only check, permission before changes, data protection, stop/escalation condition, and before/after tests. Interpret the 10:05–10:15 follow-up without claiming you performed it.' },
      { id: 'user-update', title: 'User update and revision', prompt: 'Write a plain-language progress update and name one claim you changed after examining the evidence or rubric.' },
    ],
    rubric: [
      criterion('evidence', 'Traceable observations', 'A reviewer can locate the evidence used.', 'Includes observations but lacks times or confuses a report with a measurement.', 'Cites at least four material/time observations and separates reports, readings, and unknowns.'),
      criterion('reasoning', 'Cause and uncertainty', 'Conclusions stay within the evidence.', 'Identifies storage pressure but treats all slowness as explained.', 'Compares three hypotheses and recognizes that export recovery does not explain the persistent launch delay.'),
      criterion('safe-action', 'Permission and file protection', 'The plan respects the fictional support policy.', 'Requests permission but leaves protected data or stopping conditions unclear.', 'Starts with read-only review, identifies the decision maker, protects user/rollback files, and names a stop or escalation.'),
      criterion('verification', 'Separate success tests', 'Improvement is checked against the original symptoms.', 'Checks free space or one symptom without a baseline.', 'Compares export and launch results separately, identifies unresolved work, and proposes a falsifiable next test.'),
      criterion('communication', 'Useful handoff', 'The user and next technician know what happens next.', 'Provides an update but omits the workaround, uncertainty, or owner.', 'Provides impact/urgency, clear questions, an honest update, the next owner, and a documented revision.'),
    ],
    troubleshooting: [
      { problem: 'I do not know what the resource percentages mean.', approach: 'Use the reading-help material. Compare the same field across time; you do not need to select a universal “healthy” percentage or invent one.' },
      { problem: 'The cleanup helped one symptom but not the other.', approach: 'Split the findings. A partial improvement is useful evidence; keep the launch delay open and ask for a controlled comparison with the spare workstation.' },
    ],
    accessibilityAlternatives: ACCESSIBLE,
    sources: [{ title: 'Microsoft: Free up drive space in Windows', url: 'https://support.microsoft.com/en-us/windows/experience/storage-filemanagement/free-up-drive-space-in-windows', supports: `Storage review and cleanup categories; deleting prior Windows rollback files has consequences. ${SOURCE_DATE}` }],
  },
  {
    id: 'network-diagnosis', contentVersion: IT_SUPPORT_LAB_CONTENT_VERSION, rubricVersion: IT_SUPPORT_LAB_RUBRIC_VERSION,
    title: 'Find the boundary of a network problem',
    summary: 'Read supplied configuration and test results to distinguish reachability, name resolution, and application access.',
    estimatedMinutes: 75,
    objectives: [
      'Describe the roles of the client, gateway, DNS resolver, and application server.',
      'Choose tests that separate competing explanations rather than repeatedly retrying the same action.',
      'Propose one authorized configuration correction with rollback and user-level verification.',
    ],
    prerequisites: [PREREQUISITE, 'Review the networking course or use the supplied reading key for IP address, gateway, and DNS. Read the provided outputs; do not run commands against a real network.'],
    scenario: 'At fictional Cedar Learning Center, one laptop cannot open the internal inventory site while another can. Diagnose what the supplied evidence supports and write the smallest justified change request. All addresses are examples within a made-up lab, not systems to contact.',
    materials: [
      { id: 'network-ticket', title: 'Ticket CLC-118 and approved configuration', format: 'text', content: `11:00 — CLC-LAP-07 cannot open inventory.cedar.example. CLC-LAP-08 can open the same site.
Both are on the center's staff network. No site-wide incident is reported.
Fictional approved configuration: subnet mask 255.255.255.0; gateway 10.24.8.1; DNS resolver 10.24.8.10; IP addressing from DHCP. No public DNS substitution is approved for the internal site.
Permission: read supplied results and draft a change request. The network owner must approve any configuration change; preserve the original configuration and an authorized way to reverse it.
Reading key: a device has an IP address; the gateway forwards traffic beyond its local network; DNS looks up a name's address. A successful ICMP ping establishes a limited reachability result, not that a website, login, or business transaction works.` },
      { id: 'configuration', title: 'Selected ipconfig /all fields, transcribed for this lab', format: 'text', content: `Device CLC-LAP-07, 11:02
IPv4 Address: 10.24.8.47
Subnet Mask: 255.255.255.0
Default Gateway: 10.24.8.1
DHCP Enabled: Yes
DNS Servers: 10.24.8.99

Device CLC-LAP-08, 11:03
IPv4 Address: 10.24.8.48
Subnet Mask: 255.255.255.0
Default Gateway: 10.24.8.1
DHCP Enabled: Yes
DNS Servers: 10.24.8.10

These are selected fields, not full command output. DHCP enabled for addressing does not establish how the DNS setting was chosen.` },
      { id: 'test-results', title: 'Supplied diagnostic results', format: 'csv', content: `id,device,time,test,result
T1,CLC-LAP-07,11:05,ping 10.24.8.1,4 replies of 4
T2,CLC-LAP-07,11:06,ping 10.24.8.20,4 replies of 4
T3,CLC-LAP-07,11:07,nslookup inventory.cedar.example,configured server 10.24.8.99 timed out
T4,CLC-LAP-07,11:08,nslookup inventory.cedar.example 10.24.8.10,answer 10.24.8.20
T5,CLC-LAP-08,11:09,open inventory.cedar.example,sign-in page displayed
T6,CLC-LAP-07,11:10,open inventory.cedar.example,name resolution error` },
      { id: 'network-follow-up', title: 'Simulated approved-change follow-up', format: 'text', content: `After the network owner approved the request, an authorized technician corrected CLC-LAP-07 to the approved DNS configuration. You did not perform this change.
11:30: selected ipconfig /all field now shows DNS Servers: 10.24.8.10.
11:31: default nslookup for inventory.cedar.example answers 10.24.8.20.
11:32: the site displays its sign-in page.
11:33: the user signs in through their own account; the inventory list opens.
11:34: exporting the list reports a permission error. No export role information is supplied.
Additional check requested by the network owner: confirm the approved configuration persists after the next normal reconnect, without interrupting current work.` },
    ],
    steps: [
      { title: 'Map the path · about 10 minutes', instructions: ['Describe CLC-LAP-07, its gateway, both resolver addresses, and the application address using a diagram or labeled text list.', 'Compare the two client configurations and identify the deviation from the fictional approved configuration. Keep “different” separate from “proven cause.”'] },
      { title: 'Build a discriminating test matrix · about 15 minutes', instructions: ['For T1–T6, record what the test examines, the result, and one thing it cannot establish.', 'Explain why querying a named resolver in T4 adds evidence beyond pinging the application address. The second nslookup argument selects the resolver; it does not change the saved adapter setting.'] },
      { title: 'Choose and challenge a hypothesis · about 20 minutes', instructions: ['Compare a local-link outage, a resolver/configuration problem, and an application outage. Cite both supporting and weakening test IDs.', 'State the strongest supported finding, one unknown about how it happened, and a further observation that could change your conclusion. Do not claim that 10.24.8.99 is malicious or that every failed ping proves a device is down.'] },
      { title: 'Write a controlled change request · about 15 minutes', instructions: ['Request that the network owner validate and correct the DNS configuration to the documented setting. Include the original setting, approval, interruption risk, authorized rollback, and stopping condition.', 'Plan separate tests for configuration, name resolution, opening the site, and the user’s intended task. Do not recommend disabling security controls or bypassing the internal name with an IP-based website URL.'] },
      { title: 'Read the follow-up and hand off · about 15 minutes', instructions: ['Interpret each follow-up result. Explain why the export permission problem remains a separate unresolved issue after name resolution recovers.', 'Write the next owner a concise handoff with relevant results and missing access information. Never ask the user for a password; the account owner performs the sign-in test. Check and revise against the rubric.'] },
    ],
    deliverables: [
      { id: 'network-map', title: 'Network roles and configuration comparison', prompt: 'Describe the client, gateway, resolver, and application. Identify the configuration deviation using the supplied evidence.' },
      { id: 'test-matrix', title: 'Test matrix and diagnosis', prompt: 'Explain T1–T6, each limitation, and three competing hypotheses. State a supported finding and an uncertainty with source IDs.' },
      { id: 'change-plan', title: 'Approved change and rollback request', prompt: 'Record the proposed correction, original setting, approving owner, service risk, rollback, stop condition, and four layers of verification.' },
      { id: 'verification-note', title: 'Post-change interpretation', prompt: 'Use the supplied follow-up to separate recovered network access from unresolved export access. Name the next owner, persistence check, and a revision to your reasoning.' },
    ],
    rubric: [
      criterion('evidence', 'Test traceability', 'The diagnosis is tied to supplied observations.', 'Mentions results without test IDs or omits the contrasting client.', 'Uses T1–T6 and both configurations, distinguishing the default resolver from the explicitly selected resolver.'),
      criterion('reasoning', 'Layered diagnosis', 'Network and application claims are appropriately limited.', 'Identifies DNS but treats ping or a sign-in page as proof of full service.', 'Compares three hypotheses, identifies the resolver deviation, and states what reachability and name resolution cannot prove.'),
      criterion('safe-action', 'Authorized configuration change', 'Changes are bounded and reversible by an authorized owner.', 'Names the intended resolver but lacks approval, original state, or rollback.', 'Specifies approved correction, original state, permission, interruption risk, rollback, and stop condition without bypassing controls.'),
      criterion('verification', 'Actual task verification', 'Post-change tests address the requested service.', 'Checks name lookup only or ignores the export failure.', 'Checks configuration, lookup, site, and user task separately; retains export failure and the later persistence check as open work.'),
      criterion('communication', 'Precise escalation', 'A successor can continue without repeating or guessing.', 'Gives a vague status or asks for unnecessary account secrets.', 'Provides a short evidence-based handoff, remaining access question, next owner, and a documented revision without collecting passwords.'),
    ],
    troubleshooting: [
      { problem: 'I have never used these commands.', approach: 'No terminal is needed. Read the selected fields and the test CSV. ipconfig describes adapter configuration, nslookup asks a DNS resolver, and ping tests an ICMP response.' },
      { problem: 'The evidence seems to support more than one cause.', approach: 'That is acceptable. State a ranked hypothesis and a distinguishing next test. Your rubric rewards supported uncertainty, not an invented definite root cause.' },
    ],
    accessibilityAlternatives: ACCESSIBLE,
    sources: [
      { title: 'Microsoft Learn: ipconfig', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig', supports: `Adapter configuration fields and read-only /all output. ${SOURCE_DATE}` },
      { title: 'Microsoft Learn: nslookup', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup', supports: 'Querying a default or explicitly selected DNS server and interpreting timeout results.' },
      { title: 'Microsoft Learn: ping', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping', supports: 'ICMP reachability and comparison of name versus address tests; an echo response is not an application transaction.' },
      { title: 'RFC 2606: Reserved Top Level DNS Names', url: 'https://www.rfc-editor.org/rfc/rfc2606.html', supports: 'The .example name used in these original materials is reserved for documentation examples.' },
    ],
  },
  {
    id: 'safe-recovery', contentVersion: IT_SUPPORT_LAB_CONTENT_VERSION, rubricVersion: IT_SUPPORT_LAB_RUBRIC_VERSION,
    title: 'Recover the right file and prove what you checked',
    summary: 'Select a backup, reconstruct a tiny supplied inventory, and distinguish byte integrity from operational correctness.',
    estimatedMinutes: 75,
    objectives: [
      'Choose a recovery point using the incident timeline and expected data.',
      'Preserve the damaged version and restore to a separate destination for review.',
      'Check identifiers, row counts, contents, and optional hashes without overstating what a checksum proves.',
    ],
    prerequisites: [PREREQUISITE, 'Be able to compare lines of a text file. CSV here means a header followed by comma-separated values; a spreadsheet is optional.'],
    scenario: 'A fictional equipment inventory was overwritten. A later backup exists, but newer does not necessarily mean usable. Reconstruct the requested version from supplied data and prepare a safe recovery record. Work only with these five fictional assets.',
    materials: [
      { id: 'recovery-ticket', title: 'Ticket CLC-126 and recovery policy', format: 'text', content: `10:10 — Equipment lead: "At 10:00 I saved over inventory.csv while testing an export. It now has only two rows. We need the five-asset list for the 13:00 equipment check."
Known changes: CLC-105 was added at 09:00. CLC-102 changed from ready to loaned at 09:30.
Backup index: 08:00 has four assets; 09:45 has five; 10:05 has two. All backup jobs reported success.
Fictional policy: preserve the current file, choose and preview a recovery version, restore to a separate recovery folder, validate with the equipment lead, then obtain permission before replacing the working file. No changes to real files are needed here.
Assumption to verify in a real incident: backup availability and access are not guaranteed by a ticket; here the listed versions are supplied and readable.` },
      { id: 'backup-0945', title: 'inventory.csv — supplied 09:45 recovery candidate', format: 'csv', content: `asset_id,room,status
CLC-101,A,ready
CLC-102,A,loaned
CLC-103,B,ready
CLC-104,B,lab
CLC-105,C,needs_repair
` },
      { id: 'current-1000', title: 'inventory.csv — damaged working copy at 10:00', format: 'csv', content: `asset_id,room,status
CLC-101,A,ready
CLC-102,A,ready
` },
      { id: 'recovery-integrity', title: 'Integrity card and independent acceptance checks', format: 'text', content: `Expected 09:45 SHA-256 for the supplied CSV bytes (UTF-8, no byte-order mark, LF line endings, one final newline):
de74a8acec06980d1ea7a0ae0843a0667a33fa8360dbe50780dc52512f3937f7

Optional local-only check if PowerShell is already available and you created a copy of this synthetic CSV:
Get-FileHash -LiteralPath ./inventory-recovery.csv -Algorithm SHA256
Read-only: this computes a checksum of your named local file. Never point the exercise at real work files. The text-only route is equally acceptable: compare each row and record that byte-level hashing was not performed.

Acceptance facts supplied by the fictional equipment lead: five unique IDs CLC-101 through CLC-105; CLC-102 loaned; CLC-105 in room C and needs_repair; all three columns present. The 10:05 backup is a successful copy of the already damaged file.
Integrity compares bytes with a reference. It does not establish whether that reference is current, approved, malware-free, or correct for the business task.` },
    ],
    steps: [
      { title: 'Build the incident timeline · about 10 minutes', instructions: ['List the two intended edits, overwrite time, report time, and three backup times.', 'Choose a candidate and explain why the other two versions fail the request. Do not rely on the word “success” in a backup log as proof of usable contents.'] },
      { title: 'Compare before copying · about 15 minutes', instructions: ['Compare the two supplied CSV files by asset ID. List missing records and the changed status; a row count alone will miss a wrong value.', 'Record what must be preserved before a real recovery and choose separate names for the damaged copy and recovery candidate. Use synthetic filenames only.'] },
      { title: 'Produce the recovery artifact · about 20 minutes', instructions: ['Copy the chosen candidate into your reconstructed-data response, or reproduce its five records as labeled text. Keep the header and each value. This is your practice recovery artifact.', 'Check it against the acceptance facts row by row. Optionally create a local synthetic file and use the read-only checksum command; if you do, record encoding and line-ending assumptions. Never claim you ran a tool when you used the text-only route.'] },
      { title: 'Design release and fallback · about 15 minutes', instructions: ['Draft a plan to preview in a separate recovery location, obtain the equipment lead’s acceptance, and request permission before replacing the working version.', 'Specify what would stop the release, how you would retain both copies, and who would decide the next step if there were no usable backup. Do not manufacture missing asset facts.'] },
      { title: 'Document verification and revise · about 15 minutes', instructions: ['Record each acceptance check with the observed result from your reconstructed artifact. Separate a checksum comparison from a content/owner check.', 'Explain what your exercise established and what a real recovery would still require. Apply the rubric and name one correction or limitation in your final note.'] },
    ],
    deliverables: [
      { id: 'recovery-choice', title: 'Timeline and recovery-point decision', prompt: 'Explain the 08:00, 09:45, and 10:05 choices against the incident timeline and intended edits. Cite the supplied materials.' },
      { id: 'reconstructed-data', title: 'Your reconstructed inventory', prompt: 'Provide the full header and five CSV rows, or equivalent labeled records. Identify differences from the damaged working copy. Use only fictional supplied assets.' },
      { id: 'restore-plan', title: 'Preservation and release plan', prompt: 'Describe separate destinations, preview, owner acceptance, replacement permission, a stop condition, and fallback when a usable backup is absent.' },
      { id: 'validation-note', title: 'Validation record and limits', prompt: 'List row-count, unique-ID, field/value, and intended-change checks with results. State whether hashing was performed; distinguish integrity from correctness. Record a revision or uncertainty.' },
    ],
    rubric: [
      criterion('evidence', 'Recovery-point evidence', 'The choice follows the timeline and actual contents.', 'Selects a plausible version but ignores a required edit or the damaged newer backup.', 'Selects the 09:45 candidate and explains both rejected versions using the two intended edits and overwrite time.'),
      criterion('reasoning', 'Integrity versus correctness', 'The learner knows what each check establishes.', 'Mentions a hash or a row count as if it alone proves recovery.', 'Separates byte comparison, expected records/values, and owner acceptance; does not claim the latest successful backup is automatically usable.'),
      criterion('safe-action', 'Preservation and permission', 'Recovery does not destroy the only remaining evidence.', 'Mentions a backup but leaves destination, permission, or fallback unclear.', 'Preserves the damaged copy, uses a separate destination, requires acceptance/permission before replacement, and defines stop and fallback conditions.'),
      criterion('verification', 'Reconstructed artifact', 'The supplied inventory is accurately rebuilt and checked.', 'Provides most data but omits a row/value or records only a total.', 'Includes all five unique assets with exact fields and verifies the loaned status and new repair asset against the acceptance facts.'),
      criterion('communication', 'Honest recovery record', 'The report accurately describes the work performed.', 'Gives results without distinguishing text comparison from tool execution.', 'Documents the chosen route, observed checks, remaining real-world requirements, and a revision without inventing execution or approval.'),
    ],
    troubleshooting: [
      { problem: 'My optional checksum differs although the text looks the same.', approach: 'Check the final newline, LF versus CRLF, encoding, and spaces. Report the mismatch; do not rewrite the reference to make it pass. The supplied row-by-row text route does not require a checksum.' },
      { problem: 'I cannot create files or install a spreadsheet.', approach: 'Paste the five labeled records into the response. Describe your comparison and explicitly state that no local file restoration or hash execution was performed.' },
    ],
    accessibilityAlternatives: ACCESSIBLE,
    sources: [
      { title: 'Microsoft: Backup and restore with File History', url: 'https://support.microsoft.com/en-us/windows/experience/backup-recovery/backup-and-restore-with-file-history', supports: `Previewing versions and restoring to a separate location to avoid overwriting a current version. ${SOURCE_DATE}` },
      { title: 'Microsoft Learn: Get-FileHash', url: 'https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-filehash?view=powershell-7.5', supports: 'The read-only file hash command, SHA-256, and comparison of file contents. This simulation separately checks operational correctness.' },
    ],
  },
  {
    id: 'support-handoff', contentVersion: IT_SUPPORT_LAB_CONTENT_VERSION, rubricVersion: IT_SUPPORT_LAB_RUBRIC_VERSION,
    title: 'Turn a printing incident into a useful support record',
    summary: 'Work through a support case, correct a misleading draft, and create a reusable article and escalation packet.',
    estimatedMinutes: 90,
    objectives: [
      'Narrow an incident using affected scope, selected destination, and a controlled test.',
      'Create instructions another learner can follow without sharing passwords or disrupting other users.',
      'Revise a ticket so observed recovery, unresolved causes, and remaining ownership are distinct.',
    ],
    prerequisites: [PREREQUISITE, 'The earlier labs are recommended practice for evidence, permission, and verification. This case includes its own materials and can also be completed independently.'],
    scenario: 'Fictional Cedar Learning Center needs an event sign-in sheet printed. A rushed ticket claims that all printers are down. Use the supplied case to create a precise incident record, a small knowledge article, and a handoff another technician can act on.',
    materials: [
      { id: 'print-ticket', title: 'Ticket CLC-133 and service policy', format: 'text', content: `09:40 — Jo on CLC-LAP-12: "Nothing prints. The room-one printer must be broken. I need a blank event sign-in sheet in 30 minutes."
Scope known initially: one reported laptop. Seven other staff may be using the shared printer.
Fictional printer names: CLC-ROOM1 is the current approved printer; CLC-ROOM1-OLD is retired and must not be selected for new work.
Permission: the user may choose an already installed approved printer and request one non-sensitive test page. Shared-queue changes, job cancellation, service restart, and driver changes need the relevant owner’s approval.
Privacy: the test page contains only "CLC test page" and a time. Do not upload a filled sign-in sheet or anyone’s personal details.
Workaround: reception can provide a blank paper sheet if printing cannot be verified in time.` },
      { id: 'print-observations', title: 'Read-only case observations', format: 'csv', content: `id,time,observation
P1,09:42,CLC-LAP-12 application selected CLC-ROOM1-OLD
P2,09:43,CLC-ROOM1-OLD queue has Jo job J301 pending and reports offline
P3,09:44,CLC-ROOM1 queue reports ready with another staff job J302 active
P4,09:45,Reception on CLC-LAP-02 received a blank test page from CLC-ROOM1
P5,09:46,CLC-LAP-12 lists both printer names as installed
P6,09:47,Jo recalls a laptop setup change yesterday but has no change record` },
      { id: 'print-follow-up', title: 'Controlled-test follow-up supplied for analysis', format: 'text', content: `09:50 — Jo selects the already installed CLC-ROOM1 destination and requests one blank test page with support guidance.
09:51 — Jo confirms that exactly one readable page arrived at the intended room-one printer.
09:53 — A blank event sign-in sheet also prints successfully to CLC-ROOM1.
09:54 — Old job J301 remains pending in CLC-ROOM1-OLD. No one has approved canceling it or removing the retired queue.
09:55 — Endpoint support requests the selected destination, relevant queue names, job ID/owner, and confirmation of output before reviewing the stale queue.
Not established: why the application selected the retired queue, whether the setup change caused it, or what every other staff member experienced.` },
      { id: 'draft-to-revise', title: 'A rushed draft that needs correction', format: 'text', content: `DRAFT — not an approved solution:
"All printers were down. I fixed the server by restarting everything and clearing all jobs. It was caused by yesterday’s setup. Printing always works now. Tell anyone with a problem to reinstall the driver. Closed."

Knowledge article template:
Title and symptoms:
Applies when / does not apply when:
Before you start and permission:
Numbered checks and expected observations:
One test and confirmation:
Stop and get help when:
Information to include in a support request:

Handoff template:
Requested outcome | affected scope | material/time evidence | actions actually observed | remaining work | proposed next owner | decision requested | what would establish closure.` },
    ],
    steps: [
      { title: 'Rebuild the incident record · about 15 minutes', instructions: ['Read P1–P6 and classify each item as observed, reported, or still unknown. Explain how these results change the initial claim that all printers are down.', 'Give the immediate user need, deadline, affected scope, and available workaround. Avoid blaming a setup change before its record has been checked.'] },
      { title: 'Design and assess a minimal test · about 20 minutes', instructions: ['Describe a check of selected printer name and current queue status before any change. Propose one non-sensitive test to the already installed approved destination within the stated permission.', 'Use the follow-up to record the actual result. Explain why restarting the shared service or clearing everyone’s jobs is not justified by this evidence. Separate the successful print from the stale-job problem.'] },
      { title: 'Write a small knowledge article · about 20 minutes', instructions: ['Use the supplied template to write five to eight numbered instructions for this specific symptom. Include the exact example printer names, expected observations, a single test, and stop conditions.', 'Describe the control or destination by its name rather than color or screen position. Keep examples fictional. State when this article does not apply, such as the approved printer also failing for multiple users.'] },
      { title: 'Prepare the remaining-work handoff · about 20 minutes', instructions: ['Give endpoint support the requested queue/job/owner details, P1–P6 references where relevant, and output confirmation. Request review of the stale queue and original selection cause.', 'Explain how to avoid duplicate output if the old job becomes printable. Ask for an authorized decision about J301; do not claim it was canceled. Identify the evidence needed before closing that remaining task.'] },
      { title: 'Correct and test your writing · about 15 minutes', instructions: ['Rewrite the rushed draft. Identify at least four unsupported or unsafe claims and show what you replaced each with.', 'Walk through your knowledge article using only the supplied observations, as if you were a new technician. Record one ambiguity you corrected and one unresolved question. Submit the written packet for feedback; no message, job cancellation, or device change is required.'] },
    ],
    deliverables: [
      { id: 'incident-record', title: 'Evidence-based incident record', prompt: 'State impact, urgency, workaround, findings, controlled-test result, and what remains unresolved. Cite P1–P6 and follow-up times as applicable.' },
      { id: 'knowledge-article', title: 'Reusable troubleshooting article', prompt: 'Write the article using all supplied headings and five to eight numbered instructions. Include scope, permission, expected observations, accessible naming, a single test, and stop conditions.' },
      { id: 'escalation', title: 'Remaining-work handoff', prompt: 'Provide the endpoint-support packet: destination and queue names, J301 owner, observed output, duplicate-job risk, requested decision, and closure evidence. Do not invent cancellation or a proven root cause.' },
      { id: 'revision-log', title: 'Correction and walkthrough log', prompt: 'Correct at least four claims in the rushed draft. Record one ambiguity found while walking through your article and one question that still needs an owner’s answer.' },
    ],
    rubric: [
      criterion('evidence', 'Scoped incident evidence', 'The record reflects what the case actually shows.', 'Mentions the wrong queue but repeats a broad outage or setup-cause claim.', 'Uses specific observation IDs/times, narrows affected scope, and distinguishes Jo’s recollection from verified configuration evidence.'),
      criterion('reasoning', 'Proportionate diagnosis', 'The next step follows the observed boundary of failure.', 'Suggests the current printer but includes unsupported server or driver diagnosis.', 'Explains why selected destination is the immediate lead, considers contrary evidence, and leaves the original selection cause unresolved.'),
      criterion('safe-action', 'Shared-resource care', 'The plan avoids disrupting others or exposing their data.', 'Includes a test but omits permissions or treats all pending jobs as disposable.', 'Uses one non-sensitive test within permission, preserves others’ jobs, and requests authorized review of the stale queue and J301.'),
      criterion('verification', 'Observed outcome and remaining work', 'Closure follows the actual requested result.', 'Claims repair from queue status alone or loses the old-job issue.', 'Records received test/output confirmation, retains stale-job risk as open work, and specifies evidence needed to close the escalation.'),
      criterion('communication', 'Reproducible article and revision', 'The packet is usable by someone new to the case.', 'Provides general tips with weak scope, stop conditions, or revision evidence.', 'Supplies a scoped five-to-eight-step article, precise handoff, four corrected claims, and a documented walkthrough improvement.'),
    ],
    troubleshooting: [
      { problem: 'My device does not have these printer menus.', approach: 'Use the supplied observations; no printer or Windows installation is required. Describe what to inspect by its purpose and configured name.' },
      { problem: 'I want to close the ticket because the sheet printed.', approach: 'Record the verified user outcome, then retain a separate owner and decision for the pending old job. Do not convert an unresolved follow-up into a claimed completed action.' },
    ],
    accessibilityAlternatives: ACCESSIBLE,
    sources: [{ title: 'Microsoft: Troubleshooting offline printer problems in Windows', url: 'https://support.microsoft.com/en-us/windows/hardware/printer/troubleshooting-offline-printer-problems-in-windows', supports: `Inspecting printer selection, connectivity, and queues. The simulation adds an explicit shared-resource approval policy; it does not instruct learners to reset a real service. ${SOURCE_DATE}` }],
  },
];

/** Freeze published definitions so a request cannot mutate later submissions' rubric/content. */
function freezeDefinition<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDefinition(child);
    Object.freeze(value);
  }
  return value;
}
const PUBLISHED_LABS = freezeDefinition(LABS);

export function getPracticeLab(labId: string, contentVersion = IT_SUPPORT_LAB_CONTENT_VERSION): PracticeLab | undefined {
  return PUBLISHED_LABS.find((lab) => lab.id === labId && lab.contentVersion === contentVersion);
}

/** Content eligibility only. Callers must first resolve the authenticated member's stored assignment. */
export function listPracticeLabsForAssignment(args: {
  programSlug: string;
  curriculumVersion: string;
  courseSlug: string;
}): readonly PracticeLab[] {
  if (args.programSlug !== IT_SUPPORT_LAB_PROGRAM_SLUG || args.curriculumVersion !== 'legacy-v1' || args.courseSlug !== IT_SUPPORT_LAB_COURSE_SLUG) return [];
  const program = getProgramBySlug(args.programSlug);
  if (!program) return [];
  const course = getProgramCoursesForCurriculumVersion(program, args.curriculumVersion).find((candidate) => candidate.slug === args.courseSlug);
  // An explicit binding to the historical outline, never a fuzzy alias to provider instruction.
  if (!course || course.name !== 'Lab, Project, and Test Preparation' || course.estimatedHours !== 58 || course.courseraSlug || course.courseraCourseId) return [];
  return PUBLISHED_LABS;
}
