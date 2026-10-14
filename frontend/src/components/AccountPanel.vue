<template>
  <section class="account-panel w-full max-w-3xl mx-auto space-y-6">
    <slot />
  </section>
</template>

<style scoped>
.account-panel :deep(.security-card) {
  @apply backdrop-blur-2xl bg-white/40 dark:bg-theme-bg/50 border border-white/50 dark:border-white/10 rounded-xl p-6 md:p-8 space-y-5;
  box-shadow: 0 8px 32px rgba(0,0,0,.1);
}
.account-panel :deep(h2) { @apply font-serif text-3xl font-light text-gray-900 dark:text-white; }
.account-panel :deep(h3) { @apply font-serif text-xl font-light text-gray-900 dark:text-white; }
.account-panel :deep(p) { @apply text-sm leading-relaxed text-gray-600 dark:text-gray-400; }
.account-panel :deep(label) { @apply block text-[10px] uppercase tracking-[0.2em] text-gray-600 dark:text-gray-400; }
.account-panel :deep(input) { @apply block w-full bg-transparent border-b border-gray-400/50 dark:border-white/20 focus:border-theme-gold outline-none py-3 text-sm text-gray-900 dark:text-white; }
.account-panel :deep(button) { @apply rounded-full border border-gray-900/20 dark:border-white/20 bg-white/20 dark:bg-black/20 backdrop-blur-md px-5 py-3 text-xs uppercase tracking-[0.15em] text-gray-900 dark:text-white hover:border-theme-gold transition-colors disabled:opacity-50 disabled:cursor-wait; }
.account-panel :deep(button.primary) { @apply bg-theme-gold text-white dark:text-theme-bg hover:bg-theme-gold/80; }
.account-panel :deep(a) { @apply text-theme-gold underline underline-offset-4; }
.account-panel :deep(button:focus-visible), .account-panel :deep(a:focus-visible) { @apply outline outline-2 outline-offset-4 outline-theme-gold; }
.account-panel :deep(.security-message) { @apply rounded-xl border border-theme-gold/30 bg-white/20 dark:bg-black/20 backdrop-blur-md p-4 text-gray-900 dark:text-white; }
.account-panel :deep(code) { @apply break-all text-sm text-gray-900 dark:text-white; }
</style>
