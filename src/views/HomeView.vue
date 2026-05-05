<script setup lang="ts">
import { ref, onMounted, computed, watchEffect } from 'vue';
import { useWatches } from '../composables/useWatches';
import WatchCard from '../components/WatchCard.vue';
import SidebarFilter from '../components/SidebarFilter.vue';

const { watches, isLoading, error, fetchWatches } = useWatches();

const searchQuery = ref('');
const selectedCategory = ref('All');
const maxPrice = ref(10000); 

const availableCategories = computed(() => {
  if (!watches.value) return ['All'];
  const categories = new Set(watches.value.map(w => w.category));
  return ['All', ...Array.from(categories)];
});

const highestPrice = computed(() => {
  if (watches.value.length === 0) return 10000;
  return Math.max(...watches.value.map(w => w.price));
});

watchEffect(() => {
  if (watches.value.length > 0) maxPrice.value = highestPrice.value;
});

const filteredWatches = computed(() => {
  return watches.value.filter(watch => {
    const searchLower = searchQuery.value.toLowerCase().trim();
    const matchesSearch = searchLower === '' || 
                          watch.title.toLowerCase().includes(searchLower) || 
                          (watch.brand && watch.brand.toLowerCase().includes(searchLower));
    const matchesCategory = selectedCategory.value === 'All' || watch.category === selectedCategory.value;
    const matchesPrice = watch.price <= maxPrice.value;
    return matchesSearch && matchesCategory && matchesPrice;
  });
});

const getEditDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = b.length + 1;
  const cols = a.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i++) matrix[i]![0] = i;
  for (let j = 0; j < cols; j++) matrix[0]![j] = j;

  for (let i = 1; i < rows; i++) {
    const currentRow = matrix[i]!;
    const previousRow = matrix[i - 1]!;
    for (let j = 1; j < cols; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        currentRow[j] = previousRow[j - 1]!;
      } else {
        currentRow[j] = Math.min(
          previousRow[j - 1]! + 1, 
          Math.min(currentRow[j - 1]! + 1, 
          previousRow[j]! + 1) 
        );
      }
    }
  }
  return matrix[b.length]![a.length]!;
};

const searchSuggestion = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query || filteredWatches.value.length > 0) return null;

  const dictionary = new Set<string>();
  watches.value.forEach(w => {
    if (w.brand) dictionary.add(w.brand.toLowerCase());
    w.title.toLowerCase().split(' ').forEach(word => dictionary.add(word.replace(/[^a-z0-9]/g, '')));
  });

  let bestMatch = '';
  let minDistance = Infinity;

  for (const word of dictionary) {
    if (!word || Math.abs(word.length - query.length) > 3) continue; 
    const dist = getEditDistance(query, word);
    if (dist < minDistance && dist <= 2) { 
      minDistance = dist;
      bestMatch = word;
    }
  }
  return bestMatch ? bestMatch : null;
});

const applySuggestion = (suggestion: string) => {
  searchQuery.value = suggestion;
};

onMounted(() => {
  fetchWatches();
});
</script>

<template>
  <div class="w-full">
    <SidebarFilter 
      v-model:searchQuery="searchQuery" 
      v-model:selectedCategory="selectedCategory" 
      v-model:maxPrice="maxPrice" 
      :availableCategories="availableCategories" 
      :highestPrice="highestPrice" 
    />

    <div class="animate-fade-in transition-colors duration-700">
      <div v-if="isLoading" class="flex justify-center items-center py-32">
        <div class="animate-pulse text-theme-gold uppercase tracking-[0.3em] text-xs font-light">Preparing the showroom...</div>
      </div>

      <div v-else-if="error" class="text-center py-10">
        <p class="text-red-500 font-light tracking-widest text-sm uppercase">{{ error }}</p>
      </div>

      <div v-else-if="filteredWatches.length === 0" class="text-center py-24">
        <p class="text-gray-500 dark:text-gray-400 font-light tracking-[0.2em] text-sm uppercase mb-6">
          No timepieces match "{{ searchQuery }}"
        </p>
        
        <div v-if="searchSuggestion" class="mb-8">
          <p class="text-gray-900 dark:text-white font-serif text-xl tracking-wide font-light">
            Did you mean 
            <button @click="applySuggestion(searchSuggestion)" class="text-theme-gold hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-4 decoration-theme-gold/50 transition-colors capitalize">
              {{ searchSuggestion }}
            </button>
            ?
          </p>
        </div>
        <div v-else class="mb-8">
          <p class="text-gray-500 dark:text-gray-400 font-light text-sm tracking-widest uppercase">Please try adjusting your filters</p>
        </div>

        <button @click="searchQuery = ''; selectedCategory = 'All'; maxPrice = highestPrice" class="inline-block border border-gray-300 dark:border-white/20 hover:border-theme-gold dark:hover:border-theme-gold px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-gray-600 dark:text-gray-300 hover:text-theme-gold dark:hover:text-theme-gold transition-all duration-500">
          Reset All Filters
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-20 max-w-[1400px] mx-auto">
        <WatchCard v-for="watch in filteredWatches" :key="watch.id" :watch="watch" />
      </div>
    </div>
  </div>
</template>