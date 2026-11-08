<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useCart } from '../composables/useCart';
import { shopApi, money, salePrice } from '../composables/useShopApi';

const { user } = useAuth();
const { cart, clearCart, removeFromCart, setQuantity, cartTotal } = useCart();
const router = useRouter();

const shipping = ref({
  name: user.value?.name || '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  country: ''
});

const openAuthModal = (mode: 'login' | 'register') => {
  const event = new CustomEvent('open-auth-modal', { detail: { mode } });
  window.dispatchEvent(event);
};
const isAuthenticated = computed(() => !!user.value);
const busy = ref(false);
const error = ref('');
let requestKey = crypto.randomUUID();

watch(
  [shipping, cart],
  () => {
    requestKey = crypto.randomUUID();
  },
  { deep: true }
);

const canOrder = computed(() => user.value && cart.value.length > 0 && !busy.value);

async function placeOrder() {
  if (!canOrder.value) return;
  busy.value = true;
  error.value = '';
  try {
    const order = await shopApi('/orders', 'POST', {
      requestKey,
      shipping: shipping.value,
      items: cart.value.map(i => ({ productId: i.id, quantity: i.quantity }))
    });
    clearCart();
    await router.push(`/orders?placed=${order.id}`);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

function handleImageError(e: Event) {
  (e.target as HTMLImageElement).src = '/sample-watch.svg';
}
</script>

<template>
  <div class="max-w-6xl mx-auto py-8 sm:py-12 md:py-20 px-3 sm:px-6 animate-fade-in transition-colors duration-700">
    <!-- Header -->
    <div class="text-center mb-8 sm:mb-12 md:mb-16">
      <p class="text-[10px] uppercase tracking-[0.4em] text-theme-gold font-medium mb-3">
        Bespoke Acquisition
      </p>
      <h1 class="font-serif text-2xl sm:text-4xl md:text-5xl text-gray-900 dark:text-white font-light tracking-wide mb-4">
        Checkout &amp; Delivery
      </h1>
      <div class="h-px w-12 bg-theme-gold mx-auto mb-6"></div>
      <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-light max-w-md mx-auto">
        Complete your delivery coordinates. Payment is collected upon courier inspection at your doorstep.
      </p>
    </div>

    <!-- State 1: Unauthenticated Client -->
    <div
      v-if="!user"
      class="text-center py-12 sm:py-16 bg-white dark:bg-theme-card/40 border border-gray-100 dark:border-white/10 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto shadow-sm dark:shadow-none"
    >
      <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 text-theme-gold">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h3 class="font-serif text-xl sm:text-2xl text-gray-900 dark:text-white font-light mb-2">Sign In Required</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 font-light max-w-sm mx-auto mb-6">
        To ensure order privacy, tracking, and receipt generation, please sign in or create an account to proceed.
      </p>
      <button
        @click="openAuthModal('login')"
        class="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-theme-gold border border-theme-gold text-white dark:text-theme-bg text-[10px] uppercase tracking-[0.2em] font-medium hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
      >
        Sign In &rarr;
      </button>
    </div>

    <!-- State 2: Empty Cart -->
    <div
      v-else-if="!cart.length"
      class="text-center py-16 sm:py-20 bg-white dark:bg-theme-card/30 border border-gray-100 dark:border-white/10 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto shadow-sm dark:shadow-none"
    >
      <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 text-theme-gold">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
        </svg>
      </div>
      <h3 class="font-serif text-xl sm:text-2xl text-gray-900 dark:text-white font-light mb-2">Your Bag is Empty</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 font-light mb-6">
        You haven't selected any timepieces for acquisition yet.
      </p>
      <RouterLink
        to="/"
        class="inline-block px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-theme-gold border border-theme-gold text-white dark:text-theme-bg text-[10px] uppercase tracking-[0.2em] font-medium hover:opacity-90 active:scale-95 transition-all shadow-md"
      >
        Explore Timepieces
      </RouterLink>
    </div>

    <!-- State 3: Active Checkout Columns -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
      
      <!-- Left Column: Delivery Coordinates Form (7 cols) -->
      <div class="lg:col-span-7">
        <div class="bg-white dark:bg-theme-card/40 border border-gray-100 dark:border-white/10 rounded-2xl p-5 sm:p-8 md:p-10 relative overflow-hidden shadow-sm dark:shadow-none transition-all duration-700">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-theme-gold to-transparent opacity-60"></div>
          
          <span class="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-theme-muted font-medium block mb-2">
            Step 1 of 2
          </span>
          <h2 class="font-serif text-2xl text-gray-900 dark:text-white font-light tracking-wide mb-8">
            Delivery Coordinates
          </h2>

          <form @submit.prevent="placeOrder" class="space-y-6">
            <fieldset :disabled="busy" class="space-y-5">
              
              <!-- Full Name -->
              <div>
                <label class="block text-[10px] uppercase tracking-[0.25em] text-gray-600 dark:text-gray-300 font-medium mb-1.5">
                  Recipient Name <span class="text-theme-gold">*</span>
                </label>
                <input
                  v-model="shipping.name"
                  autocomplete="name"
                  required
                  maxlength="100"
                  placeholder="e.g. Lord Alexander Wright"
                  class="w-full text-xs font-light px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all"
                />
              </div>

              <!-- Phone -->
              <div>
                <label class="block text-[10px] uppercase tracking-[0.25em] text-gray-600 dark:text-gray-300 font-medium mb-1.5">
                  Contact Telephone / Mobile <span class="text-theme-gold">*</span>
                </label>
                <input
                  v-model="shipping.phone"
                  type="tel"
                  autocomplete="tel"
                  required
                  maxlength="50"
                  placeholder="e.g. +94 77 142 5282"
                  class="w-full text-xs font-light px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all"
                />
              </div>

              <!-- Street Address -->
              <div>
                <label class="block text-[10px] uppercase tracking-[0.25em] text-gray-600 dark:text-gray-300 font-medium mb-1.5">
                  Street Address &amp; Suite <span class="text-theme-gold">*</span>
                </label>
                <textarea
                  v-model="shipping.address"
                  autocomplete="street-address"
                  required
                  rows="3"
                  maxlength="300"
                  placeholder="e.g. 503/2 Kendakaduwa, Royal Pavilion Road"
                  class="w-full text-xs font-light px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all leading-relaxed"
                ></textarea>
              </div>

              <!-- City, Postal Code, Country in Responsive Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-[10px] uppercase tracking-[0.25em] text-gray-600 dark:text-gray-300 font-medium mb-1.5">
                    City <span class="text-theme-gold">*</span>
                  </label>
                  <input
                    v-model="shipping.city"
                    autocomplete="address-level2"
                    required
                    maxlength="100"
                    placeholder="e.g. Peradeniya"
                    class="w-full text-xs font-light px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all"
                  />
                </div>

                <div>
                  <label class="block text-[10px] uppercase tracking-[0.25em] text-gray-600 dark:text-gray-300 font-medium mb-1.5">
                    Postal Code <span class="text-theme-gold">*</span>
                  </label>
                  <input
                    v-model="shipping.postalCode"
                    autocomplete="postal-code"
                    required
                    maxlength="30"
                    placeholder="e.g. 20400"
                    class="w-full text-xs font-light px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all"
                  />
                </div>

                <div>
                  <label class="block text-[10px] uppercase tracking-[0.25em] text-gray-600 dark:text-gray-300 font-medium mb-1.5">
                    Country <span class="text-theme-gold">*</span>
                  </label>
                  <input
                    v-model="shipping.country"
                    autocomplete="country-name"
                    required
                    maxlength="100"
                    placeholder="e.g. Sri Lanka"
                    class="w-full text-xs font-light px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all"
                  />
                </div>
              </div>
            </fieldset>

            <!-- Payment Protocol Banner -->
            <div class="mt-8 p-5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 space-y-2">
              <div class="flex items-center gap-2 text-theme-gold text-xs uppercase tracking-widest font-semibold">
                <span>✦</span>
                <span>Payment Method: Cash on Delivery (COD)</span>
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                Settlement in full is rendered upon courier delivery. Priority insured handling is <strong>complimentary</strong>. No undisclosed processing fees or tariffs are applied.
              </p>
            </div>

            <!-- Error message banner -->
            <div
              v-if="error"
              role="alert"
              class="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-light flex items-center gap-3 animate-fade-in"
            >
              <svg class="w-4 h-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span>{{ error }}</span>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="!canOrder"
              class="w-full py-4 rounded-full bg-theme-gold border border-theme-gold text-white dark:text-theme-bg font-medium uppercase tracking-[0.25em] text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg
                v-if="busy"
                class="w-4 h-4 animate-spin text-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span>{{ busy ? 'Registering order...' : 'Confirm Cash on Delivery Acquisition' }}</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Right Column: Order Summary & Selection (5 cols) -->
      <div class="lg:col-span-5 space-y-6">
        <div class="bg-white dark:bg-theme-card/40 border border-gray-100 dark:border-white/10 rounded-2xl p-5 sm:p-8 md:p-10 relative overflow-hidden shadow-sm dark:shadow-none transition-all duration-700">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-theme-gold to-transparent opacity-60"></div>
          
          <span class="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-theme-muted font-medium block mb-2">
            Acquisition Summary
          </span>
          <h3 class="font-serif text-2xl text-gray-900 dark:text-white font-light tracking-wide mb-6">
            Your Selection ({{ cart.length }})
          </h3>

          <!-- Items list -->
          <div class="divide-y divide-gray-100 dark:divide-white/5 max-h-96 overflow-y-auto mb-6 pr-1">
            <div
              v-for="item in cart"
              :key="item.id"
              class="py-4 flex items-center gap-4 group"
            >
              <!-- Thumbnail -->
              <div class="w-16 h-16 shrink-0 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-100 dark:border-white/10 p-1 flex items-center justify-center overflow-hidden">
                <img
                  :src="item.thumbnail"
                  :alt="item.title"
                  @error="handleImageError"
                  class="w-full h-full object-contain transform group-hover:scale-105 transition-transform"
                />
              </div>

              <!-- Details -->
              <div class="min-w-0 flex-1">
                <span class="text-[9px] uppercase tracking-widest text-theme-gold font-medium block mb-0.5">
                  {{ item.brand || 'Boutique' }}
                </span>
                <h4 class="font-serif text-sm text-gray-900 dark:text-white font-medium truncate mb-1" :title="item.title">
                  {{ item.title }}
                </h4>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-900 dark:text-white font-medium">
                    {{ money(salePrice(item) * 100) }}
                  </span>
                  <span v-if="item.discountPercentage > 0" class="text-[10px] text-gray-400 line-through">
                    {{ money(Math.round(item.price * 100)) }}
                  </span>
                </div>
              </div>

              <!-- Quantity Controls & Remove -->
              <div class="flex flex-col items-end gap-2 shrink-0">
                <div class="flex items-center border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-black/30 text-xs">
                  <button
                    :disabled="busy || item.quantity <= 1"
                    @click="setQuantity(item.id, item.quantity - 1)"
                    class="px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30"
                  >
                    -
                  </button>
                  <span class="px-2.5 py-1 text-gray-900 dark:text-white font-medium">
                    {{ item.quantity }}
                  </span>
                  <button
                    :disabled="busy || item.quantity >= Math.min(item.stock, 99)"
                    @click="setQuantity(item.id, item.quantity + 1)"
                    class="px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <button
                  :disabled="busy"
                  @click="removeFromCart(item.id)"
                  class="text-[10px] uppercase tracking-wider text-gray-400 hover:text-red-500 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          <!-- Total Calculations -->
          <div class="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5 text-xs font-light">
            <div class="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Timepieces Subtotal:</span>
              <span class="text-gray-900 dark:text-white font-medium">{{ money(Math.round(cartTotal * 100)) }}</span>
            </div>
            <div class="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Insured Priority Courier:</span>
              <span class="text-theme-gold font-medium uppercase tracking-wider text-[11px]">Complimentary</span>
            </div>
            <div class="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Import Tariffs &amp; Duties:</span>
              <span class="text-gray-900 dark:text-white font-medium">Included</span>
            </div>
            <div class="flex justify-between items-baseline pt-4 border-t border-gray-200 dark:border-white/10">
              <span class="text-sm font-serif uppercase tracking-widest text-gray-900 dark:text-white">Total Settlement:</span>
              <strong class="font-serif text-2xl text-theme-gold font-normal">
                {{ money(Math.round(cartTotal * 100)) }}
              </strong>
            </div>
          </div>

          <!-- Reassurance points -->
          <div class="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 space-y-2 text-[11px] text-gray-400 dark:text-gray-500 font-light">
            <div class="flex items-center gap-2">
              <span class="text-theme-gold">✦</span>
              <span>100% Certified Authentic Horology</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-theme-gold">✦</span>
              <span>Tamper-Proof Insured Courier Transit</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-theme-gold">✦</span>
              <span>Inspect Condition Prior to Cash Handover</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>
