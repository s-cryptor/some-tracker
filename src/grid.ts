import type { Activity, CheckIn } from "./types.js";
import { getDatesInRange, getDateDow, formatDateRange } from "./time.js";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function completionSquare(rate: number): string {
  if (rate >= 0.8) return "🟩";
  if (rate >= 0.6) return "🟨";
  if (rate >= 0.4) return "🟧";
  return "🟥";
}

export function formatWeeklyGrid(
  activities: Activity[],
  checkins: CheckIn[],
  weekStart: string,
  weekEnd: string
): string {
  const dates = getDatesInRange(weekStart, weekEnd);
  const today = new Date().toLocaleDateString("sv", { timeZone: "Europe/Moscow" });

  // checkin lookup: activityId -> date -> completed
  const lookup = new Map<number, Map<string, boolean>>();
  for (const ci of checkins) {
    if (!lookup.has(ci.activity_id)) lookup.set(ci.activity_id, new Map());
    lookup.get(ci.activity_id)!.set(ci.date, ci.completed === 1);
  }

  const lines: string[] = [];
  lines.push(`📊 *Итоги недели ${formatDateRange(weekStart, weekEnd)}*`);
  lines.push("");
  lines.push(`_Пн Вт Ср Чт Пт Сб Вс_`);
  lines.push("");

  const summaryLines: string[] = [];

  for (const activity of activities) {
    const squares: string[] = [];
    let scheduled = 0;
    let done = 0;

    for (const date of dates) {
      const dow = getDateDow(date);
      if (!activity.days.includes(dow)) {
        squares.push("⬜");
        continue;
      }
      scheduled++;
      const isFuture = date > today;
      if (isFuture) {
        squares.push("🔲");
        continue;
      }
      const completed = lookup.get(activity.id)?.get(date) ?? false;
      if (completed) {
        done++;
        squares.push("🟩");
      } else {
        squares.push("🟥");
      }
    }

    const rate = scheduled > 0 ? done / scheduled : 1;
    const summary = scheduled > 0
      ? `${done}/${scheduled} ${completionSquare(rate)}`
      : "не запланировано";

    lines.push(`*${activity.name}*`);
    lines.push(`${squares.join("")}  ${summary}`);
    lines.push("");
    summaryLines.push(`• ${activity.name}: ${done}/${scheduled} дней`);
  }

  return lines.join("\n");
}

export function formatDetailedStats(
  activities: Activity[],
  checkins: CheckIn[],
  weekStart: string,
  weekEnd: string
): string {
  const dates = getDatesInRange(weekStart, weekEnd);
  const today = new Date().toLocaleDateString("sv", { timeZone: "Europe/Moscow" });

  const lookup = new Map<number, Map<string, boolean>>();
  for (const ci of checkins) {
    if (!lookup.has(ci.activity_id)) lookup.set(ci.activity_id, new Map());
    lookup.get(ci.activity_id)!.set(ci.date, ci.completed === 1);
  }

  const lines: string[] = [];
  lines.push(`📋 *Подробный отчёт ${formatDateRange(weekStart, weekEnd)}*`);
  lines.push("");

  for (const activity of activities) {
    lines.push(`*${activity.name}*`);
    for (const date of dates) {
      const dow = getDateDow(date);
      if (!activity.days.includes(dow)) continue;
      const isFuture = date > today;
      if (isFuture) {
        lines.push(`  ${formatShortDate(date)} — ⏳ впереди`);
        continue;
      }
      const completed = lookup.get(activity.id)?.get(date) ?? false;
      lines.push(`  ${formatShortDate(date)} — ${completed ? "✅ выполнено" : "❌ пропущено"}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatShortDate(dateStr: string): string {
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  const dayLabels = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  const [, m, d] = dateStr.split("-").map(Number);
  const [y] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${d.toString().padStart(2, "0")}.${months[m - 1]} (${dayLabels[date.getDay()]})`;
}
