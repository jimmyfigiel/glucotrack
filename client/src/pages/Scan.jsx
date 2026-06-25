import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, PenLine, Search, X, Camera, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import MealFitCard from '../components/MealFitCard.jsx';
import useTargets from '../hooks/useTargets.js';
import { lookupBarcode, searchFoods, parseMealText, createFood, logMeal } from '../api.js';

const TABS = [
  { id: 'describe', label: 'Describe', icon: MessageSquare },
  { id: 'barcode', label: 'Barcode', icon: ScanLine },
  { id: 'manual', label: 'Manual', icon: PenLine },
  { id: 'search', label: 'Search', icon: Search }
];

const emptyForm = {
  name: '', calories: '', net_carbs: '', total_carbs: '', fiber: '',
  sugar: '', added_sugar: '', cholesterol: '', sat_fat: '',
  sodium: '', protein: '', serving_size: '1', serving_unit: 'serving', source: 'manual'
};

export default function Scan() {
  const navigate = useNavigate();
  const { targets } = useTargets();
  const [activeTab, setActiveTab] = useState('barcode');
  const [selectedFood, setSelectedFood] = useState(null);

  // Barcode state
  const [scanning, setScanning] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  // Manual state
  const [form, setForm] = useState(emptyForm);

  // Search state
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Describe state
  const [describeText, setDescribeText] = useState('');
  const [describeLoading, setDescribeLoading] = useState(false);
  const [describeError, setDescribeError] = useState('');
  const [parsedItems, setParsedItems] = useState(null); // array of {originalText, quantity, searchTerm, food, found, mealType, skip}
  const [logAllLoading, setLogAllLoading] = useState(false);
  const [logAllDone, setLogAllDone] = useState(false);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function startScanner() {
    setBarcodeError('');
    setScanning(true);

    // Dynamically import html5-qrcode to avoid SSR issues
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('barcode-reader');
    html5QrRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);
          setBarcodeLoading(true);
          try {
            const food = await lookupBarcode(decodedText);
            setSelectedFood(food);
          } catch (err) {
            setBarcodeError(`Barcode not found in database. Try manual entry.`);
          } finally {
            setBarcodeLoading(false);
          }
        },
        () => {} // ignore frame errors
      );
    } catch (err) {
      setScanning(false);
      setBarcodeError('Could not access camera. Please allow camera permission or use manual entry.');
    }
  }

  async function stopScanner() {
    if (html5QrRef.current) {
      await html5QrRef.current.stop().catch(() => {});
      html5QrRef.current = null;
    }
    setScanning(false);
  }

  function updateForm(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    const food = {
      ...form,
      calories: parseFloat(form.calories) || 0,
      net_carbs: parseFloat(form.net_carbs) || 0,
      total_carbs: parseFloat(form.total_carbs) || 0,
      fiber: parseFloat(form.fiber) || 0,
      sugar: parseFloat(form.sugar) || 0,
      added_sugar: parseFloat(form.added_sugar) || 0,
      cholesterol: parseFloat(form.cholesterol) || 0,
      sat_fat: parseFloat(form.sat_fat) || 0,
      sodium: parseFloat(form.sodium) || 0,
      protein: parseFloat(form.protein) || 0,
      serving_size: parseFloat(form.serving_size) || 1,
      source: 'manual'
    };
    setSelectedFood(food);
  }

  async function handleSearch(q) {
    setSearchQ(q);
    if (q.trim().length < 1) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const results = await searchFoods(q);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleDescribe(e) {
    e.preventDefault();
    if (!describeText.trim()) return;
    setDescribeError('');
    setParsedItems(null);
    setLogAllDone(false);
    setDescribeLoading(true);
    try {
      const { items } = await parseMealText(describeText);
      setParsedItems(items.map(item => ({ ...item, mealType: 'snack', skip: false })));
    } catch (err) {
      setDescribeError(err.message || 'Failed to parse meal. Try rephrasing.');
    } finally {
      setDescribeLoading(false);
    }
  }

  function updateParsedItem(index, key, value) {
    setParsedItems(prev => prev.map((item, i) => i === index ? { ...item, [key]: value } : item));
  }

  async function handleLogAll() {
    const toLog = parsedItems.filter(item => !item.skip && item.found);
    if (toLog.length === 0) return;
    setLogAllLoading(true);
    try {
      for (const item of toLog) {
        const food = await createFood(item.food);
        await logMeal({ food_id: food.id, quantity: item.quantity, meal_type: item.mealType });
      }
      setLogAllDone(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setDescribeError('Failed to log some items: ' + err.message);
    } finally {
      setLogAllLoading(false);
    }
  }

  if (selectedFood) {
    return (
      <div className="px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedFood(null)} className="text-gray-500 hover:text-gray-700">
            <X size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Add to Log</h1>
        </div>
        <MealFitCard
          food={selectedFood}
          targets={targets}
          onDiscard={() => setSelectedFood(null)}
        />
      </div>
    );
  }

  const manualFields = [
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
    <div className="pt-6 pb-4 space-y-4">
      <div className="px-4">
        <h1 className="text-2xl font-bold text-gray-900">Add Food</h1>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Describe Tab */}
      {activeTab === 'describe' && (
        <div className="px-4 space-y-4">
          <form onSubmit={handleDescribe} className="space-y-3">
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Describe what you ate</label>
                <textarea
                  value={describeText}
                  onChange={e => { setDescribeText(e.target.value); setParsedItems(null); setLogAllDone(false); }}
                  placeholder="e.g. 2 eggs and 2 slices of keto toast, a cup of coffee"
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={describeLoading || !describeText.trim()}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {describeLoading ? 'Looking up foods...' : 'Look Up Nutrition'}
              </button>
            </div>
          </form>

          {describeLoading && (
            <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Searching Open Food Facts...</p>
            </div>
          )}

          {describeError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {describeError}
            </div>
          )}

          {parsedItems && !describeLoading && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-600">Found {parsedItems.filter(i => i.found).length} of {parsedItems.length} items — review before logging:</p>

              {parsedItems.map((item, idx) => (
                <div key={idx} className={`bg-white rounded-2xl shadow-sm p-4 space-y-3 ${item.skip ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.found
                        ? <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                        : <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{item.food ? item.food.name : item.searchTerm}</div>
                        <div className="text-xs text-gray-400">from "{item.originalText}"</div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateParsedItem(idx, 'skip', !item.skip)}
                      className={`text-xs px-2 py-1 rounded-lg shrink-0 ${item.skip ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-500'}`}
                    >
                      {item.skip ? 'Include' : 'Skip'}
                    </button>
                  </div>

                  {!item.found && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                      No match found for "{item.searchTerm}" — this item will be skipped.
                    </p>
                  )}

                  {item.found && !item.skip && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Quantity (servings per 100g)</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={item.quantity}
                            onChange={e => updateParsedItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Meal type</label>
                          <select
                            value={item.mealType}
                            onChange={e => updateParsedItem(idx, 'mealType', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="breakfast">Breakfast</option>
                            <option value="lunch">Lunch</option>
                            <option value="dinner">Dinner</option>
                            <option value="snack">Snack</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <span><strong className="text-gray-800">{Math.round(item.food.net_carbs * item.quantity)}g</strong> net carbs</span>
                        <span><strong className="text-gray-800">{Math.round(item.food.calories * item.quantity)}</strong> cal</span>
                        <span><strong className="text-gray-800">{Math.round(item.food.cholesterol * item.quantity)}mg</strong> chol</span>
                        <span><strong className="text-gray-800">{Math.round(item.food.protein * item.quantity)}g</strong> protein</span>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {logAllDone ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-700 font-semibold text-sm">
                  Logged! Redirecting to dashboard...
                </div>
              ) : (
                <button
                  onClick={handleLogAll}
                  disabled={logAllLoading || parsedItems.every(i => i.skip || !i.found)}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {logAllLoading ? 'Logging...' : `Log ${parsedItems.filter(i => !i.skip && i.found).length} item(s)`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Barcode Tab */}
      {activeTab === 'barcode' && (
        <div className="px-4 space-y-4">
          <div
            id="barcode-reader"
            ref={scannerRef}
            className={scanning ? 'rounded-xl overflow-hidden' : 'hidden'}
          />

          {!scanning && !barcodeLoading && (
            <div className="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <Camera size={28} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Scan a Barcode</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Point your camera at a product barcode to look up nutrition info automatically.
                </p>
              </div>
              <button
                onClick={startScanner}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Start Scanner
              </button>
            </div>
          )}

          {scanning && (
            <button
              onClick={stopScanner}
              className="w-full py-3 border border-gray-300 text-gray-600 rounded-xl font-semibold hover:bg-gray-50"
            >
              Stop Scanner
            </button>
          )}

          {barcodeLoading && (
            <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-500">Looking up product...</p>
            </div>
          )}

          {barcodeError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {barcodeError}
              <button
                onClick={() => { setBarcodeError(''); setActiveTab('manual'); }}
                className="block mt-2 text-red-600 underline font-medium"
              >
                Switch to Manual Entry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual Tab */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="px-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Food Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => updateForm('name', e.target.value)}
                placeholder="e.g. Greek Yogurt"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Serving Size</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.serving_size}
                  onChange={e => updateForm('serving_size', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Unit</label>
                <input
                  type="text"
                  value={form.serving_unit}
                  onChange={e => updateForm('serving_unit', e.target.value)}
                  placeholder="g, oz, serving"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {manualFields.map(({ key, label, unit }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{label} ({unit})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form[key]}
                    onChange={e => updateForm(key, e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              Continue to Log
            </button>
          </div>
        </form>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="px-4 space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQ}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search saved foods..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>

          {searchLoading && (
            <div className="flex justify-center py-6">
              <div className="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full" />
            </div>
          )}

          {!searchLoading && searchQ && searchResults.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              No foods found. Try manual entry.
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {searchResults.map(food => (
                <button
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left"
                >
                  <div>
                    <div className="font-medium text-gray-900">{food.name}</div>
                    <div className="text-xs text-gray-500">
                      {food.net_carbs}g net carbs &middot; {food.calories} cal &middot; {food.serving_size}{food.serving_unit}
                    </div>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-2 capitalize">
                    {food.source}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
