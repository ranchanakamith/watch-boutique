<script setup lang="ts">
import { ref } from 'vue';
import { shopApi } from '../composables/useShopApi';

const name = ref('');
const email = ref('');
const message = ref('');
const busy = ref(false);
const error = ref('');
const success = ref('');

async function send() {
  busy.value = true;
  error.value = '';
  success.value = '';
  try {
    const result = await shopApi('/contact', 'POST', {
      name: name.value,
      email: email.value,
      message: message.value
    });
    success.value = result.message || 'Your inquiry was sent successfully. We will be in touch shortly.';
    name.value = '';
    email.value = '';
    message.value = '';
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto  md:py-20 px-4 sm:px-6 animate-fade-in transition-colors duration-700">
    
    <!-- Hero Header -->
    <div class="text-center mb-16 md:mb-20">
      <p class="text-[10px] uppercase tracking-[0.4em] text-theme-gold font-medium mb-4">
        Client Concierge &amp; Inquiries
      </p>

      <div class="h-px w-12 bg-theme-gold mx-auto mb-8"></div>
      <p class="text-gray-600 dark:text-gray-300 font-light leading-relaxed tracking-wide max-w-2xl mx-auto text-sm sm:text-base">
        Whether you require assistance curating a timepiece, inquiring about an existing order, or learning more about our bespoke horological collection, our team is at your dedicated service.
      </p>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      
      <!-- Left Column: Direct Contact & Boutique Details (5 cols) -->
      <div class="lg:col-span-5 space-y-6">
        <div class="bg-white dark:bg-theme-card/40 border border-gray-100 dark:border-white/10 rounded-2xl p-8 sm:p-10 relative overflow-hidden shadow-sm dark:shadow-none transition-all duration-700">
          
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-theme-gold to-transparent opacity-60"></div>
          
          <span class="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-theme-muted font-medium block mb-2">
            Direct Concierge
          </span>
          <h2 class="font-serif text-2xl text-gray-900 dark:text-white font-light tracking-wide mb-8">
            Connect With Us
          </h2>

          <div class="space-y-6">
            <!-- Email -->
            <div class="flex items-start gap-4 group">
              <div class="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 group-hover:border-theme-gold transition-colors text-theme-gold">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <span class="block text-[10px] uppercase tracking-widest text-gray-400 dark:text-theme-muted font-medium mb-1">Electronic Mail</span>
                <a href="mailto:ranchanakamith@gmail.com" class="text-sm font-light text-gray-900 dark:text-white hover:text-theme-gold dark:hover:text-theme-gold transition-colors break-all">
                  ranchanakamith@gmail.com
                </a>
                <span class="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Response typically within 24 hours</span>
              </div>
            </div>

            <!-- Phone / Hotline -->
            <div class="flex items-start gap-4 group">
              <div class="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 group-hover:border-theme-gold transition-colors text-theme-gold">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <span class="block text-[10px] uppercase tracking-widest text-gray-400 dark:text-theme-muted font-medium mb-1">Direct Hotline &amp; WhatsApp</span>
                <a href="tel:07714252823" class="text-sm font-light text-gray-900 dark:text-white hover:text-theme-gold dark:hover:text-theme-gold transition-colors">
                  07714252823
                </a>
                <span class="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Available Mon – Sat, 9:00 AM – 7:00 PM</span>
              </div>
            </div>

            <!-- Address -->
            <div class="flex items-start gap-4 group">
              <div class="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 group-hover:border-theme-gold transition-colors text-theme-gold">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <span class="block text-[10px] uppercase tracking-widest text-gray-400 dark:text-theme-muted font-medium mb-1">Boutique Atelier</span>
                <p class="text-sm font-light text-gray-900 dark:text-white leading-relaxed">
                  503/2 Kendakaduwa,<br />
                  Gannoruwa, Peradeniya, Sri Lanka
                </p>
              </div>
            </div>
          </div>

          <!-- Order Note Banner -->
          <div class="mt-8 pt-6 border-t border-gray-100 dark:border-white/5">
            <div class="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-gray-300 font-light leading-relaxed">
              <span class="text-theme-gold text-base shrink-0">✦</span>
              <span>For existing orders, kindly mention your <strong>Order ID</strong> in your message for expedited concierge assistance.</span>
            </div>
          </div>

        </div>
      </div>

      <!-- Right Column: Inquiry Form (7 cols) -->
      <div class="lg:col-span-7">
        <div class="bg-white dark:bg-theme-card/40 border border-gray-100 dark:border-white/10 rounded-2xl p-8 sm:p-10 relative overflow-hidden shadow-sm dark:shadow-none transition-all duration-700">
          
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-theme-gold to-transparent opacity-60"></div>
          
          <span class="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-theme-muted font-medium block mb-2">
            Online Inquiries
          </span>
          <h2 class="font-serif text-2xl text-gray-900 dark:text-white font-light tracking-wide mb-2">
            Send an Inquiry
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 font-light mb-8">
            Complete the form below and an horological specialist will attend to your request.
          </p>

          <form @submit.prevent="send" class="space-y-6">
            
            <!-- Name Input -->
            <div class="space-y-2">
              <label for="contact-name" class="block text-[10px] uppercase tracking-[0.25em] text-gray-600 dark:text-gray-300 font-medium">
                Your Full Name <span class="text-theme-gold">*</span>
              </label>
              <input
                id="contact-name"
                v-model="name"
                autocomplete="name"
                required
                maxlength="100"
                :disabled="busy"
                placeholder="e.g. Johnathan Vance"
                class="w-full text-xs font-light px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all"
              />
            </div>

            <!-- Email Input -->
            <div class="space-y-2">
              <label for="contact-email" class="block text-[10px] uppercase tracking-[0.25em] text-gray-600 dark:text-gray-300 font-medium">
                Email Address <span class="text-theme-gold">*</span>
              </label>
              <input
                id="contact-email"
                v-model="email"
                type="email"
                autocomplete="email"
                required
                maxlength="254"
                :disabled="busy"
                placeholder="e.g. j.vance@luxury.com"
                class="w-full text-xs font-light px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all"
              />
            </div>

            <!-- Message Input -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label for="contact-message" class="block text-[10px] uppercase tracking-[0.25em] text-gray-600 dark:text-gray-300 font-medium">
                  Message <span class="text-theme-gold">*</span>
                </label>
                <span class="text-[10px] text-gray-400 font-light">{{ message.length }} / 5000</span>
              </div>
              <textarea
                id="contact-message"
                v-model="message"
                rows="5"
                required
                maxlength="5000"
                :disabled="busy"
                placeholder="Tell us about the timepiece or order inquiry you wish to discuss..."
                class="w-full text-xs font-light px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all leading-relaxed"
              ></textarea>
            </div>

            <!-- Error Banner -->
            <div
              v-if="error"
              role="alert"
              class="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-light flex items-center gap-3 animate-fade-in"
            >
              <svg class="w-4 h-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span>{{ error }}</span>
            </div>

            <!-- Success Banner -->
            <div
              v-if="success"
              role="status"
              class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-light flex items-center gap-3 animate-fade-in"
            >
              <svg class="w-4 h-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span>{{ success }}</span>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="busy"
              class="w-full py-4 rounded-full bg-theme-gold border border-theme-gold text-white dark:text-theme-bg font-medium uppercase tracking-[0.25em] text-[10px] md:text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg
                v-if="busy"
                class="w-4 h-4 animate-spin text-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span>{{ busy ? 'Transmitting inquiry...' : 'Send Inquiry' }}</span>
            </button>

          </form>

        </div>
      </div>

    </div>

  </div>
</template>
