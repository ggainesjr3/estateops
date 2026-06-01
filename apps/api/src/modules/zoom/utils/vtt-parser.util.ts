/** Parse WebVTT transcript to plain text for AI summarization. */
export function parseVttToPlainText(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const parts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === 'WEBVTT' || trimmed.startsWith('NOTE')) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s+-->/.test(trimmed)) continue;
    if (trimmed.startsWith('align:') || trimmed.startsWith('position:')) continue;
    parts.push(trimmed.replace(/<[^>]+>/g, ''));
  }

  return parts.join('\n').trim();
}
