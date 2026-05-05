const BLOG_PUBLISHED_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'numeric',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatPublishedDate(value: Date | string): string {
  return BLOG_PUBLISHED_DATE_FORMATTER.format(new Date(value));
}
