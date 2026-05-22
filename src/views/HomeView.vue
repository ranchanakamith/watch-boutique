<script lang="ts">
import { ref } from 'vue';

// ==============================================
// GLOBAL MEMORY STATE
// ==============================================
const hasEnteredStore = ref(false);
const searchQuery = ref('');
const selectedCategory = ref('All');
const maxPrice = ref(10000);
const isFirstLoad = ref(true);
</script>

<script setup lang="ts">
import { onMounted, computed, watchEffect } from 'vue';
import { useWatches } from '../composables/useWatches';
import WatchCard from '../components/WatchCard.vue';
import SidebarFilter from '../components/SidebarFilter.vue';
import WelcomePortal from '../components/WelcomePortal.vue';

const { watches, isLoading, error, fetchWatches } = useWatches();

const productGrid = ref<HTMLElement | null>(null);

// --- PORTAL LOGIC ---
const isReturnVisit = ref(sessionStorage.getItem('hasVisited') === 'true');

const handleStoreEntry = (category: string) => {
  searchQuery.value = '';
  maxPrice.value = highestPrice.value;
  
  selectedCategory.value = category;
  hasEnteredStore.value = true;
  sessionStorage.setItem('hasVisited', 'true');
  isReturnVisit.value = true;
  
  if (productGrid.value) {
    productGrid.value.scrollIntoView({ behavior: 'smooth' });
  }
};

const reopenPortal = () => {
  isReturnVisit.value = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const viewAllWatches = () => {
  selectedCategory.value = 'All';
  if (productGrid.value) {
    productGrid.value.scrollIntoView({ behavior: 'smooth' });
  }
};

// NEW: Dedicated Reset Filters Function
const resetFilters = () => {
  searchQuery.value = '';
  selectedCategory.value = 'All';
  maxPrice.value = highestPrice.value;
  
  if (productGrid.value) {
    productGrid.value.scrollIntoView({ behavior: 'smooth' });
  }
};
// -------------------------

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
  if (watches.value.length > 0 && isFirstLoad.value) {
    maxPrice.value = highestPrice.value;
    isFirstLoad.value = false;
  }
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
  if (watches.value.length === 0) {
    fetchWatches();
  }
});
</script>

<template>
  <div class="w-full relative bg-white dark:bg-theme-bg">
    
    <WelcomePortal :isReturnVisit="isReturnVisit" @enterStore="handleStoreEntry" />

    <div ref="productGrid" class="w-full min-h-screen pt-20 border-t border-gray-100 dark:border-white/5">
      
      <SidebarFilter 
        v-model:searchQuery="searchQuery" 
        v-model:selectedCategory="selectedCategory" 
        v-model:maxPrice="maxPrice" 
        :availableCategories="availableCategories" 
        :highestPrice="highestPrice" 
        @openPortal="reopenPortal"
      />

      <div class="mb-20 text-center pt-8">
        <h2 class="font-serif text-3xl md:text-5xl text-gray-900 dark:text-white font-light tracking-wide uppercase">
          {{ selectedCategory === 'All' ? 'All Timepieces' : selectedCategory.replace('-', ' ') }}
        </h2>
        <div class="h-px w-12 bg-theme-gold mx-auto mt-6"></div>
      </div>

      <div class="pt-10">
        
        <div v-if="isLoading" class="flex flex-col justify-center items-center py-32 gap-6 animate-fade-in">
          <img 
            src="/timeless-logo.png" 
            alt="Timeless Logo" 
            class="h-8 md:h-10 object-contain animate-pulse dark:invert opacity-90"
          />
          <div class="text-gray-400 dark:text-theme-muted uppercase tracking-[0.4em] text-[9px] font-light">
            Preparing the showroom
          </div>
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

            <button @click="resetFilters" class="inline-block border border-gray-300 dark:border-white/20 hover:border-theme-gold dark:hover:border-theme-gold px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-gray-600 dark:text-gray-300 hover:text-theme-gold dark:hover:text-theme-gold transition-all duration-500 active:scale-[0.98]">
              Reset All Filters
            </button>
        </div>

        <div v-else>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-20 max-w-[1400px] mx-auto px-4 md:px-8">
            <WatchCard v-for="watch in filteredWatches" :key="watch.id" :watch="watch" />
          </div>

          <div class="w-full border-t border-gray-200 dark:border-white/10 mt-20 pt-20 pb-20 text-center flex flex-col items-center">
            <h3 class="font-serif text-3xl md:text-4xl font-light text-gray-900 dark:text-white tracking-wide mb-4">Want to explore more?</h3>
            <p class="text-gray-400 dark:text-theme-muted text-[10px] uppercase tracking-[0.3em] mb-10">Discover other curations in our boutique</p>
            
            <div class="flex flex-col sm:flex-row flex-wrap justify-center gap-4 md:gap-6">
              
              <button @click="reopenPortal" class="inline-flex items-center justify-center gap-3 border border-gray-900 dark:border-white px-10 py-4 text-[10px] uppercase tracking-[0.3em] text-gray-900 dark:text-white hover:bg-theme-gold hover:border-theme-gold hover:text-white transition-all duration-500 active:scale-[0.98] group">
                Top of Collections
                <span class="transform group-hover:-translate-y-1 transition-transform duration-300">&uarr;</span>
              </button>

              <button @click="resetFilters" class="inline-flex items-center justify-center gap-3 border border-gray-900 dark:border-white px-10 py-4 text-[10px] uppercase tracking-[0.3em] text-gray-900 dark:text-white hover:bg-theme-gold hover:border-theme-gold hover:text-white transition-all duration-500 active:scale-[0.98] group">
                Reset Filters
                <span class="transform group-hover:rotate-180 transition-transform duration-500 text-[14px]">↻</span>
              </button>

            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>