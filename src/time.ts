const TZ = "Asia/Almaty";

export function getTodayDate(): string {
  return new Date().toLocaleDateString("sv", { timeZone: TZ }); // YYYY-MM-DD
}

// Returns Mon=0, Tue=1, ..., Sun=6
export function getTodayDow(): number {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  return (d.getDay() + 6) % 7;
}

// Returns Mon=0 based day of week for a YYYY-MM-DD string
export function getDateDow(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (date.getDay() + 6) % 7;
}

export function getWeekRange(date?: string): { start: string; end: string } {
  const today = date ?? getTodayDate();
  const [y, m, d] = today.split("-").map(Number);
  const ref = new Date(y, m - 1, d);
  const dow = (ref.getDay() + 6) % 7; // Mon=0
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - dow);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toLocaleDateString("sv"),
    end: sunday.toLocaleDateString("sv"),
  };
}

export function formatDateRange(start: string, end: string): string {
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const [, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (sm === em) {
    return `${sd}–${ed} ${months[em - 1]} ${ey}`;
  }
  return `${sd} ${months[sm - 1]} – ${ed} ${months[em - 1]} ${ey}`;
}

export function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const current = new Date(sy, sm - 1, sd);
  const endDate = new Date(ey, em - 1, ed);
  while (current <= endDate) {
    dates.push(current.toLocaleDateString("sv"));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
