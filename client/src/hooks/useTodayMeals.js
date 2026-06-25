import { useState, useEffect, useCallback } from 'react';
import { getMeals } from '../api.js';

function computeTotals(meals) {
  return meals.reduce(
    (acc, m) => {
      const q = m.quantity || 1;
      acc.calories += (m.calories || 0) * q;
      acc.net_carbs += (m.net_carbs || 0) * q;
      acc.total_carbs += (m.total_carbs || 0) * q;
      acc.fiber += (m.fiber || 0) * q;
      acc.cholesterol += (m.cholesterol || 0) * q;
      acc.sat_fat += (m.sat_fat || 0) * q;
      acc.added_sugar += (m.added_sugar || 0) * q;
      acc.sodium += (m.sodium || 0) * q;
      acc.protein += (m.protein || 0) * q;
      return acc;
    },
    {
      calories: 0,
      net_carbs: 0,
      total_carbs: 0,
      fiber: 0,
      cholesterol: 0,
      sat_fat: 0,
      added_sugar: 0,
      sodium: 0,
      protein: 0
    }
  );
}

export default function useTodayMeals() {
  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState(computeTotals([]));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMeals();
      setMeals(data);
      setTotals(computeTotals(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { meals, totals, loading, refresh };
}
