import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  
  // This automatically scrolls to top on every page change!
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },

  routes: [
    { path: '/:pathMatch(.*)*', component: () => import('../views/NotFoundView.vue') },
    { path: '/account/security', component: () => import('../views/AccountSecurityView.vue') },
    { path: '/account/forgot-password', component: () => import('../views/AccountRecoveryView.vue') },
    { path: '/account/reset-password', component: () => import('../views/AccountRecoveryView.vue') },
    { path: '/account/verify-email', component: () => import('../views/AccountRecoveryView.vue') },
    { path: '/checkout', component: () => import('../views/CheckoutView.vue') },
    { path: '/orders', component: () => import('../views/OrdersView.vue') },
    { path: '/admin', component: () => import('../views/AdminView.vue') },
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue')
    },
    {
      path: '/contact',
      name: 'contact',
      component: () => import('../views/ContactView.vue')
    },
    {
      path: '/watch/:id',
      name: 'watch',
      component: () => import('../views/WatchView.vue'),
      props: true
    },
    // Add the new routes here
    {
      path: '/track-order',
      name: 'track-order',
      component: () => import('../views/TrackOrderView.vue')
    },
    {
      path: '/shipping',
      name: 'shipping',
      component: () => import('../views/ShippingView.vue')
    },
    {
      path: '/returns',
      name: 'returns',
      component: () => import('../views/ReturnsView.vue')
    },
    {
      path: '/warranty',
      name: 'warranty',
      component: () => import('../views/WarrantyView.vue')
    },
    {
      path: '/faq',
      name: 'faq',
      component: () => import('../views/FaqView.vue')
    }
  ]
})

export default router
