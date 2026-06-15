import { createApp }       from 'vue';
import { createPinia }     from 'pinia';
import App                 from './App.vue';
import { registerAdapter } from '@fluxforge/shared';
import { tauriApi }        from './api/tauri.js';

// Register the Tauri adapter before any component mounts and calls the store
registerAdapter(tauriApi);

createApp(App)
  .use(createPinia())
  .mount('#app');
