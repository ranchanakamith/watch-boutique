import { ref } from 'vue';
import type { Watch, WatchResponse } from '../types/watch';

// Module-level cache so navigating between pages never flashes a blank loading state
const watches = ref<Watch[]>([]);
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);
let lastFetchTime = 0;
const CACHE_TTL = 60_000; // 1 minute fresh cache

export function useWatches() {
  const fetchWatches = async (forceRefresh = false) => {
    // If data is already cached and still fresh, don't show loading spinner or re-fetch
    const now = Date.now();
    if (!forceRefresh && watches.value.length > 0 && (now - lastFetchTime) < CACHE_TTL) {
      return;
    }

    // Only set isLoading = true if we don't have any cached watches to show
    if (watches.value.length === 0) {
      isLoading.value = true;
    }
    error.value = null;

    try {
      const products: Watch[] = [];
      let total = 0;
      do {
        const response = await fetch(`/api/products?limit=100&skip=${products.length}`);
        if (!response.ok) throw new Error('Unable to load the catalogue. Please try again.');
        const data = (await response.json()) as WatchResponse;
        products.push(...data.products);
        total = data.total;
        if (data.products.length === 0) break;
      } while (products.length < total);
      watches.value = products.sort((a, b) => b.price - a.price);
      lastFetchTime = Date.now();
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = 'An unexpected error occurred while fetching the timepieces.';
      }
    } finally {
      isLoading.value = false;
    }
  };

  return {
    watches,
    isLoading,
    error,
    fetchWatches
  };
}
