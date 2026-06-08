<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'; 
import { useCart } from './composables/useCart';
import { useWishlist } from './composables/useWishlist';
import { useAuth } from './composables/useAuth';

// IMPORT THE FOOTER COMPONENT
import SiteFooter from './components/SiteFooter.vue';

const route = useRoute();
const router = useRouter();

const { cart, removeFromCart, clearCart, cartTotal, cartItemCount } = useCart();
const { wishlist, toggleWishlist, removeFromWishlist, clearWishlist } = useWishlist();
const { isAuthenticated, user, isLoading, login, register, logout } = useAuth();

const isDarkMode = ref(false); 
const isCartOpen = ref(false);
const isWishlistOpen = ref(false);

// Modal States
const isLoginModalOpen = ref(false);
const isRegisterMode = ref(false); // Toggles between Login and Register views
const authForm = ref({ name: '', username: '', password: '' });

const refreshKey = ref(0);

const resetHomeFilters = () => {
  if (route.path === '/') {
    refreshKey.value++; 
  }
};

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  if (isDarkMode.value) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
};

const openAuthModal = (mode: 'login' | 'register') => {
  isRegisterMode.value = mode === 'register';
  authForm.value = { name: '', username: '', password: '' };
  
  // Pre-fill dummy data ONLY on the login screen for testing convenience
  if (!isRegisterMode.value) {
    authForm.value.username = 'emilys';
    authForm.value.password = 'emilyspass';
  }
  
  isLoginModalOpen.value = true;
};

// Handle Unified Form Submit
const handleAuthSubmit = async () => {
  let success = false;
  
  if (isRegisterMode.value) {
    success = await register(authForm.value.username, authForm.value.password, authForm.value.name);
  } else {
    success = await login(authForm.value.username, authForm.value.password);
  }

  if (success) {
    isLoginModalOpen.value = false;
  }
};

onMounted(() => {
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
});
</script>

