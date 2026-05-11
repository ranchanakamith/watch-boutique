<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Watch } from '../types/watch';
import { useCart } from '../composables/useCart';
import { useWishlist } from '../composables/useWishlist';

const props = defineProps<{
  watch: Watch;
}>();
const router = useRouter();
const { addToCart } = useCart();
const { wishlist, toggleWishlist } = useWishlist();

const isWatchInWishlist = computed(() => {
  return wishlist.value.some(item => item.id === props.watch.id);
});

// Animation States
const isAddingToBag = ref(false);
const isBuyingNow = ref(false);
const heartAnim = ref(false);

const handleAddToCart = () => {
  addToCart(props.watch);
  isAddingToBag.value = true;
  setTimeout(() => {
    isAddingToBag.value = false;
  }, 1500);
};

const handleBuyNow = () => {
  addToCart(props.watch);
  isBuyingNow.value = true;
  setTimeout(() => {
    isBuyingNow.value = false;
    alert(`Proceeding to Secure Checkout for ${props.watch.title}...`);
    // FUTURE: router.push('/checkout');
  }, 600);
};

const handleToggleWishlist = () => {
  toggleWishlist(props.watch);
  heartAnim.value = true;
  setTimeout(() => {
    heartAnim.value = false;
  }, 300);
};

const goToWatchInfo = () => {
  router.push(`/watch/${props.watch.id}`);
};
</script>

<template>
  <div @click="goToWatchInfo" class="flex flex-col group cursor-pointer">
    <div class="relative bg-gray-50 dark:bg-theme-card p-8 mb-6 overflow-hidden flex items-center justify-center h-[350px] transition-colors duration-700">
      
      <button @click.stop="handleToggleWishlist" class="absolute top-4 right-4 z-10 text-gray-400 hover:text-theme-gold transition-colors">
        <svg v-if="isWatchInWishlist" 
             :class="['w-5 h-5 text-theme-gold transition-transform duration-300 ease-out', heartAnim ? 'scale-150' : 'scale-100']" 
             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
        </svg>
        <svg v-else 
             :class="['w-5 h-5 transition-transform duration-300 ease-out', heartAnim ? 'scale-150' : 'scale-100']" 
             xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      </button>

      <img :src="watch.thumbnail" :alt="watch.title" class="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-700 ease-out" />
    </div>

    <div class="flex flex-col text-center">
      <span class="text-[9px] uppercase tracking-[0.3em] text-gray-400 dark:text-theme-muted mb-3">{{ watch.brand || 'Rolex' }}</span>
      <h3 class="font-serif text-lg text-gray-900 dark:text-white mb-2 font-light tracking-wide">{{ watch.title }}</h3>
      <p class="text-theme-gold text-sm tracking-widest">${{ watch.price.toLocaleString() }}</p>
    </div>

    <div class="mt-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      
      <button @click.stop="handleAddToCart" 
              :class="[
                'flex-1 py-3 text-[9px] uppercase tracking-[0.2em] transition-all duration-300 border rounded-full border active:scale-95',
                isAddingToBag ? 'bg-theme-gold border-theme-gold text-white dark:text-theme-bg' : 'border-gray-900 rounded-full border dark:border-white text-gray-900 dark:text-white hover:bg-theme-gold hover:border-theme-gold hover:text-white dark:hover:text-theme-bg'
              ]">
        {{ isAddingToBag ? 'Added ✓' : 'Add to Bag' }}
      </button>

      <button @click.stop="handleBuyNow" 
              :class="[
                'flex-1 py-3 text-[9px] uppercase tracking-[0.2em] transition-all duration-300 border rounded-full border  active:scale-95 bg-theme-gold border-theme-gold text-white dark:text-theme-bg hover:opacity-80',
                isBuyingNow ? 'animate-pulse' : ''
              ]">
        {{ isBuyingNow ? 'Wait...' : 'Buy Now' }}
      </button>

    </div>
  </div>
</template>