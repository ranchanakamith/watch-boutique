import { computed, ref } from 'vue';

interface User { id: number; name: string; email: string; username: string; image: string; role: 'customer' | 'admin'; emailVerified: boolean; mfaEnabled: boolean }
const user = ref<User | null>(null);
const isAuthenticated = computed(() => user.value !== null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const mfaChallenge = ref<string | null>(null);
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
  const data = await response.json().catch(() => ({ message: 'Unable to reach the server. Please try again.' }));
  if (!response.ok) throw new Error(data.message || 'Unable to complete your request.');
  return data;
}
import { activateCollections } from './useAccountCollections';

function restoreSession() {
  initialized ??= (async () => {
    try { user.value = (await request('me')).user; }
    catch { user.value = null; }
    await activateCollections(user.value ? user.value.id : null);
  })();
  return initialized;
}
async function authenticate(path: string, body: object) {
  isLoading.value = true;
  error.value = null;
  try {
    await restoreSession();
    const data = await request(path, body);
    if (data.mfaRequired) { mfaChallenge.value = data.challenge; return false; }
    const signedInUser = data.user as User;
    user.value = signedInUser;
    mfaChallenge.value = null;
    await activateCollections(signedInUser.id);
    return true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Authentication failed.';
    return false;
  } finally { isLoading.value = false; }
}
export function useAuth() {
  const clearSession = async () => {
    user.value = null; mfaChallenge.value = null;
    await activateCollections(null);
  };
  const refreshUser = async () => {
    try { user.value = (await request('me')).user; }
    catch { await clearSession(); }
  };
  const completeMfa = (code: string) => authenticate('mfa/login', { challenge: mfaChallenge.value, code });
  const register = (email: string, password: string, name: string) => authenticate('register', { email, password, name });
  const login = (email: string, password: string) => authenticate('login', { email, password });
  const logout = async () => {
    isLoading.value = true;
    error.value = null;
    try { await restoreSession(); await request('logout', {}); await clearSession(); }
    catch (err) { error.value = err instanceof Error ? err.message : 'Unable to sign out. Please try again.'; }
    finally { isLoading.value = false; }
  };
  return { isAuthenticated, user, isLoading, error, login, register, logout, restoreSession, mfaChallenge, completeMfa, clearSession, refreshUser };
}
