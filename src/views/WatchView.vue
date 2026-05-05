<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWatches } from '../composables/useWatches';
import { useCart } from '../composables/useCart';
import { useWishlist } from '../composables/useWishlist';

const route = useRoute();
const router = useRouter();

const { watches, fetchWatches } = useWatches();
const { addToCart } = useCart();
const { wishlist, toggleWishlist } = useWishlist();

const watch = computed(() => {
  return watches.value.find(w => w.id === Number(route.params.id));
});

const isWatchInWishlist = computed(() => {
  if (!watch.value) return false;
  return wishlist.value.some(item => item.id === watch.value!.id);
});

// Animation States
const isAddingToBag = ref(false);
const isBuyingNow = ref(false);
const heartAnim = ref(false);

const handleAddToCart = () => {
  if (!watch.value) return;
  addToCart(watch.value);
  isAddingToBag.value = true;
  setTimeout(() => {
    isAddingToBag.value = false;
  }, 1500);
};

const handleBuyNow = () => {
  if (!watch.value) return;
  addToCart(watch.value);
  isBuyingNow.value = true;
  setTimeout(() => {
    isBuyingNow.value = false;
    alert(`Proceeding to Secure Checkout for ${watch.value!.title}...`);
    // FUTURE: router.push('/checkout');
  }, 600);
};

const handleToggleWishlist = () => {
  if (!watch.value) return;
  toggleWishlist(watch.value);
  heartAnim.value = true;
  setTimeout(() => {
    heartAnim.value = false;
  }, 300);
};

onMounted(() => {
  if (watches.value.length === 0) {
    fetchWatches();
  }
});
</script>

<template>
  <div class="w-full">
    
    <Teleport to="body">
      <button @click="router.push('/')" class="fixed top-8 left-8 md:top-12 md:left-16 z-[100] flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-theme-gold transition-colors group">
        <span class="transform group-hover:-translate-x-1 transition-transform duration-300">&larr;</span> 
        Back to Collection
      </button>
    </Teleport>

    <div class="animate-fade-in transition-colors duration-700 max-w-[1200px] mx-auto mt-10 md:mt-20">
      
      <div v-if="watch" class="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 px-4 md:px-0 mt-24">
        
        <div class="relative bg-gray-50 dark:bg-theme-card p-12 flex items-center justify-center min-h-[400px] md:min-h-[600px]">
          <button @click="handleToggleWishlist" class="absolute top-6 right-6 z-10 text-gray-400 hover:text-theme-gold transition-colors">
            <svg v-if="isWatchInWishlist" 
                 :class="['w-6 h-6 text-theme-gold transition-transform duration-300 ease-out', heartAnim ? 'scale-150' : 'scale-100']" 
                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
            </svg>
            <svg v-else 
                 :class="['w-6 h-6 transition-transform duration-300 ease-out', heartAnim ? 'scale-150' : 'scale-100']" 
                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>

          <img :src="watch.thumbnail" :alt="watch.title" class="w-full h-full object-contain drop-shadow-2xl" />
        </div>

        <div class="flex flex-col justify-center">
          <span class="text-[10px] uppercase tracking-[0.4em] text-gray-400 dark:text-theme-muted mb-4">{{ watch.brand || 'Rolex' }}</span>
          <h2 class="font-serif text-3xl md:text-5xl text-gray-900 dark:text-white mb-6 font-light tracking-wide leading-tight">{{ watch.title }}</h2>
          <p class="text-theme-gold text-xl tracking-widest mb-10">${{ watch.price.toLocaleString() }}</p>
          
          <div class="h-[1px] w-full bg-gray-200 dark:bg-white/10 mb-10"></div>
          
          <p class="text-gray-600 dark:text-gray-300 font-light leading-relaxed mb-12 text-sm tracking-wide">
            {{ watch.description }}
          </p>

          <div class="flex flex-col sm:flex-row gap-4 w-full">
            <button @click="handleAddToCart" 
                    :class="[
                      'flex-1 py-4 text-xs uppercase tracking-[0.2em] transition-all duration-300 border active:scale-[0.98]',
                      isAddingToBag ? 'bg-theme-gold border-theme-gold text-white dark:text-theme-bg' : 'bg-transparent border-gray-900 dark:border-white text-gray-900 dark:text-white hover:bg-theme-gold hover:border-theme-gold hover:text-white dark:hover:text-theme-bg'
                    ]">
              {{ isAddingToBag ? 'Added to Bag ✓' : 'Add to Bag' }}
            </button>

            <button @click="handleBuyNow" 
                    :class="[
                      'flex-1 py-4 text-xs uppercase tracking-[0.2em] transition-all duration-300 border active:scale-[0.98] bg-theme-gold border-theme-gold text-white dark:text-theme-bg hover:opacity-80',
                      isBuyingNow ? 'animate-pulse' : ''
                    ]">
              {{ isBuyingNow ? 'Processing...' : 'Buy Now' }}
            </button>
          </div>

        </div>

      </div>

      <div v-else class="text-center py-32">
        <p class="text-gray-500 uppercase tracking-widest text-sm">Timepiece not found.</p>
      </div>

    </div>
  </div>
</template>