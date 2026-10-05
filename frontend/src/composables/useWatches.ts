import { ref } from 'vue';
import type { Watch, WatchResponse } from '../types/watch';

export function useWatches() {
  const watches = ref<Watch[]>([]);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const fetchWatches = async () => {
    isLoading.value = true;
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
