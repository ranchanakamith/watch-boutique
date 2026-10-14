<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import AccountPanel from '../components/AccountPanel.vue';
import { useAuth } from '../composables/useAuth';
import { shopApi } from '../composables/useShopApi';

interface Session { id: string; createdAt: number | null; expiresAt: number; current: boolean }
interface Security { emailVerified: boolean; mfaEnabled: boolean; adminMfaRequired: boolean; recoveryCodesRemaining: number; sessions: Session[] }
const { user, clearSession, refreshUser } = useAuth();
const state = ref<Security | null>(null), busy = ref(false), message = ref(''), error = ref('');
const currentPassword = ref(''), newPassword = ref(''), confirmation = ref(''), passwordCode = ref('');
const mfaPassword = ref(''), code = ref(''), setupSecret = ref(''), recoveryCodes = ref<string[]>([]);
let generation = 0;
function clearSecrets() { currentPassword.value = ''; newPassword.value = ''; confirmation.value = ''; passwordCode.value = ''; mfaPassword.value = ''; code.value = ''; setupSecret.value = ''; recoveryCodes.value = []; }
onBeforeUnmount(() => { generation++; clearSecrets(); });
async function load() {
  const version = generation;
  if (!user.value) { state.value = null; return; }
  const result = await shopApi('/auth/security');
  if (version === generation) state.value = result;
}
watch(() => user.value?.id, async () => {
  generation++; clearSecrets(); state.value = null; error.value = '';
  try { await load(); } catch (e) { error.value = (e as Error).message; }
}, { immediate: true });
async function run(action: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true; message.value = ''; error.value = '';
  try { await action(); } catch (e) { error.value = (e as Error).message; }
  finally { busy.value = false; }
}
const verifyEmail = () => run(async () => { message.value = (await shopApi('/auth/security/send-verification', 'POST', {})).message; });
const refresh = () => run(async () => { await refreshUser(); await load(); });
const changePassword = () => run(async () => {
  if (newPassword.value !== confirmation.value) throw new Error('The new passwords do not match.');
  const result = await shopApi('/auth/security/change-password', 'POST', { currentPassword: currentPassword.value, password: newPassword.value, code: passwordCode.value });
  await clearSession(); clearSecrets(); message.value = result.message;
});
const setup = () => run(async () => {
  const version = generation;
  const result = await shopApi('/auth/security/mfa/setup', 'POST', { currentPassword: mfaPassword.value });
  if (version !== generation) return;
  setupSecret.value = result.secret; code.value = '';
});
const enable = () => run(async () => {
  const version = generation;
  const result = await shopApi('/auth/security/mfa/enable', 'POST', { currentPassword: mfaPassword.value, code: code.value });
  if (version !== generation) return;
  recoveryCodes.value = result.recoveryCodes; message.value = result.message;
  setupSecret.value = ''; mfaPassword.value = ''; code.value = '';
  await refreshUser(); await load();
});
const disable = () => run(async () => {
  if (!confirm('Disable two-factor authentication for your account?')) return;
  message.value = (await shopApi('/auth/security/mfa/disable', 'POST', { currentPassword: mfaPassword.value, code: code.value })).message;
  clearSecrets(); await refreshUser(); await load();
});
const revoke = (session: Session) => run(async () => {
  await shopApi(`/auth/security/sessions/${session.id}`, 'DELETE');
  if (session.current) await clearSession();
  else await load();
  message.value = 'Session signed out.';
});
const logoutAll = () => run(async () => {
  if (!confirm('Sign out all devices, including this one?')) return;
  await shopApi('/auth/security/logout-all', 'POST', {}); await clearSession(); message.value = 'All devices are signed out.';
});
const date = (value: number) => new Date(value).toLocaleString();
</script>

