/**
 * Client-safe assessment question metadata. Contains only the question
 * text, choice labels, and point values — **never the answer key**.
 *
 * The answer key + scoring lives in `./answer-key.ts`, which imports
 * `server-only` and cannot be bundled into a browser-side chunk.
 *
 * AUDIT-2026-05-16 §C-B3: the previous design exported the `correct`
 * field for every question to a `'use client'` component, shipping
 * answers to every browser. Scores feed program-fit, milestones, and
 * WIOA outcomes — federally funded program, so test integrity matters.
 */

export type QuestionChoice = 'A' | 'B' | 'C' | 'D';

export interface AssessmentQuestionPublic {
  id: number;
  question: string;
  choices: { value: QuestionChoice; label: string }[];
  points: number;
}

export const ASSESSMENT_QUESTIONS_PUBLIC: AssessmentQuestionPublic[] = [
  { id: 1, question: '"itinerary" means', choices: [{ value: 'A', label: 'A planned travel route or schedule' }, { value: 'B', label: 'A cruise ship' }, { value: 'C', label: 'A place to check flight status' }, { value: 'D', label: 'A travel booking confirmation' }], points: 3 },
  { id: 2, question: '"verify" means', choices: [{ value: 'A', label: 'To delete' }, { value: 'B', label: 'To ignore' }, { value: 'C', label: 'To confirm something' }, { value: 'D', label: 'To postpone' }], points: 3 },
  { id: 3, question: '"evoke" means', choices: [{ value: 'A', label: 'To avoid' }, { value: 'B', label: 'To erase' }, { value: 'C', label: 'Call forth' }, { value: 'D', label: 'To delay' }], points: 3 },
  { id: 4, question: '"instill" means', choices: [{ value: 'A', label: 'Establish' }, { value: 'B', label: 'Remove' }, { value: 'C', label: 'Question' }, { value: 'D', label: 'Forget' }], points: 3 },
  { id: 5, question: 'Which sentence uses "sufficient" correctly?', choices: [{ value: 'A', label: 'The documents needed were sufficient for enrollment' }, { value: 'B', label: 'She sufficient went home' }, { value: 'C', label: 'Sufficient the meeting' }, { value: 'D', label: 'He was sufficient tired' }], points: 2 },
  { id: 6, question: 'The ___ guidelines allow you to be creative', choices: [{ value: 'A', label: 'Strict' }, { value: 'B', label: 'Rigid' }, { value: 'C', label: 'Fixed' }, { value: 'D', label: 'Flexible' }], points: 3 },
  { id: 7, question: 'The work comes in ___. At times completely random', choices: [{ value: 'A', label: 'Batches' }, { value: 'B', label: 'Steadily' }, { value: 'C', label: 'Regularly' }, { value: 'D', label: 'Sporadically' }], points: 3 },
  { id: 8, question: 'Opposite of "numerous"', choices: [{ value: 'A', label: 'Lacking' }, { value: 'B', label: 'Many' }, { value: 'C', label: 'Plenty' }, { value: 'D', label: 'Abundant' }], points: 3 },
  { id: 9, question: 'Victoria ___ the whole experience (planning to execution)', choices: [{ value: 'A', label: 'Ignored' }, { value: 'B', label: 'Choreographed' }, { value: 'C', label: 'Forgot' }, { value: 'D', label: 'Abandoned' }], points: 3 },
  { id: 10, question: 'Teacher ___ students to study', choices: [{ value: 'A', label: 'Discouraged' }, { value: 'B', label: 'Encouraged' }, { value: 'C', label: 'Prevented' }, { value: 'D', label: 'Blocked' }], points: 3 },
  { id: 11, question: 'Texas students use email to', choices: [{ value: 'A', label: 'Play games' }, { value: 'B', label: 'Communicate with pen pals in another country' }, { value: 'C', label: 'Watch videos' }, { value: 'D', label: 'Shop online' }], points: 3 },
  { id: 12, question: 'Computer monitor is', choices: [{ value: 'A', label: 'Software' }, { value: 'B', label: 'An application' }, { value: 'C', label: 'A program' }, { value: 'D', label: 'Hardware' }], points: 2 },
  { id: 13, question: 'Best for financial calculations', choices: [{ value: 'A', label: 'Microsoft Excel' }, { value: 'B', label: 'Microsoft Word' }, { value: 'C', label: 'Notepad' }, { value: 'D', label: 'Paint' }], points: 3 },
  { id: 14, question: 'Indicates location on monitor', choices: [{ value: 'A', label: 'A cursor' }, { value: 'B', label: 'A font' }, { value: 'C', label: 'A margin' }, { value: 'D', label: 'A header' }], points: 2 },
  { id: 15, question: 'Hand-held device to move cursor', choices: [{ value: 'A', label: 'A keyboard' }, { value: 'B', label: 'A mouse' }, { value: 'C', label: 'A monitor' }, { value: 'D', label: 'A printer' }], points: 2 },
  { id: 16, question: 'To recall a saved document', choices: [{ value: 'A', label: 'Save' }, { value: 'B', label: 'Close' }, { value: 'C', label: 'Open' }, { value: 'D', label: 'Delete' }], points: 2 },
  { id: 17, question: 'Move cursor to next line quickest', choices: [{ value: 'A', label: 'Space bar' }, { value: 'B', label: 'Enter/Return' }, { value: 'C', label: 'Tab' }, { value: 'D', label: 'Shift' }], points: 2 },
  { id: 18, question: 'Best for employee database', choices: [{ value: 'A', label: 'Microsoft Word' }, { value: 'B', label: 'PowerPoint' }, { value: 'C', label: 'Microsoft Access' }, { value: 'D', label: 'Paint' }], points: 3 },
  { id: 19, question: 'To print first 2 of 10 pages', choices: [{ value: 'A', label: 'Print All' }, { value: 'B', label: 'From___To___' }, { value: 'C', label: 'Current page only' }, { value: 'D', label: 'Selection' }], points: 3 },
  { id: 20, question: 'Create a presentation', choices: [{ value: 'A', label: 'Excel' }, { value: 'B', label: 'Word' }, { value: 'C', label: 'PowerPoint' }, { value: 'D', label: 'Access' }], points: 3 },
  { id: 21, question: 'Downloading means', choices: [{ value: 'A', label: 'Sending information to a computer' }, { value: 'B', label: 'Deleting files' }, { value: 'C', label: 'Receiving information from a computer or internet' }, { value: 'D', label: 'Printing documents' }], points: 2 },
  { id: 22, question: 'Physical components of a computer', choices: [{ value: 'A', label: 'Software' }, { value: 'B', label: 'Applications' }, { value: 'C', label: 'Programs' }, { value: 'D', label: 'Hardware' }], points: 2 },
  { id: 23, question: 'Word alone cannot accomplish', choices: [{ value: 'A', label: 'Writing a letter' }, { value: 'B', label: 'Calculating the expenditure of the candy sale' }, { value: 'C', label: 'Creating a resume' }, { value: 'D', label: 'Formatting text' }], points: 3 },
  { id: 24, question: 'Desktop publishing is sophisticated form of', choices: [{ value: 'A', label: 'Spreadsheets' }, { value: 'B', label: 'Databases' }, { value: 'C', label: 'Word Processing' }, { value: 'D', label: 'Programming' }], points: 2 },
  { id: 25, question: 'Area with W=11, L=30 (sq ft)', choices: [{ value: 'A', label: '41' }, { value: 'B', label: '120' }, { value: 'C', label: '300' }, { value: 'D', label: '330' }], points: 3 },
  { id: 26, question: 'Which is incorrect?', choices: [{ value: 'A', label: 'A foot has 12 inches' }, { value: 'B', label: 'A yard has 3 feet' }, { value: 'C', label: 'A pound has 16 ounces' }, { value: 'D', label: 'A gallon has 64oz' }], points: 2 },
  { id: 27, question: '22 × 0.5 =', choices: [{ value: 'A', label: '10' }, { value: 'B', label: '11' }, { value: 'C', label: '22' }, { value: 'D', label: '44' }], points: 3 },
  { id: 28, question: 'If 0.25/X = 0.5, then X =', choices: [{ value: 'A', label: '0.25' }, { value: 'B', label: '0.125' }, { value: 'C', label: '0.5' }, { value: 'D', label: '1' }], points: 3 },
  { id: 29, question: 'Gas price $2→$4, percent increase', choices: [{ value: 'A', label: '50%' }, { value: 'B', label: '75%' }, { value: 'C', label: '200%' }, { value: 'D', label: '100%' }], points: 4 },
  { id: 30, question: '$10 bill, pay with quarter change', choices: [{ value: 'A', label: '$9.75' }, { value: 'B', label: '$10.25' }, { value: 'C', label: '$9.25' }, { value: 'D', label: '$10.75' }], points: 2 },
  { id: 31, question: '2400 ÷ 12 + 52 - 2 =', choices: [{ value: 'A', label: '200' }, { value: 'B', label: '248' }, { value: 'C', label: '250' }, { value: 'D', label: '252' }], points: 3 },
  { id: 32, question: '5 - 3.5 gallons =', choices: [{ value: 'A', label: '1' }, { value: 'B', label: '1½' }, { value: 'C', label: '2' }, { value: 'D', label: '2½' }], points: 3 },
  { id: 33, question: '3(3) + 4(4) =', choices: [{ value: 'A', label: '25' }, { value: 'B', label: '12' }, { value: 'C', label: '49' }, { value: 'D', label: '7' }], points: 4 },
  { id: 34, question: '500 mi ÷ 25 mpg, gas $4/gal =', choices: [{ value: 'A', label: '$80' }, { value: 'B', label: '$100' }, { value: 'C', label: '$60' }, { value: 'D', label: '$50' }], points: 4 },
  { id: 35, question: '$1000 × 10% × 2 years interest, total =', choices: [{ value: 'A', label: '$1000' }, { value: 'B', label: '$200' }, { value: 'C', label: '$1100' }, { value: 'D', label: '$1200' }], points: 4 },
];

export const TOTAL_POINTS_PUBLIC = ASSESSMENT_QUESTIONS_PUBLIC.reduce((sum, q) => sum + q.points, 0);
