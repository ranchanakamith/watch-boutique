import { ref, computed, watch } from 'vue';
import type { Watch } from '../types/watch';

export interface CartItem extends Watch {
  quantity: number;
}

const savedCart = localStorage.getItem('boutique_cart');
const cart = ref<CartItem[]>(savedCart ? JSON.parse(savedCart) : []);

watch(cart, (newCart) => {
  localStorage.setItem('boutique_cart', JSON.stringify(newCart));
}, { deep: true });

export function useCart() {
  const addToCart = (watch: Watch) => {
    const existingItem = cart.value.find(item => item.id === watch.id);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cart.value.push({ ...watch, quantity: 1 });
    }
  };

  const removeFromCart = (id: number) => {
    cart.value = cart.value.filter(item => item.id !== id);
  };

  // NEW FUNCTION: Clears the entire cart
  const clearCart = () => {
    cart.value = [];
  };

  const cartTotal = computed(() => {
    return cart.value.reduce((total, item) => total + (item.price * item.quantity), 0);
  });

  const cartItemCount = computed(() => {
    return cart.value.reduce((count, item) => count + item.quantity, 0);
  });

  // Remember to export the new clearCart function!
  return { cart, addToCart, removeFromCart, clearCart, cartTotal, cartItemCount };
}