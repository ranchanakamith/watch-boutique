<script setup lang="ts">
// Track Order View
</script>

<template>
  <div class="max-w-[800px] mx-auto pt-32 pb-24 px-4 md:px-8 animate-fade-in min-h-[70vh]">
    <div class="text-center mb-16">
      <h2 class="text-[10px] uppercase tracking-[0.4em] text-gray-400 dark:text-theme-muted mb-4">Customer Service</h2>
      <h1 class="font-serif text-3xl md:text-5xl text-gray-900 dark:text-white font-light tracking-wide uppercase">Track Order</h1>
      <div class="h-px w-12 bg-theme-gold mx-auto mt-6"></div>
    </div>

    <div class="max-w-md mx-auto bg-gray-50 dark:bg-theme-card p-8 border border-gray-100 dark:border-white/10 rounded-sm shadow-sm">
      <p class="text-center text-xs text-gray-500 dark:text-gray-400 font-light tracking-widest uppercase mb-8">
        Enter your details to track your delivery
      </p>
      
      <form @submit.prevent class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <label class="text-[10px] uppercase tracking-[0.2em] text-gray-600 dark:text-gray-400">Order Number</label>
          <input type="text" placeholder="e.g. TM-12345" class="bg-transparent border-b border-gray-400/50 dark:border-white/20 focus:border-theme-gold outline-none py-2 text-sm font-light transition-colors text-gray-900 dark:text-white placeholder-gray-500/50" required />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-[10px] uppercase tracking-[0.2em] text-gray-600 dark:text-gray-400">Email Address</label>
          <input type="email" placeholder="john@example.com" class="bg-transparent border-b border-gray-400/50 dark:border-white/20 focus:border-theme-gold outline-none py-2 text-sm font-light transition-colors text-gray-900 dark:text-white placeholder-gray-500/50" required />
        </div>
        <button type="submit" class="mt-4 w-full bg-theme-gold text-white dark:text-theme-bg py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-theme-gold/80 transition-colors">
          Track Package
        </button>
      </form>
    </div>
  </div>
</template>