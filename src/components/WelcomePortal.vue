<script setup lang="ts">
defineProps<{
  isReturnVisit?: boolean;
}>();

// FIXED: Changed event name back to 'enterStore' to match HomeView
const emit = defineEmits<{
  (e: 'enterStore', category: string): void; 
}>();

const selectPath = (category: string) => {
  emit('enterStore', category);
};
</script>

<template>
  <section class="w-full bg-white dark:bg-theme-bg flex flex-col pt-4 pb-12 px-4 md:px-8">
    <div class="max-w-[1400px] w-full mx-auto">

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

        <div @click="selectPath('mens-watches')" class="group relative overflow-hidden bg-gray-900 dark:bg-theme-card h-[350px] md:h-[400px] cursor-pointer rounded-sm active:scale-[0.98] transition-all duration-500 shadow-sm hover:shadow-xl">
          <img src="https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=1000&auto=format&fit=crop" alt="Men's" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-110" />
          <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-700"></div>
          <div class="absolute bottom-10 left-10 z-10">
            <h2 class="font-serif text-3xl md:text-4xl text-white font-light tracking-wide">Men's</h2>
            <div class="mt-4 flex items-center gap-2 text-white text-[10px] uppercase tracking-[0.2em]">
              <span class="group-hover:text-theme-gold transition-colors duration-500">Enter Collection</span>
              <span class="transform translate-x-0 group-hover:translate-x-2 transition-transform duration-500 group-hover:text-theme-gold">&rarr;</span>
            </div>
          </div>
        </div>

        <div @click="selectPath('womens-watches')" class="group relative overflow-hidden bg-gray-900 dark:bg-theme-card h-[350px] md:h-[400px] cursor-pointer rounded-sm active:scale-[0.98] transition-all duration-500 shadow-sm hover:shadow-xl">
          <img src="https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?q=80&w=1000&auto=format&fit=crop" alt="Women's" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-110" />
          <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-700"></div>
          <div class="absolute bottom-10 left-10 z-10">
            <h2 class="font-serif text-3xl md:text-4xl text-white font-light tracking-wide">Women's</h2>
            <div class="mt-4 flex items-center gap-2 text-white text-[10px] uppercase tracking-[0.2em]">
              <span class="group-hover:text-theme-gold transition-colors duration-500">Enter Collection</span>
              <span class="transform translate-x-0 group-hover:translate-x-2 transition-transform duration-500 group-hover:text-theme-gold">&rarr;</span>
            </div>
          </div>
        </div>

        <div @click="selectPath('new-arrivals')" class="group relative overflow-hidden bg-gray-900 dark:bg-theme-card h-[350px] md:h-[400px] cursor-pointer rounded-sm active:scale-[0.98] transition-all duration-500 shadow-sm hover:shadow-xl">
          <img src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1000&auto=format&fit=crop" alt="New Arrivals" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-110" />
          <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-700"></div>
          <div class="absolute bottom-10 left-10 z-10">
            <h2 class="font-serif text-3xl md:text-4xl text-white font-light tracking-wide">New Arrivals</h2>
            <div class="mt-4 flex items-center gap-2 text-white text-[10px] uppercase tracking-[0.2em]">
              <span class="group-hover:text-theme-gold transition-colors duration-500">Enter Collection</span>
              <span class="transform translate-x-0 group-hover:translate-x-2 transition-transform duration-500 group-hover:text-theme-gold">&rarr;</span>
            </div>
          </div>
        </div>

        <div @click="selectPath('trending')" class="group relative overflow-hidden bg-gray-900 dark:bg-theme-card h-[350px] md:h-[400px] cursor-pointer rounded-sm active:scale-[0.98] transition-all duration-500 shadow-sm hover:shadow-xl">
          <img src="https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=1000&auto=format&fit=crop" alt="Trending" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-110" />
          <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-700"></div>
          <div class="absolute bottom-10 left-10 z-10">
            <h2 class="font-serif text-3xl md:text-4xl text-white font-light tracking-wide">Trending</h2>
            <div class="mt-4 flex items-center gap-2 text-white text-[10px] uppercase tracking-[0.2em]">
              <span class="group-hover:text-theme-gold transition-colors duration-500">Enter Collection</span>
              <span class="transform translate-x-0 group-hover:translate-x-2 transition-transform duration-500 group-hover:text-theme-gold">&rarr;</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  </section>
</template>