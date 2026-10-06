import { ref, watch } from 'vue';
import type { Watch } from '../types/watch';

function readWishlist(): Watch[] {
  try { const data = JSON.parse(localStorage.getItem('boutique_wishlist') || '[]'); return Array.isArray(data) ? data.filter(i => i && Number.isSafeInteger(i.id)) : []; } catch { return []; }
}
const wishlist = ref<Watch[]>(readWishlist());

watch(wishlist, (newWishlist) => {
  try { localStorage.setItem('boutique_wishlist', JSON.stringify(newWishlist)); } catch { /* Keep the in-memory list usable. */ }
}, { deep: true });

export function useWishlist() {
  const toggleWishlist = (watch: Watch) => {
    const index = wishlist.value.findIndex(item => item.id === watch.id);
    if (index > -1) {
      wishlist.value.splice(index, 1);
    } else {
      wishlist.value.push(watch);
    }
  };

  const removeFromWishlist = (id: number) => {
    wishlist.value = wishlist.value.filter(item => item.id !== id);
  };

  const clearWishlist = () => {
    wishlist.value = [];
  };

  return { 
    wishlist, 
    toggleWishlist, 
    removeFromWishlist, 
    clearWishlist 
  };
}