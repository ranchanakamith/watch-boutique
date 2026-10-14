<script setup lang="ts">
import { computed, onBeforeUnmount, watch, ref } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import AccountPanel from '../components/AccountPanel.vue';
import { shopApi } from '../composables/useShopApi';
import { useAuth } from '../composables/useAuth';

const route = useRoute();
const router = useRouter();
const { clearSession, refreshUser } = useAuth();
const mode = computed(() => route.path.endsWith('forgot-password') ? 'forgot' : route.path.endsWith('reset-password') ? 'reset' : 'verify');
const email = ref(''), password = ref(''), confirmPassword = ref('');
const busy = ref(false), message = ref(''), error = ref(''), completed = ref(false);
// Keep the fragment until use so refreshing an unused email link still works.
// URL fragments are not sent to the server or in Referer headers.
const token = ref('');
watch(() => [route.path, route.hash], () => {
  token.value = new URLSearchParams(route.hash.slice(1)).get('token') || '';
  password.value = ''; confirmPassword.value = ''; message.value = ''; completed.value = false;
  error.value = mode.value !== 'forgot' && !token.value ? 'This link is missing or invalid. Request a new link.' : '';
}, { immediate: true });
onBeforeUnmount(() => { token.value = ''; password.value = ''; confirmPassword.value = ''; });
async function submit() {
  if (busy.value) return;
  busy.value = true; error.value = ''; message.value = '';
  const submittedRoute = route.fullPath;
  try {
    if (mode.value === 'reset' && password.value !== confirmPassword.value) throw new Error('The passwords do not match.');
    let result;
    if (mode.value === 'forgot') result = await shopApi('/auth/forgot-password', 'POST', { email: email.value });
    else if (mode.value === 'reset') {
      result = await shopApi('/auth/reset-password', 'POST', { token: token.value, password: password.value });
      await clearSession(); password.value = ''; confirmPassword.value = '';
    } else {
      result = await shopApi('/auth/verify-email', 'POST', { token: token.value });
      await refreshUser();
    }
    if (route.fullPath !== submittedRoute) return;
    if (mode.value !== 'forgot') await router.replace({ path: route.path, query: route.query, hash: '' });
    error.value = ''; message.value = result.message; completed.value = true;
  } catch (e) { if (route.fullPath === submittedRoute) error.value = (e as Error).message; }
  finally { busy.value = false; }
}
</script>

<template>
  <AccountPanel>
    <div class="security-card">
      <h2>{{ mode === 'forgot' ? 'Recover your account' : mode === 'reset' ? 'Choose a new password' : 'Verify your email' }}</h2>
      <p v-if="mode === 'forgot'">Enter your account email to request a password reset link.</p>
      <p v-else-if="mode === 'reset'">Use 8–128 characters. Resetting your password signs out all devices. Two-factor authentication remains enabled if you set it up.</p>
      <p v-else>Confirm your email address using the button below. Opening this page alone does not use your link.</p>
      <p v-if="error" role="alert" class="security-message">{{ error }}</p>
      <p v-if="message" role="status" class="security-message">{{ message }}</p>
      <form v-if="!completed" @submit.prevent="submit" class="space-y-5">
        <div v-if="mode === 'forgot'"><label for="recovery-email">Email address</label><input id="recovery-email" v-model="email" type="email" autocomplete="email" maxlength="254" required /></div>
        <template v-if="mode === 'reset'">
          <div><label for="reset-password">New password</label><input id="reset-password" v-model="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required /></div>
          <div><label for="reset-confirm">Confirm new password</label><input id="reset-confirm" v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required /></div>
        </template>
        <button class="primary" :disabled="busy || (mode !== 'forgot' && !token)">{{ busy ? 'Please wait…' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Reset password' : 'Verify email' }}</button>
      </form>
      <p v-if="completed && mode === 'reset'">Use Sign In above to access your account.</p>
      <button v-if="completed && mode === 'forgot'" class="primary" @click="completed = false; message = ''">Try another email or resend</button>
      <RouterLink v-if="mode === 'reset'" to="/account/forgot-password">Request a new reset link</RouterLink>
      <RouterLink v-else to="/account/security">Account security</RouterLink>
    </div>
  </AccountPanel>
</template>
