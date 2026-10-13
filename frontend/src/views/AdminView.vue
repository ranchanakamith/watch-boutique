<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { shopApi, money, type Order } from '../composables/useShopApi';
import type { Watch } from '../types/watch';
const { user } = useAuth();
const isAdmin = computed(() => user.value?.role === 'admin');
const tab = ref('overview'), busy = ref(false), error = ref(''), message = ref(''), search = ref('');
interface Summary { orders: number; bookedCents: number; paidCents: number; awaitingShipment: number; products: number; units: number;
  lowStock: {id: number; title: string; stock: number}[]; dailySales: {day: string; cents: number; orders: number}[];
  storage: {usedBytes: number; databaseLimitBytes: number; budgetBytes: number} }
const summary = ref<Summary | null>(null), products = ref<Watch[]>([]), orders = ref<Order[]>([]), nextBefore = ref<number | null>(null);
const blank = () => ({ title: '', brand: '', description: '', category: 'mens-watches', price: 0, stock: 0, discountPercentage: 0, rating: 0, thumbnail: '/sample-watch.svg', images: ['/sample-watch.svg'] });
const form = ref(blank()), editing = ref<number | null>(null), imageLines = ref('/sample-watch.svg');
const filtered = computed(() => products.value.filter(p => `${p.title} ${p.brand}`.toLowerCase().includes(search.value.toLowerCase())));
async function load() {
  if (!isAdmin.value) return;
  busy.value = true; error.value = '';
  try {
    summary.value = await shopApi('/admin/summary');
    const all: Watch[] = []; let total = 0;
    do { const data = await shopApi(`/products?limit=100&skip=${all.length}`); all.push(...data.products); total = data.total; if (!data.products.length) break; } while (all.length < total);
    products.value = all;
    const data = await shopApi('/admin/orders'); orders.value = data.orders; nextBefore.value = data.nextBefore;
  } catch (e) { error.value = (e as Error).message; } finally { busy.value = false; }
}
function edit(product?: Watch) {
  editing.value = product?.id ?? null;
  if (product) { const { id, ...fields } = product; form.value = { ...fields, images: [...fields.images] }; }
  else form.value = blank();
  imageLines.value = form.value.images.join('\n'); tab.value = 'products';
}
async function save() {
  busy.value = true; error.value = ''; message.value = '';
  try {
    await shopApi(editing.value ? `/products/${editing.value}` : '/products', editing.value ? 'PATCH' : 'POST', { ...form.value, images: imageLines.value.split('\n').map(s => s.trim()).filter(Boolean) });
    message.value = editing.value ? 'Watch updated.' : 'Watch added.'; edit(); await load();
  } catch (e) { error.value = (e as Error).message; } finally { busy.value = false; }
}
async function remove(product: Watch) {
  if (!confirm(`Delete ${product.title}? Existing order receipts will be preserved.`)) return;
  busy.value = true; error.value = '';
  try { await shopApi(`/products/${product.id}`, 'DELETE'); if (editing.value === product.id) edit(); await load(); }
  catch (e) { error.value = (e as Error).message; } finally { busy.value = false; }
}
const nextStatus: Record<string, string> = { pending: 'processing', processing: 'shipped', shipped: 'delivered' };
async function updateOrder(order: Order, body: object) {
  busy.value = true; error.value = '';
  try { await shopApi(`/admin/orders/${order.id}`, 'PATCH', body); await load(); }
  catch (e) { error.value = (e as Error).message; } finally { busy.value = false; }
}
async function moreOrders() {
  busy.value = true;
  try { const data = await shopApi(`/admin/orders?before=${nextBefore.value}`); orders.value.push(...data.orders); nextBefore.value = data.nextBefore; }
  catch (e) { error.value = (e as Error).message; } finally { busy.value = false; }
}
watch(isAdmin, () => { if (isAdmin.value) void load(); else { summary.value = null; orders.value = []; products.value = []; } }, { immediate: true });
</script>
<template>
  <section class="shop-page">
    <p class="shop-eyebrow">Boutique management</p><h2>Admin dashboard</h2>
    <p v-if="!isAdmin" class="shop-notice">Sign in with an administrator account to manage watches and sales. The store owner can grant access using the backend admin command.</p>
    <template v-else>
      <nav class="shop-tabs"><button v-for="name in ['overview','products','orders']" :key="name" :class="{ 'shop-primary': tab === name }" @click="tab = name">{{ name }}</button><button :disabled="busy" @click="load">Refresh</button></nav>
      <p v-if="error" role="alert" class="shop-error">{{ error }}</p><p v-if="message" role="status" class="shop-notice">{{ message }}</p><p v-if="busy" role="status">Updating…</p>
      <template v-if="tab === 'overview' && summary">
        <div class="shop-stats">
          <div class="shop-panel">Collected sales<strong>{{ money(summary.paidCents) }}</strong></div>
          <div class="shop-panel">Booked orders<strong>{{ money(summary.bookedCents) }}</strong></div>
          <div class="shop-panel">Orders<strong>{{ summary.orders }}</strong>{{ summary.awaitingShipment || 0 }} awaiting shipment</div>
          <div class="shop-panel">Watches<strong>{{ summary.products }}</strong>{{ summary.units }} units in stock</div>
        </div>
        <div class="shop-columns"><div class="shop-panel"><h3>Local storage</h3>
          <p>{{ (summary.storage.usedBytes / 1e6).toFixed(2) }} MB used / 200 MB data budget</p>
          <progress :value="summary.storage.usedBytes" :max="summary.storage.budgetBytes" class="w-full"></progress>
          <p class="shop-muted">Database capped at 80 MB, leaving room for SQLite's temporary journal. Images use URLs. Source code and installed dependencies are outside this data budget.</p>
        </div><div class="shop-panel"><h3>Low stock</h3><p v-if="!summary.lowStock.length">All watches have more than five units.</p>
          <div v-for="item in summary.lowStock" :key="item.id" class="shop-line"><span>{{ item.title }}</span><strong>{{ item.stock }} left</strong></div>
        </div></div>
        <div class="shop-panel"><h3>Collected sales by order date</h3><p class="shop-muted">Latest 30 days with paid orders. Only delivered orders marked paid count as collected sales.</p>
          <p v-if="!summary.dailySales.length">No payments recorded yet.</p>
          <div v-for="day in summary.dailySales" :key="day.day" class="shop-line"><span>{{ day.day }} · {{ day.orders }} orders</span><strong>{{ money(day.cents) }}</strong></div>
        </div>
      </template>
      <div v-if="tab === 'products'" class="shop-columns">
        <form class="shop-panel" @submit.prevent="save"><h3>{{ editing ? 'Edit watch' : 'Add a new watch' }}</h3><fieldset :disabled="busy">
          <label>Title<input v-model="form.title" required maxlength="200" /></label>
          <label>Brand<input v-model="form.brand" required maxlength="100" /></label>
          <label>Description<textarea v-model="form.description" required maxlength="5000"></textarea></label>
          <label>Category<select v-model="form.category"><option>mens-watches</option><option>womens-watches</option><option>unisex-watches</option></select></label>
          <label>Price (USD)<input v-model.number="form.price" type="number" min="0" max="100000000" step="0.01" required /></label>
          <label>Stock<input v-model.number="form.stock" type="number" min="0" step="1" required /></label>
          <label>Discount (%)<input v-model.number="form.discountPercentage" type="number" min="0" max="100" step="0.01" required /></label>
          <label>Thumbnail URL or local path<input v-model="form.thumbnail" required maxlength="2048" /></label>
          <label>Gallery image URLs (one per line)<textarea v-model="imageLines"></textarea></label>
          <button class="shop-primary">{{ editing ? 'Save changes' : 'Add watch' }}</button><button type="button" @click="edit()">Reset form</button>
        </fieldset></form>
        <div class="shop-panel"><h3>Inventory ({{ products.length }})</h3><label>Search watches<input v-model="search" type="search" /></label>
          <p v-if="!filtered.length">No matching watches.</p>
          <div v-for="product in filtered" :key="product.id" class="shop-line"><div><strong>{{ product.title }}</strong><p>{{ money(Math.round(product.price * 100)) }} · {{ product.stock }} in stock</p><button :disabled="busy" @click="edit(product)">Edit</button><button :disabled="busy" @click="remove(product)">Delete</button></div></div>
        </div>
      </div>
      <template v-if="tab === 'orders'">
        <p v-if="!orders.length">No orders yet. Completed checkouts will appear here.</p>
        <article v-for="order in orders" :key="order.id" class="shop-panel">
          <div class="shop-line"><h3>Order #{{ order.id }} · {{ order.shipping.name }}</h3><strong>{{ money(order.total_cents) }}</strong></div>
          <p>{{ order.created_at }} UTC · {{ order.status }} · {{ order.payment_status }} · Cash on delivery</p>
          <p v-for="(item, index) in order.items" :key="index">{{ item.quantity }} × {{ item.title }} — {{ money(item.unit_cents * item.quantity) }}</p>
          <p>{{ order.shipping.address }}, {{ order.shipping.city }}, {{ order.shipping.postalCode }}, {{ order.shipping.country }} · {{ order.shipping.phone }}</p>
          <label>Tracking reference<input v-model="order.tracking" maxlength="200" /></label><button :disabled="busy" @click="updateOrder(order, { tracking: order.tracking })">Save tracking</button>
          <button v-if="nextStatus[order.status]" :disabled="busy" @click="updateOrder(order, { status: nextStatus[order.status], tracking: order.tracking })">Mark {{ nextStatus[order.status] }}</button>
          <button v-if="order.status === 'delivered' && order.payment_status === 'unpaid'" :disabled="busy" @click="updateOrder(order, { payment_status: 'paid' })">Confirm payment collected</button>
          <button v-if="['pending','processing'].includes(order.status)" :disabled="busy" @click="updateOrder(order, { status: 'cancelled' })">Cancel &amp; restock</button>
        </article><button v-if="nextBefore" :disabled="busy" @click="moreOrders">Load older orders</button>
      </template>
    </template>
  </section>
</template>
