<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { shopApi, money, salePrice, type Order } from '../composables/useShopApi';
import type { Watch } from '../types/watch';

const { user } = useAuth();
const isAdmin = computed(() => user.value?.role === 'admin');

const tab = ref<'overview' | 'products' | 'orders'>('products');
const busy = ref(false);
const error = ref('');
const message = ref('');
const search = ref('');

interface Summary {
  orders: number;
  bookedCents: number;
  paidCents: number;
  awaitingShipment: number;
  products: number;
  units: number;
  lowStock: { id: number; title: string; stock: number }[];
  dailySales: { day: string; cents: number; orders: number }[];
  storage: { usedBytes: number; databaseLimitBytes: number; budgetBytes: number };
}

const summary = ref<Summary | null>(null);
const products = ref<Watch[]>([]);
const orders = ref<Order[]>([]);
const nextBefore = ref<number | null>(null);

// Modal and Edit State
const isModalOpen = ref(false);
watch(isModalOpen, (open, _previous, onCleanup) => {
  if (!open) return;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !busy.value) closeModal();
  };
  document.addEventListener('keydown', onKeydown);
  onCleanup(() => {
    document.body.style.overflow = previousOverflow;
    document.removeEventListener('keydown', onKeydown);
  });
});
const editing = ref<number | null>(null);
const blank = () => ({
  title: '',
  brand: '',
  description: '',
  category: 'mens-watches',
  price: 0,
  stock: 10,
  discountPercentage: 0,
  rating: 4.8,
  thumbnail: '/sample-watch.svg',
  images: ['/sample-watch.svg']
});
const form = ref(blank());
const imageLines = ref('/sample-watch.svg');

// Inline updates tracking
const updatingIds = ref<Record<number, boolean>>({});
const updatedIds = ref<Record<number, boolean>>({});
const activeOfferDropdown = ref<number | null>(null);
const customOfferInput = ref<number | ''>('');

// Filters and Sorting
const categoryFilter = ref('all');
const stockFilter = ref('all');
const offerFilter = ref('all');
const sortBy = ref('id-desc');
const orderStatusFilter = ref('all');

const counts = computed(() => {
  const all = products.value;
  return {
    total: all.length,
    units: all.reduce((sum, p) => sum + (p.stock || 0), 0),
    onOffer: all.filter(p => (p.discountPercentage || 0) > 0).length,
    lowStock: all.filter(p => p.stock > 0 && p.stock <= 5).length,
    outOfStock: all.filter(p => p.stock <= 0).length
  };
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = products.value.filter(p => {
    if (q && !`${p.title} ${p.brand} ${p.description || ''}`.toLowerCase().includes(q)) {
      return false;
    }
    if (categoryFilter.value !== 'all' && p.category !== categoryFilter.value) {
      return false;
    }
    if (stockFilter.value === 'low' && (p.stock > 5 || p.stock <= 0)) return false;
    if (stockFilter.value === 'out' && p.stock > 0) return false;
    if (stockFilter.value === 'in' && p.stock <= 0) return false;
    if (offerFilter.value === 'offer' && (!p.discountPercentage || p.discountPercentage <= 0)) return false;
    if (offerFilter.value === 'regular' && p.discountPercentage > 0) return false;
    return true;
  });

  return list.sort((a, b) => {
    if (sortBy.value === 'price-asc') return a.price - b.price;
    if (sortBy.value === 'price-desc') return b.price - a.price;
    if (sortBy.value === 'stock-asc') return a.stock - b.stock;
    if (sortBy.value === 'stock-desc') return b.stock - a.stock;
    if (sortBy.value === 'discount-desc') return (b.discountPercentage || 0) - (a.discountPercentage || 0);
    if (sortBy.value === 'title-asc') return a.title.localeCompare(b.title);
    return b.id - a.id;
  });
});

const filteredOrders = computed(() => {
  if (orderStatusFilter.value === 'all') return orders.value;
  return orders.value.filter(o => o.status === orderStatusFilter.value);
});

