import { ref, computed, watch } from 'vue';
import { salePrice } from './useShopApi';
import type { Watch } from '../types/watch';

export interface CartItem extends Watch {
  quantity: number;
}

function readCart(): CartItem[] {
  try { const value = JSON.parse(localStorage.getItem('boutique_cart') || '[]');
    return Array.isArray(value) ? value.filter(i => i && Number.isSafeInteger(i.id) && Number.isSafeInteger(i.quantity) && i.quantity > 0 && i.quantity <= 99 && typeof i.price === 'number' && Number.isFinite(i.price)) : [];
  } catch { return []; }
}
const cart = ref<CartItem[]>(readCart());

watch(cart, (newCart) => {
  try { localStorage.setItem('boutique_cart', JSON.stringify(newCart)); } catch { /* Keep the in-memory bag usable. */ }
}, { deep: true });

export function useCart() {
  const addToCart = (watch: Watch) => {
    const existingItem = cart.value.find(item => item.id === watch.id);
    if (watch.stock <= 0 || (existingItem?.quantity || 0) >= Math.min(watch.stock, 99)) { alert('No more stock is available for this watch.'); return false; }
    if (existingItem) {
      Object.assign(existingItem, watch, { quantity: existingItem.quantity + 1 });
    } else {
      cart.value.push({ ...watch, quantity: 1 });
    }
    return true;
  };

  const setQuantity = (id: number, quantity: number) => {
    const item = cart.value.find(i => i.id === id);
    if (item && Number.isSafeInteger(quantity)) item.quantity = Math.max(1, Math.min(quantity, item.stock || 1, 99));
  };

  const removeFromCart = (id: number) => {
    cart.value = cart.value.filter(item => item.id !== id);
  };

  // NEW FUNCTION: Clears the entire cart
  const clearCart = () => {
    cart.value = [];
  };

  const cartTotal = computed(() => {
    return cart.value.reduce((total, item) => total + (salePrice(item) * item.quantity), 0);
  });

  const cartItemCount = computed(() => {
    return cart.value.reduce((count, item) => count + item.quantity, 0);
  });

  // Remember to export the new clearCart function!
  return { setQuantity, cart, addToCart, removeFromCart, clearCart, cartTotal, cartItemCount };
}