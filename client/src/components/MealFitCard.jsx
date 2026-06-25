import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createFood, logMeal } from '../api.js';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

function FitChip({ label, value, target, isGood = false }) {
  const pct = target > 0 ? (value / target) * 100 : 0;
  let colorClass;
  if (isGood) {
    colorClass = pct >= 100 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  } else {
    colorClass = pct < 70 ? 'bg-green-100 text-green-700' : pct < 90 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  }
  return (
    <div className={`rounded-lg px-3 py-2 ${colorClass}`}>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-sm">{Math.round(value * 10) / 10}g of {target}g target</div>
    </div>
  );
}

export default function MealFitCard({ food: initialFood, targets, onDiscard, existingFoodId }) {
  const navigate = useNavigate();
  const [food, setFood] = useState({ ...initialFood });
  const [quantity, setQuantity] = useState(1);
  const [mealType, setMealType] = useState('snack');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateField(key, val) {
    setFood(prev => ({ ...prev, [key]: val === '' ? '' : parseFloat(val) || 0 }));
  }

  function updateText(key, val) {
    setFood(prev => ({ ...prev, [key]: val }));
  }

  const scaled = (val) => (parseFloat(val) || 0) * quantity;

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      let foodId = existingFoodId;
      if (!foodId) {
        const created = await createFood({
          name: food.name,
          source: food.source || 'manual',
          barcode_code: food.barcode_code || null,
          calories: parseFloat(food.calories) || 0,
          net_carbs: parseFloat(food.net_carbs) || 0,
          total_carbs: parseFloat(food.total_carbs) || 0,
          fiber: parseFloat(food.fiber) || 0,
          sugar: parseFloat(food.sugar) || 0,
          added_sugar: parseFloat(food.added_sugar) || 0,
          cholesterol: parseFloat(food.cholesterol) || 0,
          sat_fat: parseFloat(food.sat_fat) || 0,
          sodium: parseFloat(food.sodium) || 0,
          protein: parseFloat(food.protein) || 0,
          serving_size: parseFloat(food.serving_size) || 1,
          serving_unit: food.serving_unit || 'serving'
        });
        foodId = created.id;
      }
      await logMeal({ food_id: foodId, quantity, meal_type: mealType });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: 'calories', label: 'Calories', unit: 'kcal' },
    { key: 'net_carbs', label: 'Net Carbs', unit: 'g' },
    { key: 'total_carbs', label: 'Total Carbs', unit: 'g' },
    { key: 'fiber', label: 'Fiber', unit: 'g' },
    { key: 'sugar', label: 'Sugar', unit: 'g' },
    { key: 'added_sugar', label: 'Added Sugar', unit: 'g' },
    { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
    { key: 'sat_fat', label: 'Sat Fat', unit: 'g' },
    { key: 'sodium', label: 'Sodium', unit: 'mg' },
    { key: 'protein', label: 'Protein', unit: 'g' }
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-4 space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Food Name</label>
        <input
          type="text"
          value={food.name || ''}
          onChange={e => updateText('name', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Food name"
        />
      </div>

      {/* Serving info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Serving Size</label>
          <input
            type="number"
            step="0.1"
            value={food.serving_size || ''}
            onChange={e => updateField('serving_size', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Unit</label>
          <input
            type="text"
            value={food.serving_unit || ''}
            onChange={e => updateText('serving_unit', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="g, oz, serving..."
          />
        </div>
      </div>

      {/* Nutrition fields */}
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, unit }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{label} ({unit})</label>
            <input
              type="number"
              step="0.1"
              value={food[key] === '' ? '' : food[key] ?? ''}
              onChange={e => updateField(key, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      {/* Quantity & meal type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Quantity (servings)</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={quantity}
            onChange={e => setQuantity(parseFloat(e.target.value) || 1)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Meal Type</label>
          <select
            value={mealType}
            onChange={e => setMealType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {MEAL_TYPES.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* How this fits your plan */}
      {targets && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">How this fits your plan</h3>
          <div className="grid grid-cols-2 gap-2">
            <FitChip
              label="Net Carbs (this meal)"
              value={scaled(food.net_carbs)}
              target={targets.net_carbs_per_meal}
            />
            <FitChip
              label="Cholesterol"
              value={scaled(food.cholesterol)}
              target={targets.cholesterol_per_day}
            />
            <FitChip
              label="Sat Fat"
              value={scaled(food.sat_fat)}
              target={targets.sat_fat_per_day}
            />
            <FitChip
              label="Added Sugar"
              value={scaled(food.added_sugar)}
              target={targets.added_sugar_per_day}
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onDiscard}
          className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Discard
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !food.name}
          className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors"
        >
          {saving ? 'Saving...' : 'Save to Log'}
        </button>
      </div>
    </div>
  );
}
