const express = require('express');
const router = express.Router();
const db = require('../db');
const fetch = require('node-fetch');

// GET /api/foods
router.get('/', (req, res) => {
  try {
    const foods = db.prepare('SELECT * FROM foods ORDER BY created_at DESC LIMIT 100').all();
    res.json(foods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/foods/search?q=...
router.get('/search', (req, res) => {
  try {
    const q = req.query.q || '';
    const foods = db.prepare(
      "SELECT * FROM foods WHERE name LIKE ? ORDER BY created_at DESC LIMIT 50"
    ).all(`%${q}%`);
    res.json(foods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/barcode/:code
router.get('/barcode/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'GlucoTrack/1.0 (personal-tracker)' }
    });
    const data = await response.json();

    if (data.status === 0 || !data.product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const p = data.product;
    const n = p.nutriments || {};

    // Normalize per 100g values
    const calories = n['energy-kcal_100g'] || (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);
    const total_carbs = n['carbohydrates_100g'] || 0;
    const fiber = n['fiber_100g'] || 0;
    const net_carbs = Math.max(0, total_carbs - fiber);
    const sugar = n['sugars_100g'] || 0;
    const added_sugar = n['added-sugars_100g'] || 0;
    // cholesterol in nutriments is in mg/100g, keep as mg
    const cholesterol = n['cholesterol_100g'] != null ? n['cholesterol_100g'] * 1000 : 0;
    const sat_fat = n['saturated-fat_100g'] || 0;
    const sodium = n['sodium_100g'] != null ? n['sodium_100g'] * 1000 : 0;
    const protein = n['proteins_100g'] || 0;

    // Serving size
    const serving_size = p.serving_quantity || 100;
    const serving_unit = p.serving_size_unit || p.quantity_unit || 'g';

    const normalized = {
      name: p.product_name || p.product_name_en || 'Unknown Product',
      calories: Math.round(calories * 10) / 10,
      net_carbs: Math.round(net_carbs * 10) / 10,
      total_carbs: Math.round(total_carbs * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
      sugar: Math.round(sugar * 10) / 10,
      added_sugar: Math.round(added_sugar * 10) / 10,
      cholesterol: Math.round(cholesterol * 10) / 10,
      sat_fat: Math.round(sat_fat * 10) / 10,
      sodium: Math.round(sodium * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      serving_size,
      serving_unit,
      source: 'barcode',
      barcode_code: code
    };

    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/foods
router.post('/', (req, res) => {
  try {
    const {
      name, source, barcode_code, calories, net_carbs, total_carbs,
      fiber, sugar, added_sugar, cholesterol, sat_fat, sodium, protein,
      serving_size, serving_unit
    } = req.body;

    const result = db.prepare(`
      INSERT INTO foods (name, source, barcode_code, calories, net_carbs, total_carbs,
        fiber, sugar, added_sugar, cholesterol, sat_fat, sodium, protein, serving_size, serving_unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, source || 'manual', barcode_code || null,
      calories || 0, net_carbs || 0, total_carbs || 0,
      fiber || 0, sugar || 0, added_sugar || 0,
      cholesterol || 0, sat_fat || 0, sodium || 0,
      protein || 0, serving_size || 1, serving_unit || 'serving'
    );

    const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(food);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
