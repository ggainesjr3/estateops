const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format NUMERIC(15,2) string as USD with cents. */
export function formatUsd(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return usd.format(0);
  const n = typeof amount === 'number' ? amount : parseFloat(amount);
  if (Number.isNaN(n)) return usd.format(0);
  return usd.format(n);
}
