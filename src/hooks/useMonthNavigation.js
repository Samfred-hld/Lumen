import { useState } from 'react';

export function useMonthNavigation(initialMonth, initialYear) {
  const now = new Date();
  const [month, setMonth] = useState(initialMonth ?? now.getMonth());
  const [year, setYear] = useState(initialYear ?? now.getFullYear());

  const navigate = (delta) => {
    setMonth((prev) => {
      let m = prev + delta;
      if (m > 11) { setYear((y) => y + 1); return 0; }
      if (m < 0) { setYear((y) => y - 1); return 11; }
      return m;
    });
  };

  const goToToday = () => {
    setMonth(now.getMonth());
    setYear(now.getFullYear());
  };

  return { month, year, navigate, goToToday };
}