<template>
  <!-- ADDED: flex and flex-col, moved padding to the main tag -->
  <div class="min-h-screen flex flex-col transition-colors duration-700 bg-[white] dark:bg-theme-bg font-sans text-gray-900 dark:text-white selection:bg-theme-gold selection:text-black relative overflow-x-hidden">
    
    <div class="fixed top-6 right-2 md:top-12 md:right-19 flex items-center gap-5 sm:gap-6 z-40 backdrop-blur-md bg-[#F8F9FA]/80 dark:bg-theme-bg/80 px-6 py-3 rounded-full border border-gray-200/50 dark:border-white/10">
      
      <button v-if="!isAuthenticated" @click="openAuthModal('login')" class="text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-theme-gold transition-colors">
        Sign In
      </button>
      
      <div v-else class="flex items-center gap-4 group relative">
        <span class="text-[10px] uppercase tracking-[0.2em] text-theme-gold hidden sm:flex items-center gap-2 cursor-pointer">
          <img v-if="user?.image" :src="user.image" class="w-4 h-4 rounded-full bg-gray-200" alt="User" />
          Client Access
        </span>
        
        <div class="absolute top-full right-16 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white dark:bg-theme-card shadow-2xl p-5 border border-gray-100 dark:border-white/10 pointer-events-none z-50 flex flex-col gap-1 min-w-[150px]">
          <p class="text-sm font-serif text-gray-900 dark:text-white">{{ user?.name }}</p>
          <p class="text-[9px] uppercase tracking-widest text-gray-400">{{ user?.email }}</p>
        </div>

        <button @click="logout" class="text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-red-400 transition-colors">
          Sign Out
        </button>
      </div>

      <div class="w-[1px] h-3 bg-gray-300 dark:bg-gray-700 hidden sm:block"></div>

      <button @click="toggleTheme" class="text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-theme-gold transition-colors">
        <span v-if="isDarkMode">☀Light</span>
        <span v-else> ☾        Dark </span>
      </button>

      <button @click="isWishlistOpen = true" class="relative text-gray-500 hover:text-theme-gold transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
        <span v-if="wishlist.length > 0" class="absolute -top-1 -right-2 bg-theme-gold text-white text-[8px] rounded-full h-3 w-3 flex items-center justify-center">{{ wishlist.length }}</span>
      </button>

      <button @click="isCartOpen = true" class="relative text-gray-500 hover:text-theme-gold transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
        <span v-if="cartItemCount > 0" class="absolute -top-1 -right-2 bg-theme-gold text-white text-[8px] rounded-full h-3 w-3 flex items-center justify-center">{{ cartItemCount }}</span>
      </button>
    </div>

    <!-- ADDED: Main wrapper with flex-grow and padding to push footer down -->
    <main class="flex-grow flex flex-col p-8 md:p-16">
      <header class="mb-16 text-center mt-16 md:mt-20 flex flex-col items-center">
        <h1 @click="route.path === '/' ? resetHomeFilters() : router.push('/')" class="animate-glow cursor-pointer text-3xl md:text-5xl font-serif text-gray-900 dark:text-white tracking-[0.25em] uppercase font-light mb-6 transition-colors duration-700 hover:text-theme-gold dark:hover:text-theme-gold">
          The Premium <br class="md:hidden" /> Watch Boutique
        </h1>
        <div class="h-[1px] w-12 bg-theme-gold mb-8"></div>
        
        <nav class="flex items-center gap-8 text-[10px] uppercase tracking-[0.3em] font-medium">
          <RouterLink to="/" @click="resetHomeFilters" class="text-gray-500 hover:text-theme-gold transition-colors pb-1 border-b border-transparent hover:border-theme-gold" active-class="text-theme-gold border-theme-gold">Home</RouterLink>
          <RouterLink to="/about" class="text-gray-500 hover:text-theme-gold transition-colors pb-1 border-b border-transparent hover:border-theme-gold" active-class="text-theme-gold border-theme-gold">About</RouterLink>
          <RouterLink to="/contact" class="text-gray-500 hover:text-theme-gold transition-colors pb-1 border-b border-transparent hover:border-theme-gold" active-class="text-theme-gold border-theme-gold">Contact</RouterLink>
        </nav>
      </header>

      <RouterView v-slot="{ Component }">
        <component :is="Component" :key="$route.fullPath + refreshKey" />
      </RouterView>
    </main>

    <!-- NEW FOOTER INTEGRATED HERE -->
    <SiteFooter />

    <!-- Modals and Sliders stay exactly the same below -->
    <div v-if="isLoginModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" @click="isLoginModalOpen = false"></div>
      
      <div class="relative backdrop-blur-2xl bg-white/40 dark:bg-theme-bg/50 w-full max-w-md p-10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/50 dark:border-white/10 rounded-xl animate-fade-in mx-4">
        <button @click="isLoginModalOpen = false" class="absolute top-6 right-6 text-2xl font-light text-gray-500 dark:text-gray-400 hover:text-theme-gold transition-colors">&times;</button>
        
        <h3 class="font-serif text-2xl font-light text-gray-900 dark:text-white mb-2">
          {{ isRegisterMode ? 'Create Account' : 'Client Portal' }}
        </h3>
        <p class="text-xs text-gray-600 dark:text-gray-400 tracking-widest uppercase mb-8">
          {{ isRegisterMode ? 'Join our exclusive boutique' : 'Access your premium account' }}
        </p>
        
        <form @submit.prevent="handleAuthSubmit" class="flex flex-col gap-6">
          
          <div v-if="isRegisterMode" class="flex flex-col gap-2">
            <label class="text-[10px] uppercase tracking-[0.2em] text-gray-600 dark:text-gray-400">Full Name</label>
            <input v-model="authForm.name" type="text" placeholder="John Doe" class="bg-transparent border-b border-gray-400/50 dark:border-white/20 focus:border-theme-gold outline-none py-2 text-sm font-light transition-colors text-gray-900 dark:text-white placeholder-gray-500/50" :required="isRegisterMode" />
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-[10px] uppercase tracking-[0.2em] text-gray-600 dark:text-gray-400">Email Address / Username</label>
            <input v-model="authForm.username" type="text" placeholder="john@example.com" class="bg-transparent border-b border-gray-400/50 dark:border-white/20 focus:border-theme-gold outline-none py-2 text-sm font-light transition-colors text-gray-900 dark:text-white placeholder-gray-500/50" required />
          </div>
          
          <div class="flex flex-col gap-2">
            <label class="text-[10px] uppercase tracking-[0.2em] text-gray-600 dark:text-gray-400">Password</label>
            <input v-model="authForm.password" type="password" class="bg-transparent border-b border-gray-400/50 dark:border-white/20 focus:border-theme-gold outline-none py-2 text-sm font-light transition-colors text-gray-900 dark:text-white placeholder-gray-500/50" required />
          </div>
          
          <div class="flex flex-col gap-3 mt-4">
            <button type="submit" :disabled="isLoading" class="w-full bg-theme-gold text-white dark:text-theme-bg py-4 text-xs uppercase rounded-full border  tracking-[0.2em] font-medium hover:bg-theme-gold/80 transition-colors disabled:opacity-50 shadow-lg">
              {{ isLoading ? 'Processing...' : (isRegisterMode ? 'Complete Registration' : 'Secure Sign In') }}
            </button>

            <button type="button" @click="isRegisterMode = !isRegisterMode" class="w-full bg-white/20 dark:bg-black/20 border rounded-full border border-gray-900/20 dark:border-white/20 text-gray-900 dark:text-white py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-white/40 dark:hover:bg-white/10 transition-colors backdrop-blur-md">
              {{ isRegisterMode ? 'Already have an account? Sign In' : 'Create an Account' }}
            </button>
          </div>
        </form>
        
      </div>
    </div>

   <div v-if="isWishlistOpen" @click="isWishlistOpen = false" class="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] transition-opacity duration-500"></div>
    
    <div class="fixed top-0 right-0 h-full w-80 md:w-96 backdrop-blur-md bg-[#F8F9FA]/80 dark:bg-theme-bg/80 shadow-[20px_0_40px_rgba(0,0,0,0.08)] z-[110] transform transition-transform duration-700 ease-in-out border-l border-gray-200/50 dark:border-white/10 rounded-l-3xl p-8 flex flex-col" :class="isWishlistOpen ? 'translate-x-0' : 'translate-x-full'">
                                                              
      <div class="flex justify-between items-center mb-8">
        <h3 class="font-serif text-2xl font-light">Wishlist</h3>
        <button @click="isWishlistOpen = false" class="text-2xl font-light hover:text-theme-gold transition-colors">&times;</button>
      </div>
      <div v-if="wishlist.length === 0" class="text-gray-500 text-sm font-light uppercase tracking-widest text-center mt-10">Your wishlist is empty.</div>
      <div v-if="wishlist.length > 0" class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-white/10">
        <span class="text-[10px] uppercase tracking-[0.2em] text-gray-900">{{ wishlist.length }} Items</span>
        <button @click="clearWishlist" class="text-[10px] uppercase tracking-[0.2em] text-red-400 hover:text-red-600 transition-colors border-b border-transparent hover:border-red-600 pb-0.5">Clear Wishlist</button>
      </div>
      <div class="flex-grow overflow-y-auto space-y-6 pr-2">
        <div v-for="item in wishlist" :key="item.id" class="flex gap-4 border-b border-gray-100 dark:border-white/10 pb-4">
          <img :src="item.thumbnail" class="w-16 h-16 object-cover bg-gray-50 dark:bg-theme-card rounded-md" />
          <div class="flex flex-col justify-between flex-grow">
            <h4 class="text-sm font-serif truncate pr-4">{{ item.title }}</h4>
            <p class="text-theme-gold text-xs tracking-widest mt-1">${{ item.price.toLocaleString() }}</p>
            <button @click="removeFromWishlist(item.id)" class="text-[9px] uppercase tracking-[0.2em] text-gray-500 self-start hover:text-red-500 transition-colors mt-2">Remove</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isCartOpen" @click="isCartOpen = false" class="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] transition-opacity duration-500"></div>
    
    <div class="fixed top-0 right-0 h-full w-80 md:w-96 backdrop-blur-md bg-[#F8F9FA]/80 dark:bg-theme-bg/80 shadow-[20px_0_40px_rgba(0,0,0,0.08)] z-[110] transform transition-transform duration-700 ease-in-out border-l border-gray-200/50 dark:border-white/10 rounded-l-3xl p-8 flex flex-col" :class="isCartOpen ? 'translate-x-0' : 'translate-x-full'">
     
      <div class="flex justify-between items-center mb-8">
        <h3 class="font-serif text-2xl font-light">Your Bag</h3>
        <button @click="isCartOpen = false" class="text-2xl font-light hover:text-theme-gold transition-colors">&times;</button>
      </div>
      <div v-if="cart.length === 0" class="text-gray-500 text-sm font-light uppercase tracking-widest text-center mt-10">Your bag is empty.</div>
      <div v-if="cart.length > 0" class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-white/10">
        <span class="text-[10px] uppercase tracking-[0.2em] text-gray-900">{{ cartItemCount }} Items</span>
        <button @click="clearCart" class="text-[10px] uppercase tracking-[0.2em] text-red-400 hover:text-red-600 transition-colors border-b border-transparent hover:border-red-600 pb-0.5">Clear Bag</button>
      </div>
      <div class="flex-grow overflow-y-auto space-y-6 pr-2">
        <div v-for="item in cart" :key="item.id" class="flex gap-4 border-b border-gray-100 dark:border-white/10 pb-4">
          <img :src="item.thumbnail" class="w-16 h-16 object-cover bg-gray-50 dark:bg-theme-card rounded-md" />
          <div class="flex flex-col justify-between flex-grow">
            <h4 class="text-sm font-serif truncate pr-4">{{ item.title }}</h4>
            <div class="flex justify-between items-center mt-1">
              <p class="text-gray-500 text-xs">Qty: {{ item.quantity }}</p>
              <p class="text-theme-gold text-xs tracking-widest">${{ (item.price * item.quantity).toLocaleString() }}</p>
            </div>
            <button @click="removeFromCart(item.id)" class="text-[9px] uppercase tracking-[0.2em] text-gray-500 self-start hover:text-red-500 transition-colors mt-2">Remove</button>
          </div>
        </div>
      </div>
      <div v-if="cart.length > 0" class="pt-6 border-t border-gray-100 dark:border-white/10 mt-auto">
        <div class="flex justify-between items-center mb-6">
          <span class="text-sm uppercase tracking-widest text-gray-500">Subtotal</span>
          <span class="font-serif tracking-wide text-lg">${{ cartTotal.toLocaleString() }}</span>
        </div>
        <button v-if="isAuthenticated" class="w-full bg-theme-gold text-white dark:text-theme-bg py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-theme-gold/80 transition-colors">
          Secure Checkout
        </button>
        <button v-else @click="isCartOpen = false; openAuthModal('login')" class="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 text-xs uppercase rounded-full border tracking-[0.2em] font-medium hover:opacity-80 transition-opacity">
          Sign In to Checkout
        </button>
      </div>
    </div>
  </div>
</template>

<style>
.animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-glow { animation: luxury-glow 4s ease-in-out infinite; }
@keyframes luxury-glow {
  0%, 100% { text-shadow: 0 0 10px rgba(197, 160, 89, 0.1), 0 0 20px rgba(197, 160, 89, 0.05); }
  50% { text-shadow: 0 0 15px rgba(197, 160, 89, 0.4), 0 0 30px rgba(197, 160, 89, 0.2), 0 0 45px rgba(197, 160, 89, 0.1); }
}
</style>