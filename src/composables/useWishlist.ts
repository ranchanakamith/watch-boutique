import { ref, watch } from 'vue';
import type { Watch } from '../types/watch';

const savedWishlist = localStorage.getItem('boutique_wishlist');
const wishlist = ref<Watch[]>(savedWishlist ? JSON.parse(savedWishlist) : []);

watch(wishlist, (newWishlist) => {
  localStorage.setItem('boutique_wishlist', JSON.stringify(newWishlist));
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