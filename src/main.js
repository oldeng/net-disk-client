import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import './tools/index';
import './plugins/element';
import './plugins/EventBus';

import uploader from 'vue-simple-uploader/src';
Vue.use(uploader);

Vue.config.productionTip = false;

new Vue({
	router,
	store,
	render: h => h(App)
}).$mount('#app');
