/** Translation keys under the `apply` namespace for each required document line item. */
export type ApplicationDocMessageKey =
  | 'docsChecklistItem1'
  | 'docsChecklistItem2'
  | 'docsChecklistItem3'
  | 'docsChecklistItem4'
  | 'docsChecklistItem5'
  | 'docsChecklistItem6';

export type ApplicationDocRequired = {
  id: string;
  messageKey: ApplicationDocMessageKey;
};

/** Documents applicants may be asked for later in the process (shown on apply step 2). */
export const APPLICATION_DOCS_REQUIRED: readonly ApplicationDocRequired[] = [
  { id: 'government-id', messageKey: 'docsChecklistItem1' },
  { id: 'ssn-or-w9', messageKey: 'docsChecklistItem2' },
  { id: 'proof-of-address', messageKey: 'docsChecklistItem3' },
  { id: 'prior-education', messageKey: 'docsChecklistItem4' },
  { id: 'dd214', messageKey: 'docsChecklistItem5' },
  { id: 'work-auth', messageKey: 'docsChecklistItem6' },
] as const;
