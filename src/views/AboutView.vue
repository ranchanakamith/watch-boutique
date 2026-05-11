<template>
  <div class="max-w-4xl mx-auto py-20 animate-fade-in transition-colors duration-700">
    
    <div class="text-center mb-24">
      <h2 class="font-serif text-3xl text-gray-900 dark:text-white mb-8 tracking-wide font-light">Our Heritage</h2>
      <div class="h-px w-12 bg-theme-gold mx-auto mb-10"></div>
      <p class="text-gray-600 dark:text-gray-300 font-light leading-relaxed tracking-wide mb-8">
        Founded on the principles of precision and elegance, The Premium Watch Boutique is a curator of the world's finest timepieces. We believe that a watch is more than an instrument that tells time; it is a legacy passed down through generations, a testament to master craftsmanship, and a reflection of personal style.
      </p>
    </div>

    <div class="bg-white dark:bg-theme-card/30 border rounded-xl border-gray-100 dark:border-white/10 p-12 text-center relative overflow-hidden shadow-sm dark:shadow-none transition-all duration-700">
      
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-theme-gold to-transparent opacity-50"></div>
      
      <p class="text-gray-400 dark:text-theme-muted text-[10px] tracking-[0.4em] uppercase mb-10">About the Architect</p>
      
      <div class="relative w-32 h-32 mx-auto mb-10 rounded-full border-2 border-theme-gold p-1 shadow-lg dark:shadow-none overflow-hidden transition-all duration-700">
        <img 
          src="../assets/my-photo.jpg" 
          class="w-full h-full rounded-full object-cover  hover:grayscale-0 transition-all duration-700" 
          alt="Profile Photo"
        />
      </div>

      <h3 class="font-serif text-2xl md:text-3xl text-gray-900 dark:text-white tracking-wide font-light mb-2">
        H.P.G.R. Kamith Samaraweera
      </h3>
      
      <p class="text-theme-gold text-[10px] md:text-xs tracking-widest uppercase mb-8">Computer Engineer & Web Developer</p>
      
      <p class="text-gray-600 dark:text-gray-300 font-light leading-relaxed tracking-wide mb-10 max-w-2xl mx-auto">
        Currently a second-year undergraduate studying Computer Engineering at the University of Ruhuna, with a proud educational foundation rooted at Dharmaraja College. Kamith specializes in architecting modern, data-driven single-page applications. This boutique platform serves as a demonstration of seamless aesthetic design integrated with robust software engineering principles.
      </p>
      
      <a 
        href="https://www.linkedin.com/in/kamith-samaraweera-207024312" 
        target="_blank" 
        rel="noopener noreferrer"
        class="inline-flex items-center gap-4 rounded-full border border-gray-300 dark:border-white/20 hover:border-theme-gold dark:hover:border-theme-gold px-8 py-4 text-[10px] uppercase tracking-[0.2em] text-gray-600 dark:text-gray-300 hover:text-theme-gold dark:hover:text-theme-gold transition-all duration-500"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
        Connect on LinkedIn
      </a>
    </div>

  </div>
</template>

<script setup lang="ts">
// No extra imports needed for the image when using a relative path directly in the template
</script>