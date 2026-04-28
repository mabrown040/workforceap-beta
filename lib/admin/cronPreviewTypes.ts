export type CronPreviewRecipient = { email: string; name: string | null };

export type CronPreviewResponse = {
  cronId: string;
  cronName: string;
  recipients: CronPreviewRecipient[];
  count: number;
  truncated: boolean;
  note?: string;
};
