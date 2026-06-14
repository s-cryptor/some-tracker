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
