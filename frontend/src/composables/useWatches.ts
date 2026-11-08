import { ref } from 'vue';
import type { Watch, WatchResponse } from '../types/watch';

const STORAGE_KEY = 'boutique_watches_cache_v1';
const CACHE_TTL = 120_000; // 2 minutes fresh cache

// Pre-hydrate from sessionStorage for instantaneous 0ms display on repeat visits
function getInitialWatches(): Watch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

const watches = ref<Watch[]>(getInitialWatches());
const isLoading = ref<boolean>(watches.value.length === 0);
const error = ref<string | null>(null);
let lastFetchTime = watches.value.length > 0 ? Date.now() : 0;
let inflightFetch: Promise<void> | null = null;

export function useWatches() {
  const fetchWatches = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && watches.value.length > 0 && (now - lastFetchTime) < CACHE_TTL) {
      return;
    }

    if (inflightFetch) return inflightFetch;

    if (watches.value.length === 0) {
      isLoading.value = true;
    }
    error.value = null;

    inflightFetch = (async () => {
      try {
        const firstRes = await fetch('/api/products?limit=100&skip=0');
        if (!firstRes.ok) throw new Error('Unable to load the catalogue. Please try again.');
        const firstData = (await firstRes.json()) as WatchResponse;
        
        let allProducts = [...firstData.products];
        const total = firstData.total;

        // If there are more than 100 items, fetch the remaining pages concurrently in parallel
        if (total > allProducts.length && firstData.products.length > 0) {
          const promises: Promise<Response>[] = [];
          for (let skip = allProducts.length; skip < total; skip += 100) {
            promises.push(fetch(`/api/products?limit=100&skip=${skip}`));
          }
          const responses = await Promise.all(promises);
          const pagesData = await Promise.all(responses.map(r => r.json() as Promise<WatchResponse>));
          for (const page of pagesData) {
            allProducts.push(...page.products);
          }
        }

        allProducts.sort((a, b) => b.price - a.price);
        watches.value = allProducts;
        lastFetchTime = Date.now();

        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(allProducts));
        } catch {
          // sessionStorage quota exceeded, ignore safely
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          error.value = err.message;
        } else {
          error.value = 'An unexpected error occurred while fetching the timepieces.';
        }
      } finally {
        isLoading.value = false;
        inflightFetch = null;
      }
    })();

    return inflightFetch;
  };

  return {
    watches,
    isLoading,
    error,
    fetchWatches
  };
}
