export function parseKeywords(input: string): string[] {
  if (!input) return [];
  // split on comma or semicolon
  const parts = input.split(/[,;]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (let p of parts) {
    p = p.trim().toLowerCase();
    // remove any character that's not letter, number, space or hyphen
    p = p.replace(/[^a-z0-9\s-]/g, '');
    // collapse multiple spaces
    p = p.replace(/\s+/g, ' ').trim();
    if (!p) continue;
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

export function normalizeKeywords(input: string): string {
  return parseKeywords(input).join(', ');
}
