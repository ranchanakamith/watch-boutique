<script setup lang="ts">
import { RouterLink } from 'vue-router';

// Smooth scroll to top animation upon navigation
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};
</script>

<template>
  <footer class="bg-[#0a0a0a] text-white pt-20 pb-8 border-t border-white/5">
    <div class="max-w-[1400px] mx-auto px-4 md:px-8">
      
      <div class="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
        
        <div class="md:col-span-12 lg:col-span-5">
          <RouterLink to="/" @click="scrollToTop">
            <h2 class="font-serif text-2xl text-theme-gold tracking-widest mb-6 uppercase hover:text-white transition-colors cursor-pointer">
              Timeless
            </h2>
          </RouterLink>
          <p class="text-[11px] text-gray-300 font-light tracking-[0.15em] mb-8 max-w-sm uppercase leading-loose">
            Curated elegance, timeless style, customer care you can trust.
          </p>
          
          <div class="flex gap-4">
            <a href="https://www.facebook.com/share/18hAQUW1Aa/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" class="w-10 h-10 rounded-full border border-gray-500 flex items-center justify-center hover:border-theme-gold hover:text-theme-gold text-gray-300 transition-colors duration-300">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
              </svg>
            </a>
            <a href="https://www.instagram.com/timelesslx.lk?igsh=aWFkcTdjaWhnbnZz" target="_blank" rel="noopener noreferrer" class="w-10 h-10 rounded-full border border-gray-500 flex items-center justify-center hover:border-theme-gold hover:text-theme-gold text-gray-300 transition-colors duration-300">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="#" class="w-10 h-10 rounded-full border border-gray-500 flex items-center justify-center hover:border-theme-gold hover:text-theme-gold text-gray-300 transition-colors duration-300">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>
            </a>
          </div>
        </div>

        <div class="md:col-span-6 lg:col-span-4">
          <h3 class="font-serif text-theme-gold text-sm uppercase tracking-widest mb-6">Customer Service</h3>
          <ul class="space-y-4 text-gray-300 font-light text-sm tracking-wide">
            <li>
              <RouterLink to="/contact" @click="scrollToTop" class="hover:text-theme-gold transition-colors duration-300 block">Contact Us</RouterLink>
            </li>
            <li>
              <RouterLink to="/track-order" @click="scrollToTop" class="hover:text-theme-gold transition-colors duration-300 block">Track Order</RouterLink>
            </li>
            <li>
              <RouterLink to="/shipping" @click="scrollToTop" class="hover:text-theme-gold transition-colors duration-300 block">Shipping Information</RouterLink>
            </li>
            <li>
              <RouterLink to="/returns" @click="scrollToTop" class="hover:text-theme-gold transition-colors duration-300 block">Returns & Exchanges</RouterLink>
            </li>
            <li>
              <RouterLink to="/warranty" @click="scrollToTop" class="hover:text-theme-gold transition-colors duration-300 block">Warranty</RouterLink>
            </li>
            <li>
              <RouterLink to="/faq" @click="scrollToTop" class="hover:text-theme-gold transition-colors duration-300 block">FAQ</RouterLink>
            </li>
          </ul>
        </div>

        <div class="md:col-span-6 lg:col-span-3">
          <h3 class="font-serif text-theme-gold text-sm uppercase tracking-widest mb-6">Legal</h3>
          <ul class="space-y-4 text-gray-300 font-light text-sm tracking-wide">
            <li><a href="#" class="hover:text-theme-gold transition-colors duration-300 block">Privacy Policy</a></li>
            <li><a href="#" class="hover:text-theme-gold transition-colors duration-300 block">Terms of Service</a></li>
            <li>
              <RouterLink to="/about" @click="scrollToTop" class="hover:text-theme-gold transition-colors duration-300 block">About Us</RouterLink>
            </li>
          </ul>
        </div>

      </div>

      <div class="border-t border-white/10 pt-8 flex flex-col items-center justify-center text-center gap-3">
        <p class="text-gray-400 text-sm font-light tracking-wide">
          &copy; 2026 Timeless. All rights reserved.
        </p>
        <p class="text-gray-500 text-xs font-light tracking-wide flex items-center justify-center flex-wrap gap-1">
          Powered by 
          <span class="text-theme-gold border border-theme-gold/40 px-1.5 py-0.5 mx-1 tracking-widest">BTECHZO</span>
          , Shamith Samaraweera & Kamith Samaraweera
        </p>
      </div>

    </div>
  </footer>
</template>