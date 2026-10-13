import { computed, watch as vueWatch } from 'vue';
import { salePrice } from './useShopApi';
import type { Watch } from '../types/watch';
import { accountCart, changeCollection, currentAccountId } from './useAccountCollections';
import { ref } from 'vue';

export interface CartItem extends Watch {
  quantity: number;
}

function readCart(): CartItem[] {
  try { const value = JSON.parse(localStorage.getItem('boutique_cart') || '[]');
    return Array.isArray(value) ? value.filter(i => i && Number.isSafeInteger(i.id) && Number.isSafeInteger(i.quantity) && i.quantity > 0 && i.quantity <= 99 && typeof i.price === 'number' && Number.isFinite(i.price)) : [];
  } catch { return []; }
}
const localCart = ref<CartItem[]>(readCart());

vueWatch(localCart, (newCart) => {
  try { localStorage.setItem('boutique_cart', JSON.stringify(newCart)); } catch { /* Keep the in-memory bag usable. */ }
}, { deep: true });

export function useCart() {
  const cart = computed(() => currentAccountId() !== null ? accountCart.value : localCart.value);

  const addToCart = (watch: Watch) => {
    const existingItem = cart.value.find(item => item.id === watch.id);
    if (watch.stock <= 0 || (existingItem?.quantity || 0) >= Math.min(watch.stock, 99)) { alert('No more stock is available for this watch.'); return false; }
    
    const qty = (existingItem?.quantity || 0) + 1;
    changeCollection('cart', watch.id, qty, () => {
      if (existingItem) {
        Object.assign(existingItem, watch, { quantity: qty });
      } else {
        if (currentAccountId() !== null) accountCart.value.push({ ...watch, quantity: 1 });
        else localCart.value.push({ ...watch, quantity: 1 });
      }
    });
    return true;
  };

  const setQuantity = (id: number, quantity: number) => {
    const item = cart.value.find(i => i.id === id);
    if (item && Number.isSafeInteger(quantity)) {
        const qty = Math.max(1, Math.min(quantity, item.stock || 1, 99));
        changeCollection('cart', id, qty, () => {
            item.quantity = qty;
        });
    }
  };

  const removeFromCart = (id: number) => {
    const index = cart.value.findIndex(item => item.id === id);
    if (index > -1) {
        changeCollection('cart', id, null, () => {
            if (currentAccountId() !== null) accountCart.value.splice(index, 1);
            else localCart.value.splice(index, 1);
        });
    }
  };

  const clearCart = () => {
    changeCollection('cart', null, null, () => {
        if (currentAccountId() !== null) accountCart.value = [];
        else localCart.value = [];
    });
  };

  const cartTotal = computed(() => {
    return cart.value.reduce((total, item) => total + (salePrice(item) * item.quantity), 0);
  });

  const cartItemCount = computed(() => {
    return cart.value.reduce((count, item) => count + item.quantity, 0);
  });

  return { setQuantity, cart, addToCart, removeFromCart, clearCart, cartTotal, cartItemCount };
}