async function load() {
  if (!isAdmin.value) return;
  busy.value = true;
  error.value = '';
  try {
    summary.value = await shopApi('/admin/summary');
    const all: Watch[] = [];
    let total = 0;
    do {
      const data = await shopApi(`/products?limit=100&skip=${all.length}`);
      all.push(...data.products);
      total = data.total;
      if (!data.products.length) break;
    } while (all.length < total);
    products.value = all;
    const data = await shopApi('/admin/orders');
    orders.value = data.orders;
    nextBefore.value = data.nextBefore;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

function openCreateModal() {
  editing.value = null;
  form.value = blank();
  imageLines.value = form.value.images.join('\n');
  isModalOpen.value = true;
}

function openEditModal(product: Watch) {
  editing.value = product.id;
  const { id, ...fields } = product;
  form.value = { ...fields, images: [...fields.images] };
  imageLines.value = form.value.images.join('\n');
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  editing.value = null;
}

async function save() {
  busy.value = true;
  error.value = '';
  message.value = '';
  try {
    const images = imageLines.value
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    if (!images.length) images.push(form.value.thumbnail);

    await shopApi(
      editing.value ? `/products/${editing.value}` : '/products',
      editing.value ? 'PATCH' : 'POST',
      { ...form.value, images }
    );
    message.value = editing.value ? 'Watch details updated successfully.' : 'New timepiece added to boutique.';
    closeModal();
    await load();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function remove(product: Watch) {
  if (!confirm(`Are you sure you want to remove "${product.title}"? Existing customer order receipts will be preserved.`)) return;
  busy.value = true;
  error.value = '';
  try {
    await shopApi(`/products/${product.id}`, 'DELETE');
    if (editing.value === product.id) closeModal();
    await load();
    message.value = `Removed "${product.title}" from store.`;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

// Quick Stock Increment / Decrement
async function quickUpdateStock(product: Watch, newStock: number) {
  if (newStock < 0) return;
  updatingIds.value[product.id] = true;
  error.value = '';
  const prevStock = product.stock;
  product.stock = newStock; // optimistic update

  try {
    await shopApi(`/products/${product.id}`, 'PATCH', { stock: newStock });
    updatedIds.value[product.id] = true;
    setTimeout(() => {
      delete updatedIds.value[product.id];
    }, 1200);
    // Refresh overview silently
    shopApi('/admin/summary').then(s => (summary.value = s)).catch(() => {});
  } catch (e) {
    product.stock = prevStock; // rollback
    error.value = (e as Error).message;
  } finally {
    delete updatingIds.value[product.id];
  }
}

// Quick Offer / Discount update
async function quickUpdateDiscount(product: Watch, discountPercentage: number) {
  const valid = Math.max(0, Math.min(100, Math.round(discountPercentage)));
  updatingIds.value[product.id] = true;
  error.value = '';
  const prevDiscount = product.discountPercentage;
  product.discountPercentage = valid; // optimistic update

  try {
    await shopApi(`/products/${product.id}`, 'PATCH', { discountPercentage: valid });
    updatedIds.value[product.id] = true;
    setTimeout(() => {
      delete updatedIds.value[product.id];
    }, 1200);
    activeOfferDropdown.value = null;
    customOfferInput.value = '';
  } catch (e) {
    product.discountPercentage = prevDiscount; // rollback
    error.value = (e as Error).message;
  } finally {
    delete updatingIds.value[product.id];
  }
}

function toggleOfferDropdown(productId: number, currentDiscount: number) {
  if (activeOfferDropdown.value === productId) {
    activeOfferDropdown.value = null;
  } else {
    activeOfferDropdown.value = productId;
    customOfferInput.value = currentDiscount > 0 ? currentDiscount : '';
  }
}

// Orders management
const nextStatus: Record<string, string> = { pending: 'processing', processing: 'shipped', shipped: 'delivered' };

async function updateOrder(order: Order, body: object) {
  busy.value = true;
  error.value = '';
  try {
    await shopApi(`/admin/orders/${order.id}`, 'PATCH', body);
    await load();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function moreOrders() {
  busy.value = true;
  try {
    const data = await shopApi(`/admin/orders?before=${nextBefore.value}`);
    orders.value.push(...data.orders);
    nextBefore.value = data.nextBefore;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

function handleImageError(e: Event) {
  (e.target as HTMLImageElement).src = '/sample-watch.svg';
}

watch(
  isAdmin,
  () => {
    if (isAdmin.value) void load();
    else {
      summary.value = null;
      orders.value = [];
      products.value = [];
    }
  },
  { immediate: true }
);
</script>

<template>
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-gray-900 dark:text-gray-100">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-gray-200 dark:border-white/10 gap-4">
      <div>
        <p class="text-[10px] uppercase tracking-[0.3em] text-theme-gold font-semibold mb-1">Boutique Management</p>
        <h1 class="font-serif text-3xl md:text-4xl font-light text-gray-900 dark:text-white">Administrator Portal</h1>
      </div>
      <div v-if="isAdmin" class="flex items-center gap-3">
        <button
          @click="openCreateModal"
          class="flex items-center gap-2 bg-theme-gold hover:opacity-90 text-white dark:text-theme-bg px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest font-semibold transition-all shadow-sm active:scale-95"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Add New Watch
        </button>
        <button
          :disabled="busy"
          @click="load"
          class="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-3.5 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          title="Refresh Data"
        >
          <svg :class="['w-4 h-4', busy ? 'animate-spin text-theme-gold' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span class="hidden sm:inline">{{ busy ? 'Updating...' : 'Refresh' }}</span>
        </button>
      </div>
    </div>

    <!-- Non-admin Notice -->
    <div v-if="!isAdmin" class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-8 text-center max-w-2xl mx-auto my-12">
      <div class="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mx-auto mb-4 text-theme-gold">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      </div>
      <h3 class="font-serif text-xl font-medium text-amber-900 dark:text-amber-200 mb-2">Administrator Access Required</h3>
      <p class="text-sm text-amber-800/90 dark:text-amber-300/80 mb-6 leading-relaxed">
        Sign in with an administrator account to manage watches, inventory, special offers, and store orders.
      </p>
      <div class="bg-white dark:bg-black/40 border border-amber-200/60 dark:border-amber-800/60 rounded-lg p-4 text-xs font-mono text-left max-w-lg mx-auto text-gray-700 dark:text-gray-300">
        <p class="text-[10px] text-gray-400 uppercase font-sans mb-1 font-semibold">How to grant admin role:</p>
        <code>cd backend<br/>npm run admin -- your-email@example.com</code>
      </div>
    </div>

    <!-- Admin Content -->
    <template v-else>
      <!-- Navigation Tabs -->
      <div class="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-white/10 pb-2 overflow-x-auto whitespace-nowrap">
        <button
          @click="tab = 'products'"
          :class="[
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest font-semibold transition-all',
            tab === 'products'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
          ]"
        >
          <span>⌚ Watches & Inventory</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full" :class="tab === 'products' ? 'bg-white/20 dark:bg-black/20 text-inherit' : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300'">
            {{ products.length }}
          </span>
        </button>

        <button
          @click="tab = 'overview'"
          :class="[
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest font-semibold transition-all',
            tab === 'overview'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
          ]"
        >
          <span>📊 Overview & Analytics</span>
        </button>

        <button
          @click="tab = 'orders'"
          :class="[
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest font-semibold transition-all',
            tab === 'orders'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
          ]"
        >
          <span>📦 Orders</span>
          <span v-if="summary?.awaitingShipment" class="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {{ summary.awaitingShipment }}
          </span>
        </button>
      </div>

      <!-- Feedback Messages -->
      <div v-if="error" role="alert" class="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
          <span>{{ error }}</span>
        </div>
        <button @click="error = ''" class="text-red-500 hover:text-red-700 text-xs">Dismiss</button>
      </div>

      <div v-if="message" role="status" class="mb-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          <span>{{ message }}</span>
        </div>
        <button @click="message = ''" class="text-emerald-600 hover:text-emerald-800 text-xs">Dismiss</button>
      </div>

      <!-- ============================================== -->
      <!-- TAB 1: WATCHES & INVENTORY                     -->
      <!-- ============================================== -->
      <div v-if="tab === 'products'" class="space-y-6">
        <!-- Quick Stats Pill Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div class="bg-gray-50 dark:bg-theme-card p-3.5 rounded-xl border border-gray-200 dark:border-white/5">
            <span class="text-[10px] uppercase tracking-wider text-gray-500 dark:text-theme-muted block mb-1">Total Models</span>
            <span class="text-xl font-serif text-gray-900 dark:text-white font-medium">{{ counts.total }}</span>
          </div>
          <div class="bg-gray-50 dark:bg-theme-card p-3.5 rounded-xl border border-gray-200 dark:border-white/5">
            <span class="text-[10px] uppercase tracking-wider text-gray-500 dark:text-theme-muted block mb-1">Stock Units</span>
            <span class="text-xl font-serif text-theme-gold font-medium">{{ counts.units }}</span>
          </div>
          <div class="bg-gray-50 dark:bg-theme-card p-3.5 rounded-xl border border-gray-200 dark:border-white/5">
            <span class="text-[10px] uppercase tracking-wider text-gray-500 dark:text-theme-muted block mb-1">Active Offers</span>
            <span class="text-xl font-serif text-amber-600 dark:text-amber-400 font-medium">{{ counts.onOffer }}</span>
          </div>
          <div class="bg-gray-50 dark:bg-theme-card p-3.5 rounded-xl border border-gray-200 dark:border-white/5">
            <span class="text-[10px] uppercase tracking-wider text-gray-500 dark:text-theme-muted block mb-1">Low Stock (≤5)</span>
            <span class="text-xl font-serif text-orange-600 dark:text-orange-400 font-medium">{{ counts.lowStock }}</span>
          </div>
          <div class="bg-gray-50 dark:bg-theme-card p-3.5 rounded-xl border border-gray-200 dark:border-white/5 col-span-2 sm:col-span-1">
            <span class="text-[10px] uppercase tracking-wider text-gray-500 dark:text-theme-muted block mb-1">Out of Stock</span>
            <span class="text-xl font-serif font-medium" :class="counts.outOfStock ? 'text-red-500' : 'text-emerald-500'">{{ counts.outOfStock }}</span>
          </div>
        </div>

        <!-- Filter and Search Toolbar -->
        <div class="bg-gray-50 dark:bg-theme-card p-4 rounded-xl border border-gray-200 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <!-- Search Input -->
          <div class="relative flex-1 max-w-md">
            <svg class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input
              v-model="search"
              type="text"
              placeholder="Search watch title, brand, description..."
              class="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-theme-gold"
            />
            <button v-if="search" @click="search = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">&times;</button>
          </div>

          <!-- Filter Pills & Sorting -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Stock Filter -->
            <select
              v-model="stockFilter"
              class="text-xs bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-theme-gold"
            >
              <option value="all">Stock: All</option>
              <option value="in">In Stock Only</option>
              <option value="low">Low Stock (≤ 5)</option>
              <option value="out">Out of Stock (0)</option>
            </select>

            <!-- Category Filter -->
            <select
              v-model="categoryFilter"
              class="text-xs bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-theme-gold"
            >
              <option value="all">Category: All</option>
              <option value="mens-watches">Men's Watches</option>
              <option value="womens-watches">Women's Watches</option>
              <option value="unisex-watches">Unisex Watches</option>
            </select>

            <!-- Offer Filter -->
            <select
              v-model="offerFilter"
              class="text-xs bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-theme-gold"
            >
              <option value="all">Offers: All</option>
              <option value="offer">On Offer (Discounted)</option>
              <option value="regular">Regular Price Only</option>
            </select>

            <!-- Sort By -->
            <select
              v-model="sortBy"
              class="text-xs bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-theme-gold"
            >
              <option value="id-desc">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock-asc">Stock: Low to High</option>
              <option value="stock-desc">Stock: High to Low</option>
              <option value="discount-desc">Highest Discount</option>
              <option value="title-asc">Title: A to Z</option>
            </select>
          </div>
        </div>

        <!-- Inventory List / Table -->
        <div class="bg-white dark:bg-theme-card rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
          <div v-if="!filtered.length" class="p-12 text-center text-gray-400">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
            <p class="text-sm font-medium">No matching timepieces found.</p>
            <p class="text-xs text-gray-500 mt-1">Try adjusting your search query or filters.</p>
          </div>

          <div v-else class="divide-y divide-gray-200 dark:divide-white/5">
            <div
              v-for="product in filtered"
              :key="product.id"
              class="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors"
            >
              <!-- Left: Photo & Details -->
              <div class="flex items-center gap-4 min-w-0 flex-1">
                <!-- Watch Photo with fallback and preview -->
                <div class="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-gray-50 dark:bg-black/30 rounded-lg p-1.5 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden">
                  <img
                    :src="product.thumbnail"
                    :alt="product.title"
                    loading="lazy"
                    @error="handleImageError"
                    class="w-full h-full object-contain transform hover:scale-110 transition-transform duration-300"
                  />
                  <!-- Small Stock Badge on Image -->
                  <span
                    v-if="product.stock <= 0"
                    class="absolute bottom-1 right-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded uppercase tracking-wider"
                  >
                    Out
                  </span>
                  <span
                    v-else-if="product.stock <= 5"
                    class="absolute bottom-1 right-1 bg-amber-500 text-white text-[8px] font-bold px-1 rounded"
                  >
                    {{ product.stock }}
                  </span>
                </div>

                <!-- Info -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap mb-1">
                    <span class="text-[9px] uppercase tracking-widest text-theme-gold font-semibold">{{ product.brand }}</span>
                    <span class="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                      {{ product.category.replace('-', ' ') }}
                    </span>
                    <span v-if="product.discountPercentage > 0" class="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      🏷️ {{ Math.round(product.discountPercentage) }}% OFF
                    </span>
                  </div>

                  <h3 class="font-serif text-base sm:text-lg text-gray-900 dark:text-white font-medium truncate" :title="product.title">
                    {{ product.title }}
                  </h3>

                  <!-- Prices -->
                  <div class="flex items-baseline gap-2 mt-1">
                    <span class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ money(Math.round(salePrice(product) * 100)) }}
                    </span>
                    <span v-if="product.discountPercentage > 0" class="text-xs text-gray-400 line-through">
                      {{ money(Math.round(product.price * 100)) }}
                    </span>
                    <span class="text-[11px] text-gray-400 dark:text-gray-500">
                      · ID #{{ product.id }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Middle: Quick Stock Control -->
              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                <!-- Stock Controls (+ / -) -->
                <div class="flex items-center border border-gray-300 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-black/30 shadow-sm">
                  <button
                    :disabled="product.stock <= 0 || updatingIds[product.id]"
                    @click="quickUpdateStock(product, product.stock - 1)"
                    class="px-2.5 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold transition-colors"
                    title="Decrease Stock by 1"
                  >
                    -
                  </button>
                  <div class="px-3 py-1.5 text-center min-w-[70px]">
                    <span class="text-xs font-semibold text-gray-900 dark:text-white block">
                      {{ product.stock }} units
                    </span>
                  </div>
                  <button
                    :disabled="updatingIds[product.id]"
                    @click="quickUpdateStock(product, product.stock + 1)"
                    class="px-2.5 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 text-sm font-bold transition-colors text-emerald-600 dark:text-emerald-400"
                    title="Increase Stock by 1"
                  >
                    +
                  </button>
                </div>

                <!-- Quick Increments (+5, +10) -->
                <div class="flex items-center gap-1.5">
                  <button
                    :disabled="updatingIds[product.id]"
                    @click="quickUpdateStock(product, product.stock + 5)"
                    class="text-[10px] font-semibold uppercase px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Add 5 units to stock"
                  >
                    +5
                  </button>
                  <button
                    :disabled="updatingIds[product.id]"
                    @click="quickUpdateStock(product, product.stock + 10)"
                    class="text-[10px] font-semibold uppercase px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Add 10 units to stock"
                  >
                    +10
                  </button>
                </div>

                <!-- Update indicator -->
                <span v-if="updatedIds[product.id]" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                  ✓ Saved
                </span>
              </div>

              <!-- Right: Offers & Row Actions -->
              <div class="flex items-center gap-2 shrink-0 self-end md:self-center relative">
                <!-- Offer Dropdown Button -->
                <div class="relative">
                  <button
                    @click="toggleOfferDropdown(product.id, product.discountPercentage)"
                    :class="[
                      'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all',
                      product.discountPercentage > 0
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/20'
                        : 'border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-theme-gold'
                    ]"
                    title="Set Offer or Discount"
                  >
                    <span>🏷️</span>
                    <span>{{ product.discountPercentage > 0 ? `${Math.round(product.discountPercentage)}% Off` : 'Add Offer' }}</span>
                  </button>

                  <!-- Popover for Offers -->
                  <div
                    v-if="activeOfferDropdown === product.id"
                    class="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl p-4 z-50 text-xs animate-fade-in"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-semibold text-gray-900 dark:text-white uppercase tracking-wider text-[10px]">Select Offer Preset</span>
                      <button @click="activeOfferDropdown = null" class="text-gray-400 hover:text-gray-600">&times;</button>
                    </div>

                    <!-- Preset Chips -->
                    <div class="grid grid-cols-4 gap-1.5 mb-3">
                      <button
                        v-for="pct in [0, 10, 15, 20, 25, 30, 40, 50]"
                        :key="pct"
                        @click="quickUpdateDiscount(product, pct)"
                        :class="[
                          'py-1 text-center rounded border transition-colors font-medium',
                          product.discountPercentage === pct
                            ? 'bg-theme-gold text-white border-theme-gold font-bold'
                            : 'border-gray-200 dark:border-zinc-700 hover:border-theme-gold text-gray-700 dark:text-gray-300'
                        ]"
                      >
                        {{ pct === 0 ? 'None' : `${pct}%` }}
                      </button>
                    </div>

                    <!-- Custom Discount Input -->
                    <div class="pt-2 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-2">
                      <input
                        v-model.number="customOfferInput"
                        type="number"
                        min="0"
                        max="99"
                        placeholder="Custom %"
                        class="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-black/30 text-gray-900 dark:text-white"
                      />
                      <button
                        @click="quickUpdateDiscount(product, Number(customOfferInput) || 0)"
                        class="flex-1 bg-theme-gold hover:opacity-90 text-white dark:text-theme-bg py-1 px-2 rounded font-semibold text-[11px]"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Edit Button -->
                <button
                  :disabled="busy"
                  @click="openEditModal(product)"
                  class="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 hover:border-gray-900 dark:hover:border-white text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Edit
                </button>

                <!-- Delete Button -->
                <button
                  :disabled="busy"
                  @click="remove(product)"
                  class="text-xs p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Delete Watch"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- TAB 2: OVERVIEW & ANALYTICS                     -->
      <!-- ============================================== -->
      <div v-else-if="tab === 'overview' && summary" class="space-y-6">
        <!-- 4 Big Metric Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-gray-50 dark:bg-theme-card p-5 rounded-xl border border-gray-200 dark:border-white/5">
            <span class="text-[10px] uppercase tracking-widest text-gray-500 dark:text-theme-muted block mb-1">Collected Revenue</span>
            <span class="text-2xl lg:text-3xl font-serif text-theme-gold font-light">{{ money(summary.paidCents) }}</span>
            <span class="text-xs text-gray-400 block mt-1">Delivered &amp; paid orders</span>
          </div>

          <div class="bg-gray-50 dark:bg-theme-card p-5 rounded-xl border border-gray-200 dark:border-white/5">
            <span class="text-[10px] uppercase tracking-widest text-gray-500 dark:text-theme-muted block mb-1">Booked Value</span>
            <span class="text-2xl lg:text-3xl font-serif text-gray-900 dark:text-white font-light">{{ money(summary.bookedCents) }}</span>
            <span class="text-xs text-gray-400 block mt-1">All active uncancelled orders</span>
          </div>

          <div class="bg-gray-50 dark:bg-theme-card p-5 rounded-xl border border-gray-200 dark:border-white/5">
            <span class="text-[10px] uppercase tracking-widest text-gray-500 dark:text-theme-muted block mb-1">Total Orders</span>
            <span class="text-2xl lg:text-3xl font-serif text-gray-900 dark:text-white font-light">{{ summary.orders }}</span>
            <span class="text-xs text-amber-500 block mt-1 font-medium">{{ summary.awaitingShipment || 0 }} awaiting shipment</span>
          </div>

          <div class="bg-gray-50 dark:bg-theme-card p-5 rounded-xl border border-gray-200 dark:border-white/5">
            <span class="text-[10px] uppercase tracking-widest text-gray-500 dark:text-theme-muted block mb-1">Catalog &amp; Inventory</span>
            <span class="text-2xl lg:text-3xl font-serif text-gray-900 dark:text-white font-light">{{ summary.products }} models</span>
            <span class="text-xs text-gray-400 block mt-1">{{ summary.units }} total units in stock</span>
          </div>
        </div>

        <!-- 2 Column Section: Low Stock Alert & Local Storage -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Low Stock Alert Card -->
          <div class="bg-white dark:bg-theme-card p-5 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-serif text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <span>⚠️ Low Stock Alert</span>
                <span class="text-xs font-sans px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  {{ summary.lowStock.length }} items
                </span>
              </h3>
              <button @click="tab = 'products'; stockFilter = 'low'" class="text-xs text-theme-gold hover:underline">
                View all &rarr;
              </button>
            </div>

            <p v-if="!summary.lowStock.length" class="text-xs text-gray-400 py-6 text-center">
              All watches currently have healthy stock levels (&gt; 5 units).
            </p>

            <div v-else class="divide-y divide-gray-100 dark:divide-white/5 max-h-72 overflow-y-auto">
              <div
                v-for="item in summary.lowStock"
                :key="item.id"
                class="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <span class="font-medium text-gray-800 dark:text-gray-200 truncate flex-1">{{ item.title }}</span>
                <span class="font-semibold px-2 py-0.5 rounded" :class="item.stock <= 0 ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'">
                  {{ item.stock }} left
                </span>
                <!-- Quick Restock Button -->
                <button
                  @click="quickUpdateStock(products.find(p => p.id === item.id) || { id: item.id, stock: item.stock } as Watch, item.stock + 10)"
                  class="bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 px-2 py-1 rounded text-[10px] font-semibold text-gray-700 dark:text-gray-300"
                  title="Restock +10 units"
                >
                  +10 Restock
                </button>
              </div>
            </div>
          </div>

          <!-- Local Storage & System Info -->
          <div class="bg-white dark:bg-theme-card p-5 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
            <h3 class="font-serif text-lg font-medium text-gray-900 dark:text-white mb-3">Database &amp; Storage</h3>
            <p class="text-xs text-gray-500 mb-2">
              {{ (summary.storage.usedBytes / 1e6).toFixed(2) }} MB used of 200 MB maximum budget
            </p>
            <div class="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
              <div
                class="bg-theme-gold h-2 rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(100, (summary.storage.usedBytes / summary.storage.budgetBytes) * 100)}%` }"
              ></div>
            </div>
            <p class="text-xs text-gray-400 leading-relaxed">
              SQLite database storage is capped safely at 80 MB, providing ample headroom for customer orders, user accounts, and catalog products. Product images are hosted via fast CDN URLs.
            </p>
          </div>
        </div>

        <!-- Sales History -->
        <div class="bg-white dark:bg-theme-card p-5 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
          <h3 class="font-serif text-lg font-medium text-gray-900 dark:text-white mb-2">Recent Paid Sales by Date</h3>
          <p class="text-xs text-gray-400 mb-4">Latest 30 days of collected orders.</p>
          <p v-if="!summary.dailySales.length" class="text-xs text-gray-400 py-6 text-center">
            No payments collected yet. Delivered orders marked as paid will appear here.
          </p>
          <div v-else class="divide-y divide-gray-100 dark:divide-white/5">
            <div v-for="day in summary.dailySales" :key="day.day" class="py-2.5 flex items-center justify-between text-xs">
              <span class="text-gray-600 dark:text-gray-300">{{ day.day }} · {{ day.orders }} {{ day.orders === 1 ? 'order' : 'orders' }}</span>
              <strong class="font-serif text-sm text-theme-gold">{{ money(day.cents) }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- TAB 3: ORDERS MANAGEMENT                        -->
      <!-- ============================================== -->
      <div v-else-if="tab === 'orders'" class="space-y-6">
        <!-- Order status filters -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            v-for="st in ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled']"
            :key="st"
            @click="orderStatusFilter = st"
            :class="[
              'px-3 py-1.5 text-xs uppercase tracking-wider rounded-lg font-medium transition-colors shrink-0',
              orderStatusFilter === st
                ? 'bg-theme-gold text-white font-bold'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            {{ st }}
          </button>
        </div>

        <div v-if="!filteredOrders.length" class="p-12 text-center text-gray-400 bg-white dark:bg-theme-card rounded-xl border border-gray-200 dark:border-white/5">
          <p class="text-sm">No orders found matching the filter.</p>
        </div>

        <div v-else class="space-y-4">
          <article
            v-for="order in filteredOrders"
            :key="order.id"
            class="bg-white dark:bg-theme-card p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5 gap-2 mb-3">
              <div>
                <span class="text-xs uppercase tracking-widest text-theme-gold font-semibold">Order #{{ order.id }}</span>
                <h3 class="font-serif text-lg font-medium text-gray-900 dark:text-white">{{ order.shipping.name }}</h3>
              </div>
              <div class="text-right">
                <span class="text-xl font-serif text-theme-gold font-medium">{{ money(order.total_cents) }}</span>
                <div class="flex items-center gap-2 justify-end mt-1">
                  <span
                    class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold"
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
                  <span
                    class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold"
                    :class="order.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'"
                  >
                    {{ order.payment_status }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Items -->
            <div class="py-2 space-y-1.5 border-b border-gray-100 dark:border-white/5 mb-3">
              <div v-for="(item, idx) in order.items" :key="idx" class="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                <span>{{ item.quantity }} × {{ item.title }}</span>
                <span class="font-medium">{{ money(item.unit_cents * item.quantity) }}</span>
              </div>
            </div>

            <!-- Shipping address & contacts -->
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
              📍 {{ order.shipping.address }}, {{ order.shipping.city }}, {{ order.shipping.postalCode }}, {{ order.shipping.country }} · 📞 {{ order.shipping.phone }}
            </p>

            <!-- Actions Bar -->
            <div class="flex flex-wrap items-center gap-3 pt-2">
              <!-- Tracking input -->
              <div class="flex items-center gap-2 flex-1 min-w-[240px]">
                <input
                  v-model="order.tracking"
                  placeholder="Carrier tracking code..."
                  maxlength="200"
                  class="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white flex-1 focus:outline-none focus:border-theme-gold"
                />
                <button
                  :disabled="busy"
                  @click="updateOrder(order, { tracking: order.tracking })"
                  class="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 hover:border-theme-gold text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                  Save tracking
                </button>
              </div>

              <!-- Next status button -->
              <button
                v-if="nextStatus[order.status]"
                :disabled="busy"
                @click="updateOrder(order, { status: nextStatus[order.status], tracking: order.tracking })"
                class="bg-theme-gold hover:opacity-90 text-white dark:text-theme-bg text-xs px-3.5 py-1.5 rounded-lg font-semibold uppercase tracking-wider transition-all"
              >
                Mark {{ nextStatus[order.status] }}
              </button>

              <!-- Payment collection -->
              <button
                v-if="order.status === 'delivered' && order.payment_status === 'unpaid'"
                :disabled="busy"
                @click="updateOrder(order, { payment_status: 'paid' })"
                class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold uppercase tracking-wider transition-colors"
              >
                Confirm Payment Collected
              </button>

              <!-- Cancel & Restock -->
              <button
                v-if="['pending', 'processing'].includes(order.status)"
                :disabled="busy"
                @click="updateOrder(order, { status: 'cancelled' })"
                class="text-xs text-red-600 dark:text-red-400 hover:underline px-2 py-1"
              >
                Cancel &amp; Restock
              </button>
            </div>
          </article>

          <button
            v-if="nextBefore"
            :disabled="busy"
            @click="moreOrders"
            class="w-full py-3 text-xs uppercase tracking-widest text-center border border-gray-300 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300 hover:border-theme-gold transition-colors"
          >
            Load older orders
          </button>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- MODAL: ADD / EDIT TIMEPIECE                    -->
      <!-- ============================================== -->
      <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal"></div>

        <!-- Modal Dialog -->
        <div role="dialog" aria-modal="true" aria-labelledby="watch-dialog-title" class="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain shadow-2xl z-10 p-6 md:p-8 animate-fade-in">
          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-4 mb-6 border-b border-gray-200 dark:border-white/10">
            <div>
              <p class="text-[10px] uppercase tracking-widest text-theme-gold font-semibold">
                {{ editing ? 'Edit Watch Details' : 'New Collection Addition' }}
              </p>
              <h2 id="watch-dialog-title" class="font-serif text-2xl font-light text-gray-900 dark:text-white">
                {{ editing ? form.title || 'Edit Timepiece' : 'Add a New Watch' }}
              </h2>
            </div>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl font-light leading-none">
              &times;
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="save" class="space-y-6">
            <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Left Column -->
              <div class="space-y-4">
                <div>
                  <label class="block text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-semibold mb-1">Title *</label>
                  <input
                    v-model="form.title"
                    required
                    maxlength="200"
                    placeholder="e.g. Rolex Submariner Date"
                    class="w-full text-xs px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-none focus:border-theme-gold"
                  />
                </div>

                <div>
                  <label class="block text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-semibold mb-1">Brand *</label>
                  <input
                    v-model="form.brand"
                    required
                    maxlength="100"
                    placeholder="e.g. Rolex, Omega, Patek Philippe"
                    class="w-full text-xs px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-none focus:border-theme-gold"
                  />
                </div>

                <div>
                  <label class="block text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-semibold mb-1">Category</label>
                  <select
                    v-model="form.category"
                    class="w-full text-xs px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-none focus:border-theme-gold"
                  >
                    <option value="mens-watches">Men's Watches</option>
                    <option value="womens-watches">Women's Watches</option>
                    <option value="unisex-watches">Unisex Watches</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-semibold mb-1">Description *</label>
                  <textarea
                    v-model="form.description"
                    required
                    maxlength="5000"
                    rows="4"
                    placeholder="Describe the horological craftsmanship, movement, materials..."
                    class="w-full text-xs px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-none focus:border-theme-gold leading-relaxed"
                  ></textarea>
                </div>
              </div>

              <!-- Right Column -->
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-semibold mb-1">Price (USD) *</label>
                    <input
                      v-model.number="form.price"
                      type="number"
                      min="0"
                      max="100000000"
                      step="0.01"
                      required
                      class="w-full text-xs px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-none focus:border-theme-gold"
                    />
                  </div>

                  <div>
                    <label class="block text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-semibold mb-1">Stock Units *</label>
                    <input
                      v-model.number="form.stock"
                      type="number"
                      min="0"
                      step="1"
                      required
                      class="w-full text-xs px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-none focus:border-theme-gold"
                    />
                  </div>
                </div>

                <!-- Offer / Discount Section -->
                <div class="bg-gray-50 dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-white/5 space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 font-semibold">Special Offer / Discount</label>
                    <span class="text-xs font-bold text-theme-gold">{{ form.discountPercentage }}% OFF</span>
                  </div>

                  <div class="flex items-center gap-3">
                    <input
                      v-model.number="form.discountPercentage"
                      type="range"
                      min="0"
                      max="90"
                      step="1"
                      class="flex-1 accent-theme-gold cursor-pointer"
                    />
                    <input
                      v-model.number="form.discountPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      class="w-16 text-xs px-2 py-1.5 text-center border border-gray-300 dark:border-white/10 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <!-- Live Price Calculation -->
                  <div class="text-[11px] text-gray-500 dark:text-gray-400 pt-1 flex justify-between border-t border-gray-200 dark:border-white/5">
                    <span>Customer Sale Price:</span>
                    <strong class="text-theme-gold font-medium">
                      ${{ Math.round(form.price * (1 - form.discountPercentage / 100)).toLocaleString() }}
                      <span v-if="form.discountPercentage > 0" class="text-gray-400 font-normal">
                        (Saves ${{ Math.round(form.price * (form.discountPercentage / 100)).toLocaleString() }})
                      </span>
                    </strong>
                  </div>
                </div>

                <!-- Thumbnail with Preview -->
                <div>
                  <label class="block text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-semibold mb-1">
                    Thumbnail Image URL or Path *
                  </label>
                  <div class="flex items-center gap-3">
                    <input
                      v-model="form.thumbnail"
                      required
                      maxlength="2048"
                      placeholder="https://... or /sample-watch.svg"
                      class="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-none focus:border-theme-gold"
                    />
                    <!-- Live Thumbnail Preview -->
                    <div class="w-11 h-11 shrink-0 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 p-1 flex items-center justify-center overflow-hidden">
                      <img :src="form.thumbnail" @error="handleImageError" alt="Preview" class="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>

                <!-- Gallery URLs -->
                <div>
                  <label class="block text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 font-semibold mb-1">
                    Gallery Images (one URL per line)
                  </label>
                  <textarea
                    v-model="imageLines"
                    rows="3"
                    placeholder="https://..."
                    class="w-full text-xs px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-none focus:border-theme-gold leading-relaxed font-mono"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="pt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2.5 text-xs uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="busy"
                class="bg-theme-gold hover:opacity-90 disabled:opacity-50 text-white dark:text-theme-bg px-6 py-2.5 rounded-lg text-xs uppercase tracking-widest font-semibold transition-all shadow-sm"
              >
                {{ busy ? 'Saving...' : (editing ? 'Save Changes' : 'Add Timepiece') }}
              </button>
            </div>
          </form>
        </div>
      </div>
      </Teleport>
    </template>
  </section>
</template>
