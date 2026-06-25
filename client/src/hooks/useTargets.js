import { useState, useEffect, useCallback } from 'react';
import { getTargets, updateTargets as apiUpdateTargets } from '../api.js';

export default function useTargets() {
  const [targets, setTargets] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTargets()
      .then(setTargets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateTargets = useCallback(async (data) => {
    const updated = await apiUpdateTargets(data);
    setTargets(updated);
    return updated;
  }, []);

  return { targets, updateTargets, loading };
}
