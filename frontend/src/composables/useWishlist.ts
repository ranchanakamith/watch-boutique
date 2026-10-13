import { computed, watch as vueWatch } from 'vue';
import type { Watch } from '../types/watch';
import { accountWishlist, changeCollection, currentAccountId } from './useAccountCollections';
import { ref } from 'vue';

function readWishlist(): Watch[] {
  try { const data = JSON.parse(localStorage.getItem('boutique_wishlist') || '[]'); return Array.isArray(data) ? data.filter(i => i && Number.isSafeInteger(i.id)) : []; } catch { return []; }
}
const localWishlist = ref<Watch[]>(readWishlist());

vueWatch(localWishlist, (newWishlist) => {
  try { localStorage.setItem('boutique_wishlist', JSON.stringify(newWishlist)); } catch { /* Keep the in-memory list usable. */ }
}, { deep: true });

export function useWishlist() {
  const wishlist = computed(() => currentAccountId() !== null ? accountWishlist.value : localWishlist.value);

  const toggleWishlist = (watch: Watch) => {
    const list = wishlist.value;
    const index = list.findIndex(item => item.id === watch.id);
    changeCollection('wishlist', watch.id, index > -1 ? null : 1, () => {
      if (index > -1) {
        if (currentAccountId() !== null) accountWishlist.value.splice(index, 1);
        else localWishlist.value.splice(index, 1);
      } else {
        if (currentAccountId() !== null) accountWishlist.value.push(watch);
        else localWishlist.value.push(watch);
      }
    });
  };

  const removeFromWishlist = (id: number) => {
    const index = wishlist.value.findIndex(item => item.id === id);
    if (index > -1) {
      changeCollection('wishlist', id, null, () => {
        if (currentAccountId() !== null) accountWishlist.value.splice(index, 1);
        else localWishlist.value.splice(index, 1);
      });
    }
  };

  const clearWishlist = () => {
    changeCollection('wishlist', null, null, () => {
      if (currentAccountId() !== null) accountWishlist.value = [];
      else localWishlist.value = [];
    });
  };

  return { 
    wishlist, 
    toggleWishlist, 
    removeFromWishlist, 
    clearWishlist 
  };
}