const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Targets
export const getTargets = () => request('/targets');
export const updateTargets = (data) =>
  request('/targets/', { method: 'PUT', body: JSON.stringify(data) });

// Foods
export const getFoods = () => request('/foods');
export const searchFoods = (q) => request(`/foods/search?q=${encodeURIComponent(q)}`);
export const createFood = (data) =>
  request('/foods/', { method: 'POST', body: JSON.stringify(data) });
export const lookupBarcode = (code) => request(`/foods/barcode/${code}`);

// Meals
export const getMeals = (date) => {
  const d = date || new Date().toISOString().split('T')[0];
  return request(`/meals?date=${d}`);
};
export const logMeal = (data) =>
  request('/meals/', { method: 'POST', body: JSON.stringify(data) });
export const updateMeal = (id, data) =>
  request(`/meals/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMeal = (id) =>
  request(`/meals/${id}/`, { method: 'DELETE' });
export const getMealHistory = (days = 30) =>
  request(`/meals/history?days=${days}`);

// Natural language meal parsing
export const parseMealText = (text) =>
  request('/parse-meal/', { method: 'POST', body: JSON.stringify({ text }) });
