const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const WORD_NUMBERS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5
};

const UNITS = [
  'tablespoons', 'tablespoon', 'tbsp', 'teaspoons', 'teaspoon', 'tsp',
  'cups', 'cup', 'ounces', 'ounce', 'oz', 'grams', 'gram', 'g',
  'pounds', 'pound', 'lb', 'lbs', 'slices', 'slice', 'pieces', 'piece',
  'servings', 'serving', 'strips', 'strip', 'cloves', 'clove',
  'handfuls', 'handful', 'cans', 'can', 'bottles', 'bottle',
  'links', 'link', 'patties', 'patty', 'fillets', 'fillet'
];

function parseItem(raw) {
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  let quantity = 1;
  let remainder = text;

  // Match leading number: "2.5", "1/2", "2"
  const numMatch = remainder.match(/^(\d+\.?\d*|\d+\/\d+)\s*/);
  if (numMatch) {
    const raw = numMatch[1];
    quantity = raw.includes('/') ? eval(raw) : parseFloat(raw);
    remainder = remainder.slice(numMatch[0].length);
  } else {
    // Match word number: "two eggs", "a slice"
    const wordMatch = remainder.match(/^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|half)\s+/);
    if (wordMatch) {
      quantity = WORD_NUMBERS[wordMatch[1]] ?? 1;
      remainder = remainder.slice(wordMatch[0].length);
    }
  }

  // Strip leading unit + "of": "slices of", "cups of", "oz"
  const unitPattern = new RegExp(`^(${UNITS.join('|')})\\s+(of\\s+)?`, 'i');
  const unitMatch = remainder.match(unitPattern);
  if (unitMatch) {
    remainder = remainder.slice(unitMatch[0].length);
  }

  const searchTerm = remainder.trim();
  if (!searchTerm) return null;

  return { quantity, searchTerm, originalText: raw.trim() };
}

async function searchOFF(term) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,nutriments,serving_quantity,serving_size_unit,quantity_unit`;
  const res = await fetch(url, { headers: { 'User-Agent': 'GlucoTrack/1.0 (personal-tracker)' } });
  const data = await res.json();
  if (!data.products || data.products.length === 0) return null;

  const p = data.products[0];
  const n = p.nutriments || {};

  const calories = n['energy-kcal_100g'] || (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);
  const total_carbs = n['carbohydrates_100g'] || 0;
  const fiber = n['fiber_100g'] || 0;
  const net_carbs = Math.max(0, total_carbs - fiber);
  const sugar = n['sugars_100g'] || 0;
  const added_sugar = n['added-sugars_100g'] || 0;
  const cholesterol = n['cholesterol_100g'] != null ? n['cholesterol_100g'] * 1000 : 0;
  const sat_fat = n['saturated-fat_100g'] || 0;
  const sodium = n['sodium_100g'] != null ? n['sodium_100g'] * 1000 : 0;
  const protein = n['proteins_100g'] || 0;

  return {
    name: p.product_name || term,
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
    serving_size: 100,
    serving_unit: 'g',
    source: 'manual'
  };
}

// POST /api/parse-meal
// body: { text: "2 eggs and 2 slices of keto toast" }
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'No text provided' });

    // Split on "and" or commas
    const parts = text.split(/\band\b|,/i).map(s => s.trim()).filter(Boolean);
    const parsed = parts.map(parseItem).filter(Boolean);

    if (parsed.length === 0) return res.status(400).json({ error: 'Could not parse any food items' });

    // Search OFF for each item in parallel
    const results = await Promise.all(
      parsed.map(async (item) => {
        const food = await searchOFF(item.searchTerm);
        return {
          originalText: item.originalText,
          quantity: item.quantity,
          searchTerm: item.searchTerm,
          food,
          found: !!food
        };
      })
    );

    res.json({ items: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
