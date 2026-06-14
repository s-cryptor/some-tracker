# Habit Tracker Bot

A personal Telegram bot for tracking daily habits. Sends morning reminders, asks for progress in the evening, and delivers a weekly activity grid on Sundays.

## Features

- Add and remove habits with custom weekly schedules
- Morning reminder at **8:00 AM Moscow time**
- Evening check-in at **11:00 PM Moscow time** — tap buttons to mark habits done
- Weekly activity grid every **Sunday at 11:30 PM** (GitHub-style colored squares)
- Browse past weeks with ◀ / ▶ navigation
- Detailed day-by-day breakdown via `/details`
- Daily evening prompt for КБЖУ (calories, protein, fat, carbs) via conversation
- Wednesday evening additionally prompts for weight and waist measurements
- All history stored indefinitely in SQLite

## Commands

| Command | Description |
|---------|-------------|
| `/add` | Add a new habit (name + days of week) |
| `/remove` | Remove a habit |
| `/list` | List all habits and their schedules |
| `/checkin` | Manually open today's check-in |
| `/kbju` | Log today's calories, protein, fat, carbs |
| `/measure` | Log weight and waist measurements |
| `/stats` | Weekly activity grid |
| `/details` | Day-by-day breakdown for the week |
| `/help` | Show help |

## Activity Grid

```
📊 Week of Jun 9–15 2026

Mon Tue Wed Thu Fri Sat Sun

Reading
🟩🟩🟥🟩🟩⬜⬜  4/5 🟩

Cardio
⬜🟩⬜🟩⬜🟩⬜  3/3 🟩

Calorie control
🟩🟥🟩🟩🟥🟩🟩  5/7 🟨

Learning
🟩🟩🟩🟥🟩🟩🟩  6/7 🟩
```

Color scale: 🟩 ≥80% · 🟨 60–79% · 🟧 40–59% · 🟥 <40% · ⬜ not scheduled · 🔲 upcoming

## Stack

- [Grammy](https://grammy.dev/) — Telegram bot framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — SQLite database
- [node-cron](https://github.com/node-cron/node-cron) — scheduling
- TypeScript · Node.js 22 · PM2

## Setup

### 1. Clone and install

```bash
git clone git@github.com:s-cryptor/some-tracker.git
cd some-tracker
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in BOT_TOKEN and ADMIN_CHAT_ID
```

- `BOT_TOKEN` — get from [@BotFather](https://t.me/BotFather)
- `ADMIN_CHAT_ID` — your Telegram user ID (get from [@userinfobot](https://t.me/userinfobot))

### 3. Build and run

```bash
npm run build
node dist/index.js
```

### 4. Seed initial habits (optional)

```bash
npx tsx scripts/seed.ts
```

Adds: Reading (daily), Calorie control (daily), Cardio (Mon/Wed/Fri), Learning (Mon–Fri).

## Deployment (VPS)

Set `DEPLOY_HOST` (and optionally `DEPLOY_DIR`) before running the script:

```bash
export DEPLOY_HOST=root@1.2.3.4
export DEPLOY_DIR=/opt/habit-tracker  # default

./deploy.sh
ssh $DEPLOY_HOST "cd $DEPLOY_DIR && pm2 restart habit-tracker"
```

PM2 is configured to auto-start on reboot via `ecosystem.config.js`.

## Development

```bash
npm run dev   # tsx watch mode
npm run lint  # type-check only
npm run build # compile to dist/
```

## Data

SQLite database is stored at `data/tracker.db`. Not committed to git. Back it up manually if needed:

```bash
scp root@your-vps:/opt/habit-tracker/data/tracker.db ./backup.db
```
