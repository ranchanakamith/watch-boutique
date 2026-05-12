<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

defineProps<{
  searchQuery: string;
  selectedCategory: string;
  maxPrice: number;
  availableCategories: string[];
  highestPrice: number;
}>();

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void;
  (e: 'update:selectedCategory', value: string): void;
  (e: 'update:maxPrice', value: number): void;
}>();

const isOpen = ref(false);
const router = useRouter();

const handleSearchSubmit = () => {
  router.push('/');      
  isOpen.value = false;  
};
</script>

<template>
  <div>
  <button @click="isOpen = true" class="fixed top-6 left-2 md:top-12 md:left-19 z-40 flex flex-col items-center justify-center gap-1.5 cursor-pointer group backdrop-blur-md bg-[#F8F9FA]/80 dark:bg-theme-bg/80 px-6 py-4 rounded-full border  border border-gray-200/50 dark:border-white/10 transition-all duration-500 hover:bg-white/90 dark:hover:bg-theme-card/90">
                                               
    <div class="w-6 h-[1px] bg-gray-900 dark:bg-white group-hover:bg-theme-gold transition-colors duration-300"></div>
      <div class="w-6 h-[1px] bg-gray-900 dark:bg-white group-hover:bg-theme-gold transition-colors duration-300"></div>
      <div class="w-6 h-[1px] bg-gray-900 dark:bg-white group-hover:bg-theme-gold transition-colors duration-300"></div>
     
    </button>

    <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-500"></div>

    <div class="fixed top-0 left-0 h-full w-80 md:w-80 backdrop-blur-md bg-[#F8F9FA]/80 dark:bg-theme-bg/80 shadow-[20px_0_40px_rgba(0,0,0,0.08)] z-50 transform transition-transform duration-700 ease-in-out border-r border-gray-200/50 dark:border-white/10 rounded-r-3xl p-10 flex flex-col" :class="isOpen ? 'translate-x-0' : '-translate-x-full' ">
      <button @click="isOpen = false" class="self-end text-gray-400 hover:text-theme-gold text-2xl font-light mb-12">&times;</button>
      <h3 class="font-serif text-2xl text-gray-900 dark:text-white mb-12 tracking-wide font-light">Refine<br/>Collection</h3>

      <div class="flex flex-col gap-10">
        <div class="relative">
          <span class="block text-gray-900 dark:text-theme-muted text-xs uppercase tracking-widest font-light mb-2">Search</span>
          <input 
            :value="searchQuery"
            @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
            @keyup.enter="handleSearchSubmit" 
            type="text" 
            class="w-full bg-transparent border-b border-gray-300 dark:border-white/20 focus:border-theme-gold outline-none py-2 text-sm font-light transition-colors text-gray-900 dark:text-white"
            placeholder="Rolex, Omega..." 
          />
        </div>

        <div class="relative">
           <span class="block text-gray-900 dark:text-theme-muted text-xs uppercase tracking-widest font-light mb-2">Collection</span>
          <select 
            :value="selectedCategory"
            @change="emit('update:selectedCategory', ($event.target as HTMLSelectElement).value)"
            class="w-full bg-transparent border-b border-gray-300  dark:border-white/20 focus:border-theme-gold outline-none py-2 text-sm font-light appearance-none cursor-pointer transition-colors text-gray-900 dark:text-white"
          >
            <option v-for="category in availableCategories" :key="category" :value="category" class="bg-white  dark:bg-theme-bg text-gray-900 dark:text-white">
              {{ category.replace('-', ' ').toUpperCase() }}
            </option>
          </select>
        </div>

        <div class="flex flex-col">
          <div class="flex justify-between mb-4">
            <span class="text-gray-900 dark:text-theme-muted text-xs uppercase tracking-widest font-light">Max Price</span>
            <span class="text-theme-gold text-sm tracking-widest">${{ Number(maxPrice).toLocaleString() }}</span>
          </div>
          <input 
            type="range" 
            :value="maxPrice"
            @input="emit('update:maxPrice', Number(($event.target as HTMLInputElement).value))"
            min="0" 
            :max="highestPrice" 
            class="w-full accent-theme-gold cursor-pointer h-1 bg-gray-200 dark:bg-white/10 appearance-none rounded-none"
          />
        </div>
      </div>
    </div>
  </div>
</template>