export function todayISO() {
  return toISODate(new Date());
}

export function toISODate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDay(isoDate: string) {
  return new Date(`${isoDate.slice(0, 10)}T12:00:00`);
}

export function formatLong(isoDate: string) {
  if (!isoDate) return "—";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDay(isoDate));
}

export function formatClock(iso: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDate(isoDate: string) {
  if (!isoDate) return "—";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDay(isoDate));
}

export function weekdayName(isoDate: string) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    weekday: "long",
  }).format(parseDay(isoDate));
}

function shiftISO(isoDate: string, days: number) {
  const date = parseDay(isoDate);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function dayLabel(isoDate: string) {
  const today = todayISO();
  if (isoDate === today) return "اليوم";
  if (isoDate === shiftISO(today, 1)) return "غداً";
  if (isoDate === shiftISO(today, -1)) return "أمس";
  return weekdayName(isoDate);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  return parts.slice(0, 2).map((part) => part[0]).join(" ");
}

export function toLatinDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function normalizeArabic(value: string) {
  return toLatinDigits(value)
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

export function includesText(haystack: string, needle: string) {
  const query = normalizeArabic(needle);
  if (!query) return true;
  return normalizeArabic(haystack).includes(query);
}

export function matchesPatientQuery(name: string, fileNumber: string, phone: string, query: string) {
  const text = normalizeArabic(query);
  if (!text) return true;
  const digits = toLatinDigits(query).replace(/\D/g, "");
  const phoneDigits = toLatinDigits(phone).replace(/\D/g, "");
  return (
    includesText(name, query) ||
    includesText(fileNumber, query) ||
    (digits.length > 0 && phoneDigits.includes(digits))
  );
}
