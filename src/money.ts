export function pesos(cents: number, showSign = false) {
  const value = cents / 100;
  const sign = value < 0 ? '-' : showSign && value > 0 ? '+' : '';
  return `${sign}₱${Math.abs(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toCents(input: string) {
  const normalized = input.replace(/,/g, '').trim();
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function fromCents(cents: number) { return (cents / 100).toFixed(2); }

export function manilaToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function currentMonth() { return manilaToday().slice(0, 7); }
export function previousMonth(month = currentMonth()) {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, value - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
