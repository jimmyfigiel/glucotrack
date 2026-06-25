import React, { useState, useEffect } from 'react';
import { Search, Barcode, PenLine, Pencil, Trash2, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFoods, searchFoods, updateFood, deleteFood } from '../api.js';
import MealFitCard from '../components/MealFitCard.jsx';
import useTargets from '../hooks/useTargets.js';

const NUTRITION_FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'net_carbs', label: 'Net Carbs', unit: 'g' },
  { key: 'total_carbs', label: 'Total Carbs', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'added_sugar', label: 'Added Sugar', unit: 'g' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
  { key: 'sat_fat', label: 'Sat Fat', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'protein', label: 'Protein', unit: 'g' },
];

export default function FoodLibrary() {
  const { targets } = useTargets();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [editingFood, setEditingFood] = useState(null); // food being edited
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // food id awaiting confirm

  useEffect(() => {
    loadFoods();
  }, []);

  async function loadFoods() {
    setLoading(true);
    const data = await getFoods().catch(() => []);
    setFoods(data);
    setLoading(false);
  }

  async function handleSearch(q) {
    setSearchQ(q);
    if (!q.trim()) {
      setSearching(false);
      loadFoods();
      return;
    }
    setSearching(true);
    const results = await searchFoods(q).catch(() => []);
    setFoods(results);
  }

  function startEdit(food) {
    setEditingFood(food.id);
    setEditForm({ ...food });
  }

  function cancelEdit() {
    setEditingFood(null);
    setEditForm({});
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const updated = await updateFood(editingFood, editForm);
      setFoods(prev => prev.map(f => f.id === editingFood ? updated : f));
      setEditingFood(null);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteFood(id);
      setFoods(prev => prev.filter(f => f.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
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
          <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">×</button>
        )}
      </div>

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
        <div className="space-y-2">
          {foods.map(food => (
            <div key={food.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {editingFood === food.id ? (
                /* ── Edit mode ── */
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">Editing</span>
                    <div className="flex gap-2">
                      <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:text-gray-600">
                        <X size={18} />
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        <Check size={15} />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Serving Size</label>
                      <input
                        type="number" step="0.1"
                        value={editForm.serving_size || ''}
                        onChange={e => setEditForm(f => ({ ...f, serving_size: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Unit</label>
                      <input
                        type="text"
                        value={editForm.serving_unit || ''}
                        onChange={e => setEditForm(f => ({ ...f, serving_unit: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {NUTRITION_FIELDS.map(({ key, label, unit }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{label} ({unit})</label>
                        <input
                          type="number" step="0.1"
                          value={editForm[key] ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{food.name}</span>
                      <span className={`flex-shrink-0 flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                        food.source === 'barcode' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {food.source === 'barcode' ? <Barcode size={10} /> : <PenLine size={10} />}
                        {food.source}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {food.net_carbs}g net carbs · {food.cholesterol}mg chol · {food.calories} cal
                    </div>
                    <div className="text-xs text-gray-400">
                      per {food.serving_size} {food.serving_unit}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => setSelectedFood(food)}
                      className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1.5 rounded-lg font-medium hover:bg-green-100 transition-colors"
                    >
                      Log
                    </button>
                    <button
                      onClick={() => startEdit(food)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    {deleteConfirm === food.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(food.id)}
                          className="text-xs bg-red-600 text-white px-2 py-1.5 rounded-lg font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs text-gray-500 px-2 py-1.5"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(food.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