<template>
  <AccountPanel>
    <h2>Account security</h2>
    <p v-if="error" role="alert" class="security-message">{{ error }}</p>
    <p v-if="message" role="status" class="security-message">{{ message }}</p>
    <p v-if="!user">Use Sign In above to manage your account security.</p>
    <template v-else-if="state">
      <div class="security-card">
        <h3>Email verification</h3>
        <p>{{ user.email }} — {{ state.emailVerified ? 'Verified' : 'Not yet verified' }}</p>
        <p v-if="state.adminMfaRequired">Administrator tools require a verified email and two-factor authentication in production.</p>
        <div class="flex flex-wrap gap-3"><button v-if="!state.emailVerified" class="primary" :disabled="busy" @click="verifyEmail">Send verification email</button><button :disabled="busy" @click="refresh">Refresh status</button></div>
      </div>
      <form class="security-card" @submit.prevent="changePassword">
        <h3>Change password</h3>
        <p>Changing your password signs out all devices.</p>
        <div><label for="current-password">Current password</label><input id="current-password" v-model="currentPassword" type="password" autocomplete="current-password" maxlength="128" required /></div>
        <div><label for="new-password">New password</label><input id="new-password" v-model="newPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required /></div>
        <div><label for="confirm-password">Confirm new password</label><input id="confirm-password" v-model="confirmation" type="password" autocomplete="new-password" minlength="8" maxlength="128" required /></div>
        <div v-if="state.mfaEnabled"><label for="password-code">Authenticator or recovery code</label><input id="password-code" v-model="passwordCode" autocomplete="one-time-code" maxlength="100" required /></div>
        <button class="primary" :disabled="busy">Change password</button>
      </form>
      <div class="security-card">
        <h3>Two-factor authentication</h3>
        <p>{{ state.mfaEnabled ? 'Enabled. Your password and an authenticator or recovery code are required to sign in.' : 'Add an authenticator app for a second layer of protection.' }}</p>
        <p v-if="state.mfaEnabled">Unused recovery codes: {{ state.recoveryCodesRemaining }}. Keep your codes somewhere private and offline.</p>
        <div v-if="recoveryCodes.length" class="security-message space-y-3">
          <p>Save these recovery codes now. Each works once and they cannot be displayed again.</p>
          <ul class="grid sm:grid-cols-2 gap-2"><li v-for="recovery in recoveryCodes" :key="recovery"><code>{{ recovery }}</code></li></ul>
          <button :disabled="busy" @click="recoveryCodes = []">I have saved my recovery codes</button>
        </div>
        <form v-if="!state.mfaEnabled || !state.adminMfaRequired" class="space-y-5" @submit.prevent="state.mfaEnabled ? disable() : setupSecret ? enable() : setup()">
          <div><label for="mfa-password">Current password</label><input id="mfa-password" v-model="mfaPassword" type="password" autocomplete="current-password" maxlength="128" required /></div>
          <div v-if="setupSecret" class="security-message space-y-3">
            <p>In your authenticator app, add an account manually with this setup key. Choose time-based codes (6 digits, 30 seconds). Setup expires after 10 minutes.</p>
            <p>Account: {{ user.email }} · Watch Boutique</p>
            <code>{{ setupSecret }}</code>
          </div>
          <div v-if="setupSecret || state.mfaEnabled"><label for="mfa-code">{{ state.mfaEnabled ? 'Authenticator or recovery code' : '6-digit authenticator code' }}</label><input id="mfa-code" v-model="code" autocomplete="one-time-code" maxlength="100" required /></div>
          <button class="primary" :disabled="busy">{{ state.mfaEnabled ? 'Disable two-factor authentication' : setupSecret ? 'Enable two-factor authentication' : 'Set up authenticator' }}</button>
        </form>
      </div>
      <div class="security-card">
        <h3>Active sessions</h3>
        <p>Sign out sessions you no longer use. Expired sessions are not shown.</p>
        <div v-for="session in state.sessions" :key="session.id" class="flex flex-wrap gap-4 justify-between items-center border-b border-gray-400/20 pb-4">
          <div><p>{{ session.current ? 'This session' : 'Another session' }}</p><p v-if="session.createdAt">Signed in {{ date(session.createdAt) }}</p><p>Expires {{ date(session.expiresAt) }}</p></div>
          <button :disabled="busy" @click="revoke(session)">Sign out {{ session.current ? 'this session' : 'session' }}</button>
        </div>
        <button :disabled="busy" @click="logoutAll">Sign out all devices</button>
      </div>
    </template>
    <p v-else>Loading account security…</p>
  </AccountPanel>
</template>
