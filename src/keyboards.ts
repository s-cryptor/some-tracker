import { InlineKeyboard } from "grammy";
import type { Activity, CheckIn } from "./types.js";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function buildCheckinKeyboard(
  activities: Activity[],
  checkins: CheckIn[],
  date: string
): InlineKeyboard {
  const completedIds = new Set(
    checkins.filter((c) => c.completed === 1).map((c) => c.activity_id)
  );

  const keyboard = new InlineKeyboard();
  for (const activity of activities) {
    const done = completedIds.has(activity.id);
    keyboard.text(`${done ? "✅" : "⬜"} ${activity.name}`, `ci:${activity.id}:${date}`).row();
  }
  return keyboard;
}

export function buildDaysKeyboard(selected: Set<number>): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  // Row 1: Mon-Thu
  for (const i of [0, 1, 2, 3]) {
    keyboard.text(selected.has(i) ? `✅ ${DAY_NAMES[i]}` : DAY_NAMES[i], `d:${i}`);
  }
  keyboard.row();
  // Row 2: Fri-Sun
  for (const i of [4, 5, 6]) {
    keyboard.text(selected.has(i) ? `✅ ${DAY_NAMES[i]}` : DAY_NAMES[i], `d:${i}`);
  }
  keyboard.row();
  keyboard.text("✔️ Готово", "d:done");
  return keyboard;
}

export function buildRemoveKeyboard(activities: Activity[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const activity of activities) {
    keyboard.text(`🗑 ${activity.name}`, `rm:${activity.id}`).row();
  }
  keyboard.text("❌ Отмена", "rm:cancel");
  return keyboard;
}

export function buildActivitiesKeyboard(activities: Activity[], prefix: string): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const activity of activities) {
    keyboard.text(activity.name, `${prefix}:${activity.id}`).row();
  }
  keyboard.text("❌ Отмена", `${prefix}:cancel`);
  return keyboard;
}

// weekStart: YYYY-MM-DD (Monday of that week)
export function buildWeekNavKeyboard(weekStart: string, mode: "stats" | "details"): InlineKeyboard {
  const prev = offsetWeek(weekStart, -1);
  const next = offsetWeek(weekStart, +1);
  const todayWeek = getCurrentWeekStart();
  const isCurrentWeek = weekStart === todayWeek;

  const keyboard = new InlineKeyboard();
  keyboard.text("◀ Пред. неделя", `${mode}:week:${prev}`);
  if (!isCurrentWeek) {
    keyboard.text("След. неделя ▶", `${mode}:week:${next}`);
  }
  return keyboard;
}

function offsetWeek(weekStart: string, delta: number): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta * 7);
  return date.toLocaleDateString("sv");
}

function getCurrentWeekStart(): string {
  const today = new Date().toLocaleDateString("sv", { timeZone: "Europe/Moscow" });
  const [y, m, d] = today.split("-").map(Number);
  const ref = new Date(y, m - 1, d);
  const dow = (ref.getDay() + 6) % 7;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - dow);
  return monday.toLocaleDateString("sv");
}
