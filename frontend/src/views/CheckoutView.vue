<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useCart } from '../composables/useCart';
import { shopApi, money, salePrice } from '../composables/useShopApi';
const { user } = useAuth();
const { cart, clearCart, removeFromCart, setQuantity, cartTotal } = useCart();
const router = useRouter();
const shipping = ref({ name: user.value?.name || '', phone: '', address: '', city: '', postalCode: '', country: '' });
const busy = ref(false), error = ref('');
let requestKey = crypto.randomUUID();
watch([shipping, cart], () => { requestKey = crypto.randomUUID(); }, { deep: true });
const canOrder = computed(() => user.value && cart.value.length && !busy.value);
async function placeOrder() {
  busy.value = true; error.value = '';
  try {
    const order = await shopApi('/orders', 'POST', { requestKey, shipping: shipping.value, items: cart.value.map(i => ({ productId: i.id, quantity: i.quantity })) });
    clearCart(); await router.push(`/orders?placed=${order.id}`);
  } catch (e) { error.value = (e as Error).message; }
  finally { busy.value = false; }
}
</script>
<template>
  <section class="shop-page">
    <p class="shop-eyebrow">Your selection</p><h2>Checkout</h2>
    <p v-if="!user" class="shop-notice">Please use Sign In above to continue.</p>
    <p v-if="!cart.length">Your bag is empty. <RouterLink to="/">Explore watches</RouterLink></p>
    <div v-else class="shop-columns">
      <form class="shop-panel" @submit.prevent="placeOrder">
        <h3>Delivery details</h3><fieldset :disabled="busy">
          <label>Full name<input v-model="shipping.name" autocomplete="name" required maxlength="100" /></label>
          <label>Phone<input v-model="shipping.phone" type="tel" autocomplete="tel" required maxlength="50" /></label>
          <label>Street address<textarea v-model="shipping.address" autocomplete="street-address" required maxlength="300"></textarea></label>
          <label>City<input v-model="shipping.city" autocomplete="address-level2" required maxlength="100" /></label>
          <label>Postal code<input v-model="shipping.postalCode" autocomplete="postal-code" required maxlength="30" /></label>
          <label>Country<input v-model="shipping.country" autocomplete="country-name" required maxlength="100" /></label>
        </fieldset>
        <p class="shop-notice">Cash on delivery · USD. Delivery is currently free. No additional tax is calculated.</p>
        <p v-if="error" role="alert" class="shop-error">{{ error }}</p>
        <button class="shop-primary" :disabled="!canOrder">{{ busy ? 'Placing order…' : 'Place cash-on-delivery order' }}</button>
      </form>
      <div class="shop-panel"><h3>Order summary</h3>
        <div v-for="item in cart" :key="item.id" class="shop-line">
          <img :src="item.thumbnail" :alt="item.title" width="64" height="64" />
          <div><strong>{{ item.title }}</strong><p>{{ money(salePrice(item) * 100) }} each</p>
            <label>Quantity<input type="number" min="1" :max="Math.min(item.stock, 99)" :value="item.quantity" :disabled="busy" @change="setQuantity(item.id, Number(($event.target as HTMLInputElement).value))" /></label>
            <button :disabled="busy" @click="removeFromCart(item.id)">Remove</button>
          </div>
        </div>
        <div class="shop-line"><strong>Total</strong><strong>{{ money(Math.round(cartTotal * 100)) }}</strong></div>
        <p class="shop-muted">Stock and current prices are checked again when you place your order.</p>
      </div>
    </div>
  </section>
</template>
