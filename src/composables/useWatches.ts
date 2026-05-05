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
      const response = await fetch('https://dummyjson.com/products/search?q=watch');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = (await response.json()) as WatchResponse;
      const luxurySortedWatches = data.products.sort((a, b) => b.price - a.price);
      watches.value = luxurySortedWatches;
      
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