<script setup lang="ts">
const emit = defineEmits<{
  (e: 'selectCategory', category: string): void;
}>();

const handleSelect = (category: string) => {
  emit('selectCategory', category);
  
  // Smoothly scroll down to where the watches are displayed
  window.scrollTo({
    top: document.documentElement.scrollHeight / 2, // Adjust this value if needed
    behavior: 'smooth'
  });
};
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 mt-24 mb-32 animate-fade-in">
    
    <div class="text-center mb-16">
      <h1 class="font-serif text-4xl md:text-5xl text-gray-900 dark:text-white font-light tracking-wide mb-6">Discover the Collections</h1>
      <div class="h-px w-12 bg-theme-gold mx-auto"></div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-6 h-auto lg:h-[800px]">

      <div @click="handleSelect('mens-watches')" class="group relative overflow-hidden bg-gray-100 dark:bg-theme-card lg:col-span-3 h-[400px] lg:h-auto cursor-pointer border border-gray-200/50 dark:border-white/10 rounded-sm">
        <img src="https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=1000&auto=format&fit=crop" alt="Men's Collection" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <div class="absolute bottom-10 left-10 z-10">
          <p class="text-theme-gold text-[10px] uppercase tracking-[0.4em] mb-3 backdrop-blur-sm bg-black/20 inline-block px-3 py-1 rounded-sm">Engineered for Excellence</p>
          <h2 class="font-serif text-3xl md:text-4xl text-white font-light tracking-wide">Men's Timepieces</h2>
          <div class="mt-6 flex items-center gap-2 text-white text-[10px] uppercase tracking-[0.2em]">
            <span class="group-hover:text-theme-gold transition-colors duration-500">Explore Collection</span>
            <span class="transform translate-x-0 group-hover:translate-x-2 transition-transform duration-500 group-hover:text-theme-gold">&rarr;</span>
          </div>
        </div>
      </div>

      <div @click="handleSelect('womens-watches')" class="group relative overflow-hidden bg-gray-100 dark:bg-theme-card lg:col-span-3 h-[400px] lg:h-auto cursor-pointer border border-gray-200/50 dark:border-white/10 rounded-sm">
        <img src="https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?q=80&w=1000&auto=format&fit=crop" alt="Women's Collection" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <div class="absolute bottom-10 left-10 z-10">
          <p class="text-theme-gold text-[10px] uppercase tracking-[0.4em] mb-3 backdrop-blur-sm bg-black/20 inline-block px-3 py-1 rounded-sm">Elegance & Grace</p>
          <h2 class="font-serif text-3xl md:text-4xl text-white font-light tracking-wide">Women's Collection</h2>
          <div class="mt-6 flex items-center gap-2 text-white text-[10px] uppercase tracking-[0.2em]">
            <span class="group-hover:text-theme-gold transition-colors duration-500">Explore Collection</span>
            <span class="transform translate-x-0 group-hover:translate-x-2 transition-transform duration-500 group-hover:text-theme-gold">&rarr;</span>
          </div>
        </div>
      </div>

      <div @click="handleSelect('new-arrivals')" class="group relative overflow-hidden bg-gray-100 dark:bg-theme-card lg:col-span-2 h-[300px] lg:h-full cursor-pointer border border-gray-200/50 dark:border-white/10 rounded-sm">
        <img src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1000&auto=format&fit=crop" alt="New Collection" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div class="absolute bottom-8 left-8 z-10">
          <h2 class="font-serif text-2xl text-white font-light tracking-wide mb-2">New Arrivals</h2>
          <p class="text-theme-gold text-[9px] uppercase tracking-[0.2em]">Discover &rarr;</p>
        </div>
      </div>

      <div @click="handleSelect('trending')" class="group relative overflow-hidden bg-gray-100 dark:bg-theme-card lg:col-span-2 h-[300px] lg:h-full cursor-pointer border border-gray-200/50 dark:border-white/10 rounded-sm">
        <img src="https://images.unsplash.com/photo-1548171915-e75a4012afbb?q=80&w=1000&auto=format&fit=crop" alt="Trending Watches" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div class="absolute bottom-8 left-8 z-10">
          <h2 class="font-serif text-2xl text-white font-light tracking-wide mb-2">Trending Now</h2>
          <p class="text-theme-gold text-[9px] uppercase tracking-[0.2em]">Discover &rarr;</p>
        </div>
      </div>

      <div @click="handleSelect('All')" class="group relative overflow-hidden bg-gray-900 dark:bg-theme-bg lg:col-span-2 h-[300px] lg:h-full cursor-pointer border border-gray-200/50 dark:border-white/10 rounded-sm flex flex-col items-center justify-center p-8 text-center">
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-theme-gold mb-6 transform group-hover:scale-110 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="font-serif text-2xl text-white font-light tracking-wide mb-4">The Complete<br/>Vault</h2>
        <span class="inline-block border border-white/20 px-6 py-3 text-[9px] text-white uppercase tracking-[0.3em] group-hover:border-theme-gold group-hover:text-theme-gold transition-colors duration-500">View All Watches</span>
      </div>

    </div>
  </div>
</template>