import type { Activity, CheckIn } from "./types.js";
import { getDatesInRange, getDateDow, formatDateRange } from "./time.js";

function completionSquare(rate: number): string {
  if (rate >= 0.8) return "🟩";
  if (rate >= 0.6) return "🟨";
  if (rate >= 0.4) return "🟧";
  return "🟥";
}

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatWeeklyGrid(
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
  lines.push(`📊 <b>Итоги недели ${esc(formatDateRange(weekStart, weekEnd))}</b>`);
  lines.push("");
  lines.push("<i>Пн Вт Ср Чт Пт Сб Вс</i>");
  lines.push("");

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
      if (date > today) {
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
    const summary = scheduled > 0 ? `${done}/${scheduled} ${completionSquare(rate)}` : "не запланировано";

    lines.push(`<b>${esc(activity.name)}</b>`);
    lines.push(`${squares.join("")}  ${summary}`);
    lines.push("");
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
  lines.push(`📋 <b>Подробный отчёт ${esc(formatDateRange(weekStart, weekEnd))}</b>`);
  lines.push("");

  for (const activity of activities) {
    lines.push(`<b>${esc(activity.name)}</b>`);
    for (const date of dates) {
      const dow = getDateDow(date);
      if (!activity.days.includes(dow)) continue;
      if (date > today) {
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
  const dayLabels = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${dd}.${mm} (${dayLabels[date.getDay()]})`;
}
