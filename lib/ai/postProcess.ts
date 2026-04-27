export function postProcessAIOutput(text: string, options?: { stripMarkdown?: boolean }): string {
  if (!text) return text;
  
  let processed = text.trim();
  
  // 1. Strip leading/trailing quotes (single, double, smart quotes)
  processed = processed.replace(/^["'""''""]+|["'""''""]+$/g, '');
  
  // 2. Spell-check / typo fixes
  const typos: Record<string, string> = {
    'exceling': 'excelling',
    'exceled': 'excelled',
    'teh': 'the',
    'recieve': 'receive',
    'accomodate': 'accommodate'
  };
  
  for (const [typo, fix] of Object.entries(typos)) {
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    processed = processed.replace(regex, (match) => {
      if (match === match.toUpperCase()) return fix.toUpperCase();
      if (match[0] === match[0].toUpperCase()) return fix.charAt(0).toUpperCase() + fix.slice(1);
      return fix;
    });
  }

  // 3. Strip markdown if requested
  if (options?.stripMarkdown) {
    processed = processed.replace(/^#{1,6}\s+(.*)/gm, '$1');
    processed = processed.replace(/(\*\*|__)(.*?)\1/g, '$2');
    processed = processed.replace(/(\*|_)(.*?)\1/g, '$2');
    processed = processed.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  return processed.trim();
}
