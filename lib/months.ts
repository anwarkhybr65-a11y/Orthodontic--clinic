export const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseYear(value: string) {
  if (!/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  if (year < 2000 || year > 2100) return null;
  return year;
}

export function parseMonth(value: string) {
  if (!/^\d{1,2}$/.test(value)) return null;
  const month = Number(value);
  if (month < 1 || month > 12) return null;
  return month;
}
