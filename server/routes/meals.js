const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/meals?date=YYYY-MM-DD
router.get('/', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const meals = db.prepare(`
      SELECT
        ml.id, ml.food_id, ml.quantity, ml.meal_type, ml.logged_at, ml.notes,
        f.name, f.calories, f.net_carbs, f.total_carbs, f.fiber, f.sugar,
        f.added_sugar, f.cholesterol, f.sat_fat, f.sodium, f.protein,
        f.serving_size, f.serving_unit, f.source, f.barcode_code
      FROM meal_logs ml
      JOIN foods f ON ml.food_id = f.id
      WHERE DATE(ml.logged_at) = ?
      ORDER BY ml.logged_at ASC
    `).all(date);
    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/meals/history?days=30
router.get('/history', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const history = db.prepare(`
      SELECT
        DATE(ml.logged_at) as date,
        SUM(f.calories * ml.quantity) as calories,
        SUM(f.net_carbs * ml.quantity) as net_carbs,
        SUM(f.total_carbs * ml.quantity) as total_carbs,
        SUM(f.fiber * ml.quantity) as fiber,
        SUM(f.cholesterol * ml.quantity) as cholesterol,
        SUM(f.sat_fat * ml.quantity) as sat_fat,
        SUM(f.added_sugar * ml.quantity) as added_sugar,
        SUM(f.sodium * ml.quantity) as sodium,
        SUM(f.protein * ml.quantity) as protein
      FROM meal_logs ml
      JOIN foods f ON ml.food_id = f.id
      WHERE ml.logged_at >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(ml.logged_at)
      ORDER BY date ASC
    `).all(days);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/meals
router.post('/', (req, res) => {
  try {
    const { food_id, quantity, meal_type, notes } = req.body;
    const result = db.prepare(`
      INSERT INTO meal_logs (food_id, quantity, meal_type, notes)
      VALUES (?, ?, ?, ?)
    `).run(food_id, quantity || 1, meal_type || 'snack', notes || null);

    const meal = db.prepare(`
      SELECT
        ml.id, ml.food_id, ml.quantity, ml.meal_type, ml.logged_at, ml.notes,
        f.name, f.calories, f.net_carbs, f.total_carbs, f.fiber, f.sugar,
        f.added_sugar, f.cholesterol, f.sat_fat, f.sodium, f.protein,
        f.serving_size, f.serving_unit, f.source
      FROM meal_logs ml
      JOIN foods f ON ml.food_id = f.id
      WHERE ml.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(meal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/meals/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, meal_type, notes } = req.body;

    db.prepare(`
      UPDATE meal_logs SET quantity = ?, meal_type = ?, notes = ? WHERE id = ?
    `).run(quantity, meal_type, notes, id);

    const meal = db.prepare(`
      SELECT
        ml.id, ml.food_id, ml.quantity, ml.meal_type, ml.logged_at, ml.notes,
        f.name, f.calories, f.net_carbs, f.total_carbs, f.fiber, f.sugar,
        f.added_sugar, f.cholesterol, f.sat_fat, f.sodium, f.protein,
        f.serving_size, f.serving_unit, f.source
      FROM meal_logs ml
      JOIN foods f ON ml.food_id = f.id
      WHERE ml.id = ?
    `).get(id);

    res.json(meal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/meals/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM meal_logs WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
