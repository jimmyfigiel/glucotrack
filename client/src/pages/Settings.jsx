import React, { useState, useEffect } from 'react';
import { AlertCircle, Download, Save } from 'lucide-react';
import useTargets from '../hooks/useTargets.js';
import { getMeals } from '../api.js';

const FIELDS = [
  { key: 'net_carbs_per_meal', label: 'Net Carbs per Meal', unit: 'g', description: 'Max net carbs in a single meal' },
  { key: 'net_carbs_per_day', label: 'Net Carbs per Day', unit: 'g', description: 'Daily net carb limit' },
  { key: 'cholesterol_per_day', label: 'Cholesterol per Day', unit: 'mg', description: 'Daily cholesterol limit' },
  { key: 'sat_fat_per_day', label: 'Saturated Fat per Day', unit: 'g', description: 'Daily saturated fat limit' },
  { key: 'added_sugar_per_day', label: 'Added Sugar per Day', unit: 'g', description: 'Daily added sugar limit' },
  { key: 'fiber_per_day', label: 'Fiber Goal per Day', unit: 'g', description: 'Daily fiber intake goal' },
  { key: 'sodium_per_day', label: 'Sodium per Day', unit: 'mg', description: 'Daily sodium limit' }
];

export default function Settings() {
  const { targets, updateTargets, loading } = useTargets();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (targets) setForm({ ...targets });
  }, [targets]);

  function updateField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await updateTargets(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleExportCSV() {
    setExporting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const meals = await getMeals(today);

      const headers = [
        'Food Name', 'Meal Type', 'Quantity', 'Calories', 'Net Carbs (g)',
        'Total Carbs (g)', 'Fiber (g)', 'Sugar (g)', 'Added Sugar (g)',
        'Cholesterol (mg)', 'Sat Fat (g)', 'Sodium (mg)', 'Protein (g)',
        'Serving Size', 'Serving Unit', 'Logged At'
      ];

      const rows = meals.map(m => [
        `"${m.name}"`,
        m.meal_type,
        m.quantity,
        Math.round((m.calories || 0) * m.quantity * 10) / 10,
        Math.round((m.net_carbs || 0) * m.quantity * 10) / 10,
        Math.round((m.total_carbs || 0) * m.quantity * 10) / 10,
        Math.round((m.fiber || 0) * m.quantity * 10) / 10,
        Math.round((m.sugar || 0) * m.quantity * 10) / 10,
        Math.round((m.added_sugar || 0) * m.quantity * 10) / 10,
        Math.round((m.cholesterol || 0) * m.quantity * 10) / 10,
        Math.round((m.sat_fat || 0) * m.quantity * 10) / 10,
        Math.round((m.sodium || 0) * m.quantity * 10) / 10,
        Math.round((m.protein || 0) * m.quantity * 10) / 10,
        m.serving_size,
        m.serving_unit,
        m.logged_at
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `glucotrack-${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Customize your nutrition targets</p>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          This app is a personal tracking tool and does not provide medical advice. Default nutrition
          targets are general starting points and may not be appropriate for you. Please set your
          targets in consultation with your doctor or a registered dietitian, and consult them before
          making changes to your diet.
        </p>
      </div>

      {/* Targets form */}
      {loading || !form ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-4 space-y-5">
          <h2 className="font-semibold text-gray-800">Nutrition Targets</h2>

          {FIELDS.map(({ key, label, unit, description }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-0.5">
                {label} ({unit})
              </label>
              <p className="text-xs text-gray-400 mb-1">{description}</p>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form[key] ?? ''}
                onChange={e => updateField(key, parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {saved && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              Targets saved successfully!
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
          >
            <Save size={18} />
            Save Targets
          </button>
        </form>
      )}

      {/* Export */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">Export Data</h2>
        <p className="text-sm text-gray-500">Download today's meal log as a CSV file.</p>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Download size={18} />
          {exporting ? 'Exporting...' : 'Export Today\'s Log (CSV)'}
        </button>
      </div>

      {/* App info */}
      <div className="text-center text-xs text-gray-400 pb-2">
        <p className="font-semibold text-gray-500">GlucoTrack v1.0</p>
        <p>Low-carb &amp; low-cholesterol tracker for Type 2 Diabetes</p>
        <p className="mt-1">Barcode data from Open Food Facts (openfoodfacts.org)</p>
      </div>
    </div>
  );
}
