import { computed, ref } from 'vue';

interface User { id: number; name: string; email: string; username: string; image: string; role: 'customer' | 'admin' }
const user = ref<User | null>(null);
const isAuthenticated = computed(() => user.value !== null);
const isLoading = ref(false);
const error = ref<string | null>(null);
let initialized: Promise<void> | undefined;

// Remove legacy demo credentials. Real accounts must be registered on the server.
for (const key of ['boutique_custom_users', 'boutique_token', 'boutique_user']) localStorage.removeItem(key);

async function request(path: string, body?: object) {
  const response = await fetch(`/api/auth/${path}`, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to complete your request.');
  return data;
}
function restoreSession() {
  initialized ??= (async () => {
    try { user.value = (await request('me')).user; }
    catch { user.value = null; }
  })();
  return initialized;
}
async function authenticate(path: string, body: object) {
  isLoading.value = true;
  error.value = null;
  try {
    await restoreSession();
    user.value = (await request(path, body)).user;
    return true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Authentication failed.';
    return false;
  } finally { isLoading.value = false; }
}
export function useAuth() {
  const register = (email: string, password: string, name: string) => authenticate('register', { email, password, name });
  const login = (email: string, password: string) => authenticate('login', { email, password });
  const logout = async () => {
    isLoading.value = true;
    error.value = null;
    try { await restoreSession(); await request('logout', {}); user.value = null; }
    catch (err) { error.value = err instanceof Error ? err.message : 'Unable to sign out. Please try again.'; }
    finally { isLoading.value = false; }
  };
  return { isAuthenticated, user, isLoading, error, login, register, logout, restoreSession };
}
