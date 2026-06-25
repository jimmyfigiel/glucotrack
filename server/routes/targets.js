const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/targets
router.get('/', (req, res) => {
  try {
    const targets = db.prepare('SELECT * FROM targets WHERE id = 1').get();
    res.json(targets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/targets
router.put('/', (req, res) => {
  try {
    const {
      net_carbs_per_meal,
      net_carbs_per_day,
      cholesterol_per_day,
      sat_fat_per_day,
      added_sugar_per_day,
      fiber_per_day,
      sodium_per_day
    } = req.body;

    db.prepare(`
      UPDATE targets SET
        net_carbs_per_meal = ?,
        net_carbs_per_day = ?,
        cholesterol_per_day = ?,
        sat_fat_per_day = ?,
        added_sugar_per_day = ?,
        fiber_per_day = ?,
        sodium_per_day = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      net_carbs_per_meal,
      net_carbs_per_day,
      cholesterol_per_day,
      sat_fat_per_day,
      added_sugar_per_day,
      fiber_per_day,
      sodium_per_day
    );

    const updated = db.prepare('SELECT * FROM targets WHERE id = 1').get();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
