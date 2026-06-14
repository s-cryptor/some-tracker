// Run once to add initial activities:
// npx tsx scripts/seed.ts
import { addActivity, getActivities } from "../src/db.js";

const existing = getActivities();
if (existing.length > 0) {
  console.log("Activities already seeded:", existing.map((a) => a.name).join(", "));
  process.exit(0);
}

const activities = [
  { name: "Чтение", days: [0, 1, 2, 3, 4, 5, 6] },       // every day
  { name: "Контроль калорий", days: [0, 1, 2, 3, 4, 5, 6] }, // every day
  { name: "Кардио", days: [0, 2, 4] },                     // Mon, Wed, Fri
  { name: "Изучение нового", days: [0, 1, 2, 3, 4] },      // Mon-Fri
];

for (const { name, days } of activities) {
  addActivity(name, days);
  console.log(`Added: ${name}`);
}

console.log("Done!");
