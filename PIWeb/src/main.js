import { createApp }    from 'vue';
import { createPinia }  from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App              from './App.vue';
import '@shared/styles/brand.css';
import LoginView        from './views/LoginView.vue';
import RegisterView     from './views/RegisterView.vue';
import WelcomeView      from './views/WelcomeView.vue';
import { registerAdapter } from '@fluxforge/shared';
import { httpApi }      from '@shared/api/http.js';
import { useAuthStore } from './stores/useAuthStore.js';

registerAdapter(httpApi);

const pinia = createPinia();

// ── Lazy-load all non-auth views ──────────────────────────────────────────────
const FilesView         = () => import('./views/FilesView.vue');
const ComponentsView    = () => import('./views/ComponentsView.vue');
const MagneticsView     = () => import('./views/MagneticsView.vue');
const ComponentSetsView = () => import('./views/ComponentSetsView.vue');
const HelpView          = () => import('./views/HelpView.vue');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Public routes
    { path: '/login',    component: LoginView,    name: 'login',    meta: { public: true } },
    { path: '/register', component: RegisterView, name: 'register', meta: { public: true } },

    // Default: always land on welcome
    { path: '/',         redirect: { name: 'welcome' } },

    // Remove /new-design and /design as separate URLs.
    // All design work happens through the welcome page + portfolio modal.
    // Keep /design as an alias that just redirects to welcome (handles bookmarks).
    { path: '/design',       redirect: { name: 'welcome' } },
    { path: '/new-design',   redirect: { name: 'welcome' } },

    // Main app routes
    { path: '/welcome',      component: WelcomeView,      name: 'welcome'       },
    { path: '/files',        component: FilesView,         name: 'files'         },
    { path: '/components',   component: ComponentsView,    name: 'components'    },
    { path: '/magnetics',    component: MagneticsView,     name: 'magnetics'     },
    { path: '/component-sets', component: ComponentSetsView, name: 'component-sets' },
    { path: '/help',         component: HelpView,          name: 'help'          },

    // Catch-all: redirect unknown paths to welcome
    { path: '/:pathMatch(.*)*', redirect: { name: 'welcome' } },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  // Not logged in → send to login (except for already-public routes)
  if (!to.meta.public && !auth.isLoggedIn) {
    // Don't try to redirect back to /design or /new-design on login — just go home
    const safeRedirect = ['/design','/new-design','/'].includes(to.fullPath) ? undefined : to.fullPath;
    return { name: 'login', query: safeRedirect ? { redirect: safeRedirect } : {} };
  }

  // Logged in and hitting login/register → go to welcome
  if (to.meta.public && auth.isLoggedIn) {
    return { name: 'welcome' };
  }
});

const app = createApp(App);
app.use(pinia);
app.use(router);
app.mount('#app');
