import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getMealHistory, getMeals } from '../api.js';
import useTargets from '../hooks/useTargets.js';

const DAY_OPTIONS = [7, 30, 90];

export default function History() {
  const [days, setDays] = useState(30);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState(null);
  const [dateMeals, setDateMeals] = useState({});
  const { targets } = useTargets();

  useEffect(() => {
    setLoading(true);
    getMealHistory(days)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  async function toggleDate(date) {
    if (expandedDate === date) {
      setExpandedDate(null);
      return;
    }
    setExpandedDate(date);
    if (!dateMeals[date]) {
      const meals = await getMeals(date);
      setDateMeals(prev => ({ ...prev, [date]: meals }));
    }
  }

  const chartData = history.map(row => ({
    date: row.date.slice(5), // MM-DD
    'Net Carbs': Math.round(row.net_carbs * 10) / 10,
    Cholesterol: Math.round(row.cholesterol * 10) / 10
  }));

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">History</h1>
        <p className="text-sm text-gray-500">Your nutrition trends over time</p>
      </div>

      {/* Day toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {DAY_OPTIONS.map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              days === d ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Net Carbs & Cholesterol</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No data yet for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {targets && (
                <ReferenceLine
                  y={targets.net_carbs_per_day}
                  stroke="#16a34a"
                  strokeDasharray="4 2"
                  label={{ value: 'Carb Target', position: 'right', fontSize: 10, fill: '#16a34a' }}
                />
              )}
              {targets && (
                <ReferenceLine
                  y={targets.cholesterol_per_day}
                  stroke="#f97316"
                  strokeDasharray="4 2"
                  label={{ value: 'Chol Target', position: 'right', fontSize: 10, fill: '#f97316' }}
                />
              )}
              <Line
                type="monotone"
                dataKey="Net Carbs"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="Cholesterol"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily list */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-gray-800">Daily Totals</h2>
          {[...history].reverse().map(row => (
            <div key={row.date} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => toggleDate(row.date)}
                className="w-full px-4 py-3 flex items-center justify-between"
              >
                <div className="text-left">
                  <div className="font-medium text-gray-900">{row.date}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {Math.round(row.net_carbs)}g carbs &middot; {Math.round(row.cholesterol)}mg chol &middot; {Math.round(row.calories)} cal
                  </div>
                </div>
                {expandedDate === row.date ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {expandedDate === row.date && (
                <div className="border-t border-gray-100">
                  {dateMeals[row.date] ? (
                    dateMeals[row.date].length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">No meal entries found.</div>
                    ) : (
                      dateMeals[row.date].map(meal => (
                        <div key={meal.id} className="px-4 py-2 border-b border-gray-50 last:border-0">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-sm font-medium text-gray-800">{meal.name}</span>
                              <span className="ml-2 text-xs text-gray-400 capitalize">{meal.meal_type}</span>
                            </div>
                            <span className="text-xs text-gray-500">{Math.round((meal.net_carbs || 0) * meal.quantity * 10) / 10}g carbs</span>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400">Loading...</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
