import React, { useState, useEffect } from 'react';
import { Search, Barcode, PenLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFoods, searchFoods } from '../api.js';
import MealFitCard from '../components/MealFitCard.jsx';
import useTargets from '../hooks/useTargets.js';

export default function FoodLibrary() {
  const navigate = useNavigate();
  const { targets } = useTargets();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);

  useEffect(() => {
    getFoods()
      .then(setFoods)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch(q) {
    setSearchQ(q);
    if (!q.trim()) {
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const results = await searchFoods(q);
      setFoods(results);
    } catch (err) {
      console.error(err);
    }
  }

  async function clearSearch() {
    setSearchQ('');
    setSearching(false);
    setLoading(true);
    const data = await getFoods().catch(() => []);
    setFoods(data);
    setLoading(false);
  }

  if (selectedFood) {
    return (
      <div className="px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedFood(null)} className="text-gray-500 hover:text-gray-700 text-sm font-medium">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Log Again</h1>
        </div>
        <MealFitCard
          food={selectedFood}
          targets={targets}
          onDiscard={() => setSelectedFood(null)}
          existingFoodId={selectedFood.id}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Food Library</h1>
        <p className="text-sm text-gray-500">All foods you've ever logged</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQ}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search foods..."
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {searchQ && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            ×
          </button>
        )}
      </div>

      {/* Food list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full" />
        </div>
      ) : foods.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-4xl mb-2">📦</p>
          <p>{searching ? 'No foods match your search.' : 'Your library is empty.'}</p>
          <p className="text-sm mt-1">Log a food to add it here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {foods.map(food => (
            <div
              key={food.id}
              className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">{food.name}</span>
                  <span className={`flex-shrink-0 flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                    food.source === 'barcode'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {food.source === 'barcode' ? <Barcode size={10} /> : <PenLine size={10} />}
                    {food.source}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {food.net_carbs}g net carbs &middot; {food.cholesterol}mg chol &middot; {food.calories} cal
                </div>
                <div className="text-xs text-gray-400">
                  per {food.serving_size} {food.serving_unit}
                </div>
              </div>
              <button
                onClick={() => setSelectedFood(food)}
                className="ml-3 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-medium hover:bg-green-100 transition-colors flex-shrink-0"
              >
                Log Again
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
