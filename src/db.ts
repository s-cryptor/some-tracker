import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { Activity, CheckIn } from "./types.js";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "tracker.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS nutrition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    calories INTEGER,
    protein REAL,
    fat REAL,
    carbs REAL
  );

  CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    weight REAL,
    waist REAL
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    days TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    UNIQUE(activity_id, date),
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
  );
`);

interface ActivityRow {
  id: number;
  name: string;
  days: string;
  created_at: string;
}

function rowToActivity(row: ActivityRow): Activity {
  return { ...row, days: JSON.parse(row.days) as number[] };
}

export function getActivities(): Activity[] {
  return (db.prepare("SELECT * FROM activities ORDER BY created_at ASC").all() as ActivityRow[]).map(rowToActivity);
}

export function getActivity(id: number): Activity | null {
  const row = db.prepare("SELECT * FROM activities WHERE id = ?").get(id) as ActivityRow | undefined;
  return row ? rowToActivity(row) : null;
}

export function addActivity(name: string, days: number[]): Activity {
  const result = db
    .prepare("INSERT INTO activities (name, days) VALUES (?, ?)")
    .run(name, JSON.stringify(days));
  return getActivity(result.lastInsertRowid as number)!;
}

export function removeActivity(id: number): boolean {
  const result = db.prepare("DELETE FROM activities WHERE id = ?").run(id);
  return result.changes > 0;
}

export function updateActivityDays(id: number, days: number[]): void {
  db.prepare("UPDATE activities SET days = ? WHERE id = ?").run(JSON.stringify(days), id);
}

export function getActivitiesForDay(dow: number): Activity[] {
  return getActivities().filter((a) => a.days.includes(dow));
}

export function getCheckin(activityId: number, date: string): CheckIn | null {
  return (db
    .prepare("SELECT * FROM checkins WHERE activity_id = ? AND date = ?")
    .get(activityId, date) as CheckIn | undefined) ?? null;
}

export function toggleCheckin(activityId: number, date: string): boolean {
  const existing = getCheckin(activityId, date);
  if (!existing) {
    db.prepare("INSERT INTO checkins (activity_id, date, completed) VALUES (?, ?, 1)").run(activityId, date);
    return true;
  }
  const next = existing.completed ? 0 : 1;
  db.prepare("UPDATE checkins SET completed = ? WHERE activity_id = ? AND date = ?").run(next, activityId, date);
  return next === 1;
}

export function setCheckin(activityId: number, date: string, completed: boolean): void {
  db.prepare(
    "INSERT INTO checkins (activity_id, date, completed) VALUES (?, ?, ?) ON CONFLICT(activity_id, date) DO UPDATE SET completed = excluded.completed"
  ).run(activityId, date, completed ? 1 : 0);
}

export function getCheckinsForDateRange(startDate: string, endDate: string): CheckIn[] {
  return db
    .prepare("SELECT * FROM checkins WHERE date >= ? AND date <= ?")
    .all(startDate, endDate) as CheckIn[];
}

export interface Measurement {
  id: number;
  date: string;
  weight: number | null;
  waist: number | null;
}

export function getMeasurement(date: string): Measurement | null {
  return (db.prepare("SELECT * FROM measurements WHERE date = ?").get(date) as Measurement | undefined) ?? null;
}

export function saveMeasurement(date: string, weight: number | null, waist: number | null): void {
  db.prepare(
    "INSERT INTO measurements (date, weight, waist) VALUES (?, ?, ?) ON CONFLICT(date) DO UPDATE SET weight = excluded.weight, waist = excluded.waist"
  ).run(date, weight, waist);
}

export function getMeasurementsForDateRange(startDate: string, endDate: string): Measurement[] {
  return db
    .prepare("SELECT * FROM measurements WHERE date >= ? AND date <= ? ORDER BY date ASC")
    .all(startDate, endDate) as Measurement[];
}

export interface Nutrition {
  id: number;
  date: string;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
}

export function getNutrition(date: string): Nutrition | null {
  return (db.prepare("SELECT * FROM nutrition WHERE date = ?").get(date) as Nutrition | undefined) ?? null;
}

export function saveNutrition(date: string, calories: number, protein: number, fat: number, carbs: number): void {
  db.prepare(
    "INSERT INTO nutrition (date, calories, protein, fat, carbs) VALUES (?, ?, ?, ?, ?) ON CONFLICT(date) DO UPDATE SET calories = excluded.calories, protein = excluded.protein, fat = excluded.fat, carbs = excluded.carbs"
  ).run(date, calories, protein, fat, carbs);
}

export function getNutritionForDateRange(startDate: string, endDate: string): Nutrition[] {
  return db
    .prepare("SELECT * FROM nutrition WHERE date >= ? AND date <= ? ORDER BY date ASC")
    .all(startDate, endDate) as Nutrition[];
}
