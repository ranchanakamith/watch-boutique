<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { shopApi, money, type Order } from '../composables/useShopApi';

const { user } = useAuth();
const route = useRoute();
const orders = ref<Order[]>([]);
const error = ref('');
const busy = ref(false);
const nextBefore = ref<number | null>(null);

async function load(more = false) {
  busy.value = true;
  error.value = '';
  try {
    if (!user.value) {
      orders.value = [];
      return;
    }
    const data = await shopApi(`/orders${more ? `?before=${nextBefore.value}` : ''}`);
    orders.value = more ? [...orders.value, ...data.orders] : data.orders;
    nextBefore.value = data.nextBefore;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function cancel(order: Order) {
  if (!confirm(`Are you sure you want to cancel Order #${order.id}? Restocked items will be returned to inventory.`)) return;
  busy.value = true;
  try {
    await shopApi(`/orders/${order.id}/cancel`, 'POST', {});
    await load();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

watch(
  user,
  () => {
    if (user.value) void load();
    else orders.value = [];
  },
  { immediate: true }
);
</script>

<template>
  <div class="max-w-4xl mx-auto py-12 md:py-20 px-4 sm:px-6 animate-fade-in transition-colors duration-700">
    <!-- Header -->
    <div class="text-center mb-12">
      <p class="text-[10px] uppercase tracking-[0.4em] text-theme-gold font-medium mb-3">Client Portal</p>
      <h1 class="font-serif text-3xl md:text-5xl text-gray-900 dark:text-white font-light tracking-wide mb-4">
        Your Order History
      </h1>
      <div class="h-px w-12 bg-theme-gold mx-auto mb-6"></div>
      <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-light max-w-lg mx-auto">
        Review receipts, delivery destinations, payment statuses, and courier tracking details.
      </p>
    </div>

    <!-- Order Placed Success Banner -->
    <div
      v-if="route.query.placed"
      role="status"
      class="mb-8 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-light flex items-center justify-between shadow-sm animate-fade-in"
    >
      <div class="flex items-center gap-3">
        <span class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-bold">✓</span>
        <div>
          <strong class="font-medium block">Order #{{ route.query.placed }} successfully received!</strong>
          <span class="text-emerald-700 dark:text-emerald-300 text-xs">Payment is due upon courier delivery (Cash on Delivery).</span>
        </div>
      </div>
      <RouterLink to="/track-order" class="text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-300 underline font-medium">
        Track &rarr;
      </RouterLink>
    </div>

    <!-- Non-authenticated state -->
    <div v-if="!user" class="text-center py-16 bg-white dark:bg-theme-card/40 border border-gray-100 dark:border-white/10 rounded-2xl p-8">
      <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 text-theme-gold">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
      </div>
      <h3 class="font-serif text-xl text-gray-900 dark:text-white font-light mb-2">Account Required</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 font-light max-w-sm mx-auto mb-6">
        Please sign in with your account credentials above to review your timepiece orders.
      </p>
    </div>

    <!-- Authenticated Orders List -->
    <template v-else>
      <div class="flex items-center justify-between mb-6 pb-3 border-b border-gray-200 dark:border-white/10">
        <span class="text-xs text-gray-500 dark:text-gray-400 font-light">
          {{ orders.length }} {{ orders.length === 1 ? 'order' : 'orders' }} recorded
        </span>
        <button
          :disabled="busy"
          @click="load()"
          class="text-[11px] uppercase tracking-wider text-theme-gold hover:opacity-80 transition-opacity font-medium disabled:opacity-50"
        >
          {{ busy ? 'Refreshing...' : 'Refresh Orders' }}
        </button>
      </div>

      <div v-if="error" role="alert" class="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs mb-6">
        {{ error }}
      </div>

      <!-- Empty state -->
      <div v-if="!busy && !orders.length" class="text-center py-16 bg-white dark:bg-theme-card/30 border border-gray-100 dark:border-white/10 rounded-2xl p-8">
        <p class="font-serif text-xl text-gray-900 dark:text-white font-light mb-2">No Orders Found</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 font-light mb-6">You have not acquired any timepieces yet.</p>
        <RouterLink
          to="/"
          class="inline-block px-6 py-3 rounded-full bg-theme-gold text-white dark:text-theme-bg text-[10px] uppercase tracking-[0.2em] font-medium hover:opacity-90 transition-opacity"
        >
          Explore Collection
        </RouterLink>
      </div>

      <!-- Orders Cards -->
      <div v-else class="space-y-6">
        <article
          v-for="order in orders"
          :key="order.id"
          class="bg-white dark:bg-theme-card/40 border border-gray-100 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-none relative overflow-hidden transition-all duration-700"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 gap-3 mb-4">
            <div>
              <span class="text-[10px] uppercase tracking-widest text-theme-gold font-semibold">Order Reference</span>
              <h3 class="font-serif text-xl text-gray-900 dark:text-white font-light">#{{ order.id }}</h3>
              <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Placed on {{ order.created_at }} UTC</p>
            </div>
            <div class="sm:text-right">
              <span class="text-xl font-serif text-theme-gold font-medium">{{ money(order.total_cents) }}</span>
              <div class="flex items-center gap-2 sm:justify-end mt-1">
                <span
                  class="text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-semibold"
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
                <span class="text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300">
                  {{ order.payment_status }}
                </span>
              </div>
            </div>
          </div>

          <!-- Items list -->
          <div class="py-2 space-y-2 border-b border-gray-100 dark:border-white/5 mb-4 text-xs font-light text-gray-800 dark:text-gray-200">
            <div v-for="(item, idx) in order.items" :key="idx" class="flex justify-between items-center">
              <span>{{ item.quantity }} × {{ item.title }}</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ money(item.unit_cents * item.quantity) }}</span>
            </div>
          </div>

          <!-- Delivery info & Courier tracking -->
          <div class="text-xs text-gray-500 dark:text-gray-400 font-light space-y-1 mb-4">
            <p><strong>Deliver to:</strong> {{ order.shipping.name }}, {{ order.shipping.address }}, {{ order.shipping.city }}, {{ order.shipping.postalCode }}, {{ order.shipping.country }}</p>
            <p v-if="order.tracking" class="text-theme-gold font-medium">
              📦 Courier Tracking Code: <code class="font-mono text-xs bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">{{ order.tracking }}</code>
            </p>
            <p v-else-if="order.status !== 'cancelled'" class="text-[11px] text-gray-400 italic">
              Courier tracking number will be assigned once dispatched.
            </p>
          </div>

          <!-- Cancellation Action -->
          <div v-if="['pending', 'processing'].includes(order.status) && order.payment_status === 'unpaid'" class="pt-2 flex justify-end">
            <button
              :disabled="busy"
              @click="cancel(order)"
              class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Cancel Order
            </button>
          </div>
        </article>

        <button
          v-if="nextBefore"
          :disabled="busy"
          @click="load(true)"
          class="w-full py-3 text-xs uppercase tracking-widest text-center border border-gray-300 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 hover:border-theme-gold transition-colors"
        >
          Load Older Orders
        </button>
      </div>
    </template>
  </div>
</template>
