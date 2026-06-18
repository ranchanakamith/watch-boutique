import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AboutView from '../views/AboutView.vue'
import ContactView from '../views/ContactView.vue'

// Import the new views
import TrackOrderView from '../views/TrackOrderView.vue'
import ShippingView from '../views/ShippingView.vue'
import ReturnsView from '../views/ReturnsView.vue'
import WarrantyView from '../views/WarrantyView.vue'
import FaqView from '../views/FaqView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  
  // This automatically scrolls to top on every page change!
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },

  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView
    },
    {
      path: '/contact',
      name: 'contact',
      component: ContactView
    },
    // Add the new routes here
    {
      path: '/track-order',
      name: 'track-order',
      component: TrackOrderView
    },
    {
      path: '/shipping',
      name: 'shipping',
      component: ShippingView
    },
    {
      path: '/returns',
      name: 'returns',
      component: ReturnsView
    },
    {
      path: '/warranty',
      name: 'warranty',
      component: WarrantyView
    },
    {
      path: '/faq',
      name: 'faq',
      component: FaqView
    }
  ]
})

export default router