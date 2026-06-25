import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import useTodayMeals from '../hooks/useTodayMeals.js';
import useTargets from '../hooks/useTargets.js';
import { deleteMeal } from '../api.js';

function ProgressBar({ label, current, target, isGood = false, unit = 'g' }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const rawPct = target > 0 ? (current / target) * 100 : 0;

  let barColor;
  if (isGood) {
    barColor = rawPct >= 100 ? 'bg-green-500' : rawPct >= 70 ? 'bg-yellow-400' : 'bg-red-400';
  } else {
    barColor = rawPct < 70 ? 'bg-green-500' : rawPct < 90 ? 'bg-yellow-400' : 'bg-red-500';
  }

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">
          {Math.round(current * 10) / 10}{unit} / {target}{unit}
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { meals, totals, loading, refresh } = useTodayMeals();
  const { targets, loading: targetsLoading } = useTargets();

  async function handleDelete(id) {
    if (!window.confirm('Remove this entry from today\'s log?')) return;
    await deleteMeal(id);
    refresh();
  }

  const grouped = MEAL_ORDER.reduce((acc, type) => {
    acc[type] = meals.filter(m => m.meal_type === type);
    return acc;
  }, {});

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GlucoTrack</h1>
        <p className="text-sm text-gray-500">{today}</p>
      </div>

      {/* Progress Bars */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <h2 className="font-semibold text-gray-800 text-base">Today's Progress</h2>
        {targetsLoading || loading ? (
          <div className="text-sm text-gray-400">Loading...</div>
        ) : targets ? (
          <>
            <ProgressBar label="Net Carbs" current={totals.net_carbs} target={targets.net_carbs_per_day} />
            <ProgressBar label="Cholesterol" current={totals.cholesterol} target={targets.cholesterol_per_day} unit="mg" />
            <ProgressBar label="Sat Fat" current={totals.sat_fat} target={targets.sat_fat_per_day} />
            <ProgressBar label="Added Sugar" current={totals.added_sugar} target={targets.added_sugar_per_day} />
            <ProgressBar label="Fiber" current={totals.fiber} target={targets.fiber_per_day} isGood />
            <ProgressBar label="Sodium" current={totals.sodium} target={targets.sodium_per_day} unit="mg" />
          </>
        ) : null}
      </div>

      {/* Daily summary line */}
      {!loading && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex justify-between text-sm">
          <span className="text-gray-600">Calories today</span>
          <span className="font-semibold text-gray-800">{Math.round(totals.calories)} kcal</span>
        </div>
      )}

      {/* Meals by type */}
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-800 text-base">Today's Meals</h2>
        {loading ? (
          <div className="text-sm text-gray-400">Loading meals...</div>
        ) : meals.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">🥗</p>
            <p>No meals logged yet today.</p>
            <p className="text-sm">Tap + to add your first entry.</p>
          </div>
        ) : (
          MEAL_ORDER.map(type => {
            const mealList = grouped[type];
            if (mealList.length === 0) return null;
            return (
              <div key={type} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {type}
                  </span>
                </div>
                {mealList.map(meal => (
                  <div key={meal.id} className="px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{meal.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {meal.quantity} × {meal.serving_size}{meal.serving_unit} &middot;{' '}
                        <span className="text-green-700">{Math.round((meal.net_carbs || 0) * meal.quantity * 10) / 10}g net carbs</span>
                        {meal.cholesterol > 0 && (
                          <span className="ml-1">&middot; {Math.round((meal.cholesterol || 0) * meal.quantity)}mg chol</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-2">
                      <span className="text-sm font-medium text-gray-700">
                        {Math.round((meal.calories || 0) * meal.quantity)} cal
                      </span>
                      <button
                        onClick={() => handleDelete(meal.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        aria-label="Delete meal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/scan')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
        aria-label="Add food"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
