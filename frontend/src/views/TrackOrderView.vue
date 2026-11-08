<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { shopApi, money, type Order } from '../composables/useShopApi';

const { user } = useAuth();
const orderNumber = ref('');
const busy = ref(false);
const error = ref('');
const order = ref<Order | null>(null);
let generation = 0;

watch(
  () => user.value?.id,
  () => {
    generation++;
    order.value = null;
    error.value = '';
    busy.value = false;
  }
);

async function track() {
  const current = ++generation;
  order.value = null;
  error.value = '';
  const id = orderNumber.value.trim().replace(/^#/, '');
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    error.value = 'Please enter a valid numeric order number (e.g. 1 or 2).';
    return;
  }
  busy.value = true;
  try {
    const result = await shopApi(`/orders/${id}`);
    if (current === generation) order.value = result;
  } catch (e) {
    if (current === generation) error.value = (e as Error).message;
  } finally {
    if (current === generation) busy.value = false;
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-12 md:py-20 px-4 sm:px-6 animate-fade-in transition-colors duration-700">
    <!-- Header -->
    <div class="text-center mb-12">
      <p class="text-[10px] uppercase tracking-[0.4em] text-theme-gold font-medium mb-3">Concierge Logistics</p>
      <h1 class="font-serif text-3xl md:text-5xl text-gray-900 dark:text-white font-light tracking-wide mb-4">
        Track Your Timepiece
      </h1>
      <div class="h-px w-12 bg-theme-gold mx-auto mb-6"></div>
      <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-light max-w-md mx-auto">
        Monitor the real-time fulfillment status and courier tracking reference for your acquisition.
      </p>
    </div>

    <!-- Sign-in Required Banner -->
    <div v-if="!user" class="text-center py-16 bg-white dark:bg-theme-card/40 border border-gray-100 dark:border-white/10 rounded-2xl p-8">
      <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 text-theme-gold">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      </div>
      <h3 class="font-serif text-xl text-gray-900 dark:text-white font-light mb-2">Authentication Required</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 font-light max-w-sm mx-auto mb-6">
        Sign in to your account using the navigation bar above to view secure fulfillment details.
      </p>
    </div>

    <!-- Tracking Input Form -->
    <div v-else class="space-y-8">
      <div class="bg-white dark:bg-theme-card/40 border border-gray-100 dark:border-white/10 rounded-2xl p-8 shadow-sm dark:shadow-none relative overflow-hidden transition-all duration-700">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-theme-gold to-transparent opacity-60"></div>
        
        <form @submit.prevent="track" class="space-y-6">
          <div>
            <label for="tracking-order" class="block text-[10px] uppercase tracking-[0.25em] text-gray-600 dark:text-gray-300 font-medium mb-2">
              Order Number <span class="text-theme-gold">*</span>
            </label>
            <div class="flex flex-col sm:flex-row gap-3">
              <input
                id="tracking-order"
                v-model="orderNumber"
                required
                inputmode="numeric"
                maxlength="20"
                placeholder="e.g. 1"
                class="flex-1 text-xs font-light px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all"
              />
              <button
                type="submit"
                :disabled="busy"
                class="px-8 py-3.5 rounded-xl bg-theme-gold border border-theme-gold text-white dark:text-theme-bg font-medium uppercase tracking-[0.2em] text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                {{ busy ? 'Locating...' : 'Track Order' }}
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-gray-400 font-light pt-2">
            <span>Forgot your order number?</span>
            <RouterLink to="/orders" class="text-theme-gold hover:underline">
              View all orders in your account &rarr;
            </RouterLink>
          </div>
        </form>
      </div>

      <!-- Error alert -->
      <div v-if="error" role="alert" class="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-light flex items-center gap-2 animate-fade-in">
        <svg class="w-4 h-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        <span>{{ error }}</span>
      </div>

      <!-- Result Card -->
      <article
        v-if="order"
        class="bg-white dark:bg-theme-card/40 border border-gray-100 dark:border-white/10 rounded-2xl p-8 shadow-sm dark:shadow-none space-y-6 animate-fade-in"
      >
        <div class="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
          <div>
            <span class="text-[10px] uppercase tracking-widest text-theme-gold font-semibold">Fulfillment Status</span>
            <h2 class="font-serif text-2xl text-gray-900 dark:text-white font-light">Order #{{ order.id }}</h2>
          </div>
          <span
            class="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-semibold"
            :class="{
              'bg-amber-500/20 text-amber-600 dark:text-amber-400': order.status === 'pending',
              'bg-blue-500/20 text-blue-600 dark:text-blue-400': order.status === 'processing',
              'bg-purple-500/20 text-purple-600 dark:text-purple-400': order.status === 'shipped',
              'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400': order.status === 'delivered',
              'bg-red-500/20 text-red-500': order.status === 'cancelled'
            }"
          >
            {{ order.status }}
          </span>
        </div>

        <!-- Timeline steps -->
        <div class="grid grid-cols-4 gap-2 text-center text-[10px] uppercase tracking-wider font-medium">
          <div :class="['p-2 rounded-lg border', ['pending','processing','shipped','delivered'].includes(order.status) ? 'border-theme-gold text-theme-gold bg-amber-500/5' : 'border-gray-200 dark:border-white/10 text-gray-400']">
            1. Placed
          </div>
          <div :class="['p-2 rounded-lg border', ['processing','shipped','delivered'].includes(order.status) ? 'border-theme-gold text-theme-gold bg-amber-500/5' : 'border-gray-200 dark:border-white/10 text-gray-400']">
            2. Processing
          </div>
          <div :class="['p-2 rounded-lg border', ['shipped','delivered'].includes(order.status) ? 'border-theme-gold text-theme-gold bg-amber-500/5' : 'border-gray-200 dark:border-white/10 text-gray-400']">
            3. Dispatched
          </div>
          <div :class="['p-2 rounded-lg border', order.status === 'delivered' ? 'border-emerald-500 text-emerald-600 bg-emerald-500/5' : 'border-gray-200 dark:border-white/10 text-gray-400']">
            4. Delivered
          </div>
        </div>

        <!-- Details -->
        <div class="space-y-3 text-xs text-gray-600 dark:text-gray-300 font-light pt-2">
          <div class="flex justify-between">
            <span class="text-gray-400">Payment Status:</span>
            <strong class="font-normal">{{ order.payment_status === 'paid' ? 'Paid in Full' : 'Pending (Cash on Delivery)' }}</strong>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Total Amount:</span>
            <strong class="text-theme-gold font-medium">{{ money(order.total_cents) }}</strong>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Courier Tracking Reference:</span>
            <strong v-if="order.tracking" class="font-mono text-theme-gold">{{ order.tracking }}</strong>
            <span v-else class="text-gray-400 italic">Pending carrier allocation</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Destination:</span>
            <span>{{ order.shipping.city }}, {{ order.shipping.country }}</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
