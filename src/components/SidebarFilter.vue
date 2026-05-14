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
const isDropdownOpen = ref(false);
const router = useRouter();

const handleSearchSubmit = () => {
  router.push('/');      
  isOpen.value = false;  
};
</script>

<template>
  <div>
   <button @click="isOpen = true" class="fixed top-6 left-2 md:top-12 md:left-19 z-40 flex flex-col items-center justify-center gap-1.5 cursor-pointer group backdrop-blur-md bg-[#F8F9FA]/80 dark:bg-theme-bg/80 px-6 py-4 rounded-full border  border border-gray-200/50 dark:border-white/10 transition-all duration-500 hover:bg-white/90 dark:hover:bg-theme-card/90">
      <div class="w-6 h-[1px] bg-gray-500 dark:bg-white group-hover:bg-theme-gold transition-colors duration-300"></div>
      <div class="w-6 h-[1px] bg-gray-500 dark:bg-white group-hover:bg-theme-gold transition-colors duration-300"></div>
      <div class="w-6 h-[1px] bg-gray-500 dark:bg-white group-hover:bg-theme-gold transition-colors duration-300"></div>
      
    </button>

    <div v-if="isOpen" @click="isOpen = false; isDropdownOpen = false" class="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity duration-500"></div>

    <div class="fixed top-0 left-0 h-full w-80 md:w-80 backdrop-blur-md bg-[#F8F9FA]/80 dark:bg-theme-bg/80 shadow-[20px_0_40px_rgba(0,0,0,0.08)] z-50 transform transition-transform duration-700 ease-in-out border-r border-gray-200/50 dark:border-white/10 rounded-r-3xl p-10 flex flex-col" :class="isOpen ? 'translate-x-0' : '-translate-x-full'">
      
      <button @click="isOpen = false; isDropdownOpen = false" class="self-end text-gray-400 hover:text-theme-gold text-2xl font-light mb-12">&times;</button>
      <h3 class="font-serif text-2xl text-gray-900 dark:text-white mb-12 tracking-wide font-light">Refine<br/>Collection</h3>

      <div class="flex flex-col gap-10">
        
        <div class="relative">
          <span class="block text-gray-600 dark:text-theme-muted text-xs uppercase tracking-widest font-light mb-2">Search</span>
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
          <span class="block text-gray-600 dark:text-theme-muted text-xs uppercase tracking-widest font-light mb-2">Collection</span>
          
          <div 
            @click="isDropdownOpen = !isDropdownOpen"
            class="w-full bg-transparent border-b border-gray-300 dark:border-white/20 hover:border-theme-gold dark:hover:border-theme-gold py-2 text-xs font-light cursor-pointer transition-colors text-gray-500 dark:text-white/70 flex justify-between items-center"
          >
            <span>{{ selectedCategory.replace('-', ' ').toUpperCase() }}</span>
            <svg :class="{'rotate-180': isDropdownOpen}" class="w-3 h-3 transition-transform  duration-300 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round"  stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <transition 
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <div 
              v-if="isDropdownOpen" 
              class="absolute top-full left-0 w-full mt-2 backdrop-blur-md bg-white/50 dark:bg-theme-bg/90 border border-gray-200/50 dark:border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden"
            >
              <div 
                v-for="category in availableCategories" 
                :key="category" 
                @click="emit('update:selectedCategory', category); isDropdownOpen = false"
                class="px-4 py-3 text-xs  font-light cursor-pointer  transition-colors"
                :class="selectedCategory === category ? 'bg-theme-gold  text-white' : 'text-gray-900 dark:text-white  hover:bg-gray-100/50 dark:hover:bg-white/10'"
              >
                {{ category.replace('-', ' ').toUpperCase() }}
              </div>
            </div>
          </transition>
        </div>

        <div class="flex flex-col">
          <div class="flex justify-between mb-4">
            <span class="text-gray-400 dark:text-theme-muted text-xs uppercase tracking-widest font-light">Max Price</span>
            <span class="text-theme-gold text-sm tracking-widest">${{ Number(maxPrice).toLocaleString() }}</span>
          </div>
          <input 
            type="range" 
            :value="maxPrice"
            @input="emit('update:maxPrice', Number(($event.target as HTMLInputElement).value))"
            min="0" 
            :max="highestPrice" 
            class="w-full accent-theme-gold cursor-pointer h-1 bg-gray-350 dark:bg-white/10 appearance-none rounded-full"
          />
        </div>

      </div>
    </div>
  </div>
</template>