<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { shopApi, money, type Order } from '../composables/useShopApi';
const { user } = useAuth();
const route = useRoute();
const orders = ref<Order[]>([]), error = ref(''), busy = ref(false), nextBefore = ref<number | null>(null);
async function load(more = false) {
  busy.value = true; error.value = '';
  try { if (!user.value) { orders.value = []; return; }
    const data = await shopApi(`/orders${more ? `?before=${nextBefore.value}` : ''}`);
    orders.value = more ? [...orders.value, ...data.orders] : data.orders; nextBefore.value = data.nextBefore;
  } catch (e) { error.value = (e as Error).message; } finally { busy.value = false; }
}
async function cancel(order: Order) {
  if (!confirm(`Cancel order #${order.id}?`)) return;
  busy.value = true;
  try { await shopApi(`/orders/${order.id}/cancel`, 'POST', {}); await load(); }
  catch (e) { error.value = (e as Error).message; } finally { busy.value = false; }
}
watch(user, () => { if (user.value) void load(); else orders.value = []; }, { immediate: true });
</script>
<template>
  <section class="shop-page">
    <p class="shop-eyebrow">Your account</p><h2>Orders &amp; tracking</h2>
    <p v-if="route.query.placed" role="status" class="shop-notice">Order #{{ route.query.placed }} received. Payment is due on delivery.</p>
    <p v-if="!user">Please use Sign In above to view your orders.</p>
    <button v-else :disabled="busy" @click="load()">Refresh orders</button>
    <p v-if="error" class="shop-error" role="alert">{{ error }}</p>
    <p v-if="busy">Loading…</p><p v-else-if="user && !orders.length">You have no orders yet.</p>
    <article v-for="order in orders" :key="order.id" class="shop-panel">
      <div class="shop-line"><h3>Order #{{ order.id }}</h3><span class="shop-badge">{{ order.status }}</span></div>
      <p class="shop-muted">{{ order.created_at }} UTC · Cash on delivery · {{ order.payment_status }}</p>
      <p v-for="(item, index) in order.items" :key="index">{{ item.quantity }} × {{ item.title }} — {{ money(item.unit_cents * item.quantity) }}</p>
      <p><strong>Total {{ money(order.total_cents) }}</strong></p>
      <p>Deliver to {{ order.shipping.name }}, {{ order.shipping.address }}, {{ order.shipping.city }}, {{ order.shipping.postalCode }}, {{ order.shipping.country }}</p>
      <p v-if="order.tracking">Tracking reference: {{ order.tracking }}</p>
      <button v-if="['pending','processing'].includes(order.status) && order.payment_status === 'unpaid'" :disabled="busy" @click="cancel(order)">Cancel order</button>
    </article>
    <button v-if="nextBefore" :disabled="busy" @click="load(true)">Load older orders</button>
  </section>
</template>
