<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { shopApi, type Order } from '../composables/useShopApi';
const { user } = useAuth();
const orderNumber = ref(''), busy = ref(false), error = ref('');
const order = ref<Order | null>(null);
let generation = 0;
watch(() => user.value?.id, () => { generation++; order.value = null; error.value = ''; busy.value = false; });
async function track() {
  const current = ++generation;
  order.value = null; error.value = '';
  const id = orderNumber.value.trim().replace(/^#/, '');
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) { error.value = 'Enter a valid order number, for example 12.'; return; }
  busy.value = true;
  try {
    const result = await shopApi(`/orders/${id}`);
    if (current === generation) order.value = result;
  } catch (e) { if (current === generation) error.value = (e as Error).message; }
  finally { if (current === generation) busy.value = false; }
}
</script>
<template>
  <section class="shop-page">
    <p class="shop-eyebrow">Customer service</p><h1>Track your order</h1>
    <p v-if="!user" class="shop-notice">Please use Sign In above to securely view your order status.</p>
    <form v-else class="shop-panel" @submit.prevent="track">
      <label for="tracking-order">Order number</label>
      <input id="tracking-order" v-model="orderNumber" required inputmode="numeric" maxlength="20" placeholder="e.g. 12" />
      <button type="submit" :disabled="busy">{{ busy ? 'Checking…' : 'Check order status' }}</button>
      <RouterLink to="/orders">View all your orders</RouterLink>
    </form>
    <p v-if="error" class="shop-error" role="alert">{{ error }}</p>
    <article v-if="order" class="shop-panel" aria-live="polite">
      <h2>Order #{{ order.id }}</h2><p>Status: <strong>{{ order.status }}</strong></p>
      <p>Payment: {{ order.payment_status }} · Cash on delivery</p>
      <p v-if="order.tracking">Courier tracking reference: {{ order.tracking }}</p>
      <p v-else-if="order.status === 'cancelled'">This order has been cancelled.</p>
      <p v-else>No courier tracking reference has been added yet.</p>
      <p>Order status and tracking references are updated by our team.</p>
    </article>
  </section>
</template>
