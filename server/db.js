const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'glucotrack.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY,
    net_carbs_per_meal REAL DEFAULT 30,
    net_carbs_per_day REAL DEFAULT 100,
    cholesterol_per_day REAL DEFAULT 200,
    sat_fat_per_day REAL DEFAULT 20,
    added_sugar_per_day REAL DEFAULT 25,
    fiber_per_day REAL DEFAULT 25,
    sodium_per_day REAL DEFAULT 2300,
    photo_scan_enabled INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    barcode_code TEXT,
    calories REAL DEFAULT 0,
    net_carbs REAL DEFAULT 0,
    total_carbs REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    sugar REAL DEFAULT 0,
    added_sugar REAL DEFAULT 0,
    cholesterol REAL DEFAULT 0,
    sat_fat REAL DEFAULT 0,
    sodium REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    serving_size REAL DEFAULT 1,
    serving_unit TEXT DEFAULT 'serving',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS meal_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_id INTEGER NOT NULL,
    quantity REAL DEFAULT 1,
    meal_type TEXT DEFAULT 'snack',
    logged_at TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (food_id) REFERENCES foods(id)
  );
`);

// Seed targets if empty
const targetsCount = db.prepare('SELECT COUNT(*) as count FROM targets').get();
if (targetsCount['count'] === 0) {
  db.prepare(`
    INSERT INTO targets (id, net_carbs_per_meal, net_carbs_per_day, cholesterol_per_day, sat_fat_per_day, added_sugar_per_day, fiber_per_day, sodium_per_day)
    VALUES (1, 30, 100, 200, 20, 25, 25, 2300)
  `).run();
}

module.exports = db;
