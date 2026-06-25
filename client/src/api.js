const BASE = '/api';

function getToken() {
  return localStorage.getItem('glucotrack_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Token ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem('glucotrack_token');
    localStorage.removeItem('glucotrack_username');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const loginUser = (username, password) =>
  request('/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) });
export const logoutUser = () =>
  request('/auth/logout/', { method: 'POST' });

// Targets
export const getTargets = () => request('/targets/');
export const updateTargets = (data) =>
  request('/targets/', { method: 'PUT', body: JSON.stringify(data) });

// Foods
export const getFoods = () => request('/foods/');
export const searchFoods = (q) => request(`/foods/search/?q=${encodeURIComponent(q)}`);
export const createFood = (data) =>
  request('/foods/', { method: 'POST', body: JSON.stringify(data) });
export const updateFood = (id, data) =>
  request(`/foods/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteFood = (id) =>
  request(`/foods/${id}/`, { method: 'DELETE' });
export const lookupBarcode = (code) => request(`/foods/barcode/${code}/`);

// Meals
export const getMeals = (date) => {
  const d = date || new Date().toISOString().split('T')[0];
  return request(`/meals/?date=${d}`);
};
export const logMeal = (data) =>
  request('/meals/', { method: 'POST', body: JSON.stringify(data) });
export const updateMeal = (id, data) =>
  request(`/meals/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMeal = (id) =>
  request(`/meals/${id}/`, { method: 'DELETE' });
export const getMealHistory = (days = 30) =>
  request(`/meals/history/?days=${days}`);

// Natural language meal parsing
export const parseMealText = (text) =>
  request('/parse-meal/', { method: 'POST', body: JSON.stringify({ text }) });
