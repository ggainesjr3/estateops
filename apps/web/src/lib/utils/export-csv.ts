function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(filename: string, data: Record<string, unknown>[]): void {
  if (!data.length) {
    const blob = new Blob([''], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(filename, blob);
    return;
  }

  const headers = Object.keys(data[0]!);
  const lines = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => escapeCsvValue(row[h])).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(filename, blob);
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
