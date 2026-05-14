<script setup lang="ts">
defineProps<{
  isReturnVisit?: boolean;
}>();

const emit = defineEmits<{
  (e: 'enterStore', category: string): void;
}>();

const selectPath = (category: string) => {
  setTimeout(() => {
    emit('enterStore', category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 300);
};
</script>

<template>
  <div class="fixed inset-0 z-[200] bg-white dark:bg-theme-bg overflow-y-auto flex flex-col pt-20 pb-32 px-4 md:px-8">
    <div class="max-w-[1400px] w-full mx-auto flex-grow flex flex-col justify-center">
      
      <div class="text-center mb-16 transition-all duration-700">
        <h2 class="text-[10px] uppercase tracking-[0.4em] text-gray-400 dark:text-theme-muted mb-6">
          {{ isReturnVisit ? 'Explore Our' : 'Welcome to' }}
        </h2>
        <h1 class="font-serif text-4xl md:text-6xl text-gray-900 dark:text-white font-light tracking-widest mb-8 uppercase">
          {{ isReturnVisit ? 'Curated Collections' : 'The Premium Watch Boutique' }}
        </h1>
        <div class="h-px w-24 bg-theme-gold mx-auto mb-8"></div>
        <p class="text-gray-500 font-light tracking-widest uppercase text-xs">Select your collection to enter</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-6 h-auto lg:h-[600px]">

        <div @click="selectPath('mens-watches')" class="group relative overflow-hidden bg-gray-100 dark:bg-theme-card lg:col-span-3 h-[400px] lg:h-auto cursor-pointer rounded-sm active:scale-[0.98] transition-all duration-500">
          <img src="https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=1000&auto=format&fit=crop" alt="Men's Collection" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-110" />
          <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-700"></div>
          <div class="absolute bottom-10 left-10 z-10">
            <h2 class="font-serif text-4xl text-white font-light tracking-wide">Men's</h2>
            <div class="mt-4 flex items-center gap-2 text-white text-[10px] uppercase tracking-[0.2em]">
              <span class="group-hover:text-theme-gold transition-colors duration-500">Enter Collection</span>
              <span class="transform translate-x-0 group-hover:translate-x-2 transition-transform duration-500 group-hover:text-theme-gold">&rarr;</span>
            </div>
          </div>
        </div>

        <div @click="selectPath('womens-watches')" class="group relative overflow-hidden bg-gray-100 dark:bg-theme-card lg:col-span-3 h-[400px] lg:h-auto cursor-pointer rounded-sm active:scale-[0.98] transition-all duration-500">
          <img src="https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?q=80&w=1000&auto=format&fit=crop" alt="Women's Collection" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-110" />
          <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-700"></div>
          <div class="absolute bottom-10 left-10 z-10">
            <h2 class="font-serif text-4xl text-white font-light tracking-wide">Women's</h2>
            <div class="mt-4 flex items-center gap-2 text-white text-[10px] uppercase tracking-[0.2em]">
              <span class="group-hover:text-theme-gold transition-colors duration-500">Enter Collection</span>
              <span class="transform translate-x-0 group-hover:translate-x-2 transition-transform duration-500 group-hover:text-theme-gold">&rarr;</span>
            </div>
          </div>
        </div>

        <div @click="selectPath('new-arrivals')" class="group relative overflow-hidden bg-gray-100 dark:bg-theme-card lg:col-span-2 h-[300px] lg:h-full cursor-pointer rounded-sm active:scale-[0.98] transition-all duration-500">
          <img src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1000&auto=format&fit=crop" alt="New Collection" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-110" />
          <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-700"></div>
          <div class="absolute bottom-8 left-8 z-10">
            <h2 class="font-serif text-2xl text-white font-light tracking-wide mb-2">New Arrivals</h2>
            <p class="text-white group-hover:text-theme-gold text-[9px] uppercase tracking-[0.2em] transition-colors">Enter &rarr;</p>
          </div>
        </div>

        <div @click="selectPath('trending')" class="group relative overflow-hidden bg-gray-100 dark:bg-theme-card lg:col-span-2 h-[300px] lg:h-full cursor-pointer rounded-sm active:scale-[0.98] transition-all duration-500">
          <img src="https://images.unsplash.com/photo-1548171915-e75a4012afbb?q=80&w=1000&auto=format&fit=crop" alt="Trending" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-110" />
          <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-700"></div>
          <div class="absolute bottom-8 left-8 z-10">
            <h2 class="font-serif text-2xl text-white font-light tracking-wide mb-2">Trending</h2>
            <p class="text-white group-hover:text-theme-gold text-[9px] uppercase tracking-[0.2em] transition-colors">Enter &rarr;</p>
          </div>
        </div>

        <div @click="selectPath('All')" class="group relative overflow-hidden bg-gray-900 lg:col-span-2 h-[300px] lg:h-full cursor-pointer rounded-sm flex flex-col items-center justify-center p-8 text-center border border-gray-800 active:scale-[0.98] transition-all duration-500">
          <h2 class="font-serif text-2xl text-white font-light tracking-wide mb-4">The Complete Vault</h2>
          <span class="inline-block border border-white/20 px-6 py-3 text-[9px] text-white uppercase tracking-[0.3em] group-hover:border-theme-gold group-hover:text-theme-gold transition-colors duration-500">View All Timepieces</span>
        </div>

      </div>
    </div>
  </div>
</template>