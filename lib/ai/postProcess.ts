export function postProcessAIOutput(text: string, options?: { stripMarkdown?: boolean }): string {
  if (!text) return text;
  
  let processed = text.trim();
  
  // 1. Strip leading/trailing quotes (single, double, smart quotes)
  processed = processed.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '');
  
  // 2. Spell-check / typo fixes
  const typos: Record<string, string> = {
    'exceling': 'excelling',
    'exceled': 'excelled',
    'teh': 'the',
    'recieve': 'receive',
    'accomodate': 'accommodate'
  };
  
  for (const [typo, fix] of Object.entries(typos)) {
    // Only replace whole words, case-insensitive
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    processed = processed.replace(regex, (match) => {
      // Preserve original capitalization
      if (match === match.toUpperCase()) return fix.toUpperCase();
      if (match[0] === match[0].toUpperCase()) return fix.charAt(0).toUpperCase() + fix.slice(1);
      return fix;
    });
  }

  // 3. Strip markdown if requested
  if (options?.stripMarkdown) {
    // Remove headers
    processed = processed.replace(/^#{1,6}\s+(.*)/gm, '$1');
    // Remove bold/italic
    processed = processed.replace(/(\*\*|__)(.*?)\1/g, '$2');
    processed = processed.replace(/(\*|_)(.*?)\1/g, '$2');
    // Remove links
    processed = processed.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Replace list markers with standard plain text dashes or bullets
    // Just keep the dashes but remove the bolding, wait, we don't need to remove list markers completely.
    // The instructions say "rendered markdown or stripped to plain text". 
    // If we strip markdown, we should remove the `#` but keep the text.
  }

  return processed.trim();
}
