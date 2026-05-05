<template>
  <div class="max-w-5xl mx-auto py-20 animate-fade-in transition-colors duration-700">
    
    <div class="text-center mb-16">
      <h2 class="font-serif text-3xl text-gray-900 dark:text-white mb-8 tracking-wide font-light">Bespoke Inquiries</h2>
      <div class="h-px w-12 bg-theme-gold mx-auto"></div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
      
      <div class="bg-white dark:bg-theme-card/30 border border-gray-100 dark:border-white/10 p-12 relative overflow-hidden shadow-sm dark:shadow-none transition-colors duration-700">
        
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-theme-gold to-transparent opacity-50"></div>
        
        <h3 class="font-serif text-2xl text-gray-900 dark:text-white tracking-wide font-light mb-12">Direct Contact</h3>
        
        <div class="flex flex-col gap-10">
          <div class="group">
            <p class="text-gray-400 dark:text-theme-muted text-[10px] tracking-[0.4em] uppercase mb-2">Email Address</p>
            <a href="mailto:ranchanakamith@gmail.com" class="font-serif text-lg text-gray-600 dark:text-gray-300 group-hover:text-theme-gold dark:group-hover:text-theme-gold transition-colors duration-300">
              ranchanakamith@gmail.com
            </a>
          </div>
          
          <div class="group">
            <p class="text-gray-400 dark:text-theme-muted text-[10px] tracking-[0.4em] uppercase mb-2">Phone</p>
            <a href="tel:07714252823" class="font-serif text-lg text-gray-600 dark:text-gray-300 group-hover:text-theme-gold dark:group-hover:text-theme-gold transition-colors duration-300">
              07714252823
            </a>
          </div>
          
          <div>
            <p class="text-gray-400 dark:text-theme-muted text-[10px] tracking-[0.4em] uppercase mb-2">Location</p>
            <p class="font-serif text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              503/2 Kendakaduwa,<br/>
              Gannoruwa, Peradeniya
            </p>
          </div>
        </div>
      </div>

      <form class="flex flex-col gap-8" @submit.prevent>
        <p class="text-gray-500 dark:text-theme-muted text-xs tracking-widest font-light leading-relaxed mb-4">
          Prefer to send a direct message? Fill out the form below and we will get back to you promptly.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="relative">
            <span class="block text-gray-400 dark:text-theme-muted text-[10px] uppercase tracking-widest font-light mb-2">First Name</span>
            <input type="text" class="w-full bg-transparent border-b border-gray-300 dark:border-white/20 focus:border-theme-gold dark:focus:border-theme-gold outline-none py-2 text-sm font-light text-gray-900 dark:text-white transition-colors" />
          </div>
          <div class="relative">
            <span class="block text-gray-400 dark:text-theme-muted text-[10px] uppercase tracking-widest font-light mb-2">Last Name</span>
            <input type="text" class="w-full bg-transparent border-b border-gray-300 dark:border-white/20 focus:border-theme-gold dark:focus:border-theme-gold outline-none py-2 text-sm font-light text-gray-900 dark:text-white transition-colors" />
          </div>
        </div>
        
        <div class="relative">
          <span class="block text-gray-400 dark:text-theme-muted text-[10px] uppercase tracking-widest font-light mb-2">Email Address</span>
          <input type="email" class="w-full bg-transparent border-b border-gray-300 dark:border-white/20 focus:border-theme-gold dark:focus:border-theme-gold outline-none py-2 text-sm font-light text-gray-900 dark:text-white transition-colors" />
        </div>
        
        <div class="relative">
          <span class="block text-gray-400 dark:text-theme-muted text-[10px] uppercase tracking-widest font-light mb-2">Message</span>
          <textarea rows="4" class="w-full bg-transparent border-b border-gray-300 dark:border-white/20 focus:border-theme-gold dark:focus:border-theme-gold outline-none py-2 text-sm font-light text-gray-900 dark:text-white transition-colors resize-none"></textarea>
        </div>
        
        <button class="w-full bg-theme-gold text-white dark:text-theme-bg py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-theme-gold/80 transition-colors mt-4">
          Send Inquiry
        </button>
      </form>
      
    </div>
  </div>
</template>