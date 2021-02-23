import Vue from 'vue';

const eventBus = new Vue();

Vue.prototype.$EventBus = eventBus;

export default eventBus;
