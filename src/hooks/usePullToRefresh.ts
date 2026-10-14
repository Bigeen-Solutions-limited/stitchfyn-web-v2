import { useState, useCallback, useEffect } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: PullToRefreshOptions) {
  const [startY, setStartY] = useState(0);
  const [pullDelta, setPullDelta] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only from the top of the page
    if (window.scrollY === 0) {
      setStartY(e.touches[0].pageY);
    } else {
      setStartY(0);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY === 0) return;

    const currentY = e.touches[0].pageY;
    const delta = currentY - startY;

    if (delta > 0) {
      // Make the pull feel heavier the further it goes
      const resistanceDelta = Math.pow(delta, 0.85);
      setPullDelta(resistanceDelta);
      
      if (delta > 10 && e.cancelable) {
        e.preventDefault();
      }
    }
  }, [startY]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDelta > threshold && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setStartY(0);
    setPullDelta(0);
  }, [pullDelta, threshold, refreshing, onRefresh]);

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    refreshing,
    pullDelta,
    isTriggered: pullDelta > threshold
  };
}
