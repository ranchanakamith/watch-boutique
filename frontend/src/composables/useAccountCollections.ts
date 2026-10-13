import { ref } from 'vue';
import type { Watch } from '../types/watch';
export interface CartItem extends Watch { quantity: number }
export const accountCart = ref<CartItem[]>([]);
export const accountWishlist = ref<Watch[]>([]);
export const collectionsLoading = ref(true);
export const collectionsSaving = ref(false);
export const collectionsError = ref('');
const owner = ref<number | null>(null);
let generation = 0;
let ready = false;
let pending: Promise<void> = Promise.resolve();
export const currentAccountId = () => owner.value;
export const waitForCollections = () => pending;

async function request(path: string, id: number, method = 'GET', body?: object) {
  const response = await fetch(`/api/account/items${path}`, {
    method, credentials: 'same-origin', headers: { 'X-Account-ID': String(id), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to save your account data.');
  return data;
}

export async function activateCollections(id: number | null) {
  const version = ++generation;
  owner.value = id; ready = false;
  accountCart.value = []; accountWishlist.value = [];
  collectionsError.value = ''; collectionsSaving.value = false;
  collectionsLoading.value = id !== null;
  if (id === null) { ready = true; return; }
  try {
    const data = await request('', id);
    if (version !== generation) return;
    if (data.userId !== id) throw new Error('Your account changed. Refresh this page.');
    accountCart.value = data.cart; accountWishlist.value = data.wishlist; ready = true;
  } catch (e) {
    if (version === generation) collectionsError.value = (e as Error).message;
  } finally { if (version === generation) collectionsLoading.value = false; }
}

export async function reloadCollections() {
  await pending;
  await activateCollections(owner.value);
}

// Mutations are explicit: loading server data never triggers a save under a different user.
export function changeCollection(kind: 'cart' | 'wishlist', productId: number | null, quantity: number | null, update: () => void): boolean {
  if (!ready || collectionsLoading.value || collectionsSaving.value) {
    collectionsError.value = 'Please wait for your saved items to load or finish saving, then try again.';
    return false;
  }
  collectionsError.value = '';
  const version = generation, id = owner.value;
  update();
  if (id === null) return true; // Guest items exist only in this page, never in another account.
  collectionsSaving.value = true;
  pending = (async () => {
    try {
      await request(`/${kind}${productId === null ? '' : `/${productId}`}`, id, quantity === null ? 'DELETE' : 'PUT', quantity === null ? undefined : { quantity });
    } catch (e) {
      if (version !== generation) return;
      const message = (e as Error).message;
      await activateCollections(id); // Restore the persisted state after a rejected mutation.
      collectionsError.value = message;
    } finally { if (version === generation) collectionsSaving.value = false; }
  })();
  return true;
}
