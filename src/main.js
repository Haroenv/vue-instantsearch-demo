import Vue from 'vue'
import { createInstantSearch } from 'vue-instantsearch'
import algoliasearch from 'algoliasearch/lite'
import App from './App.vue'
import { createRouter } from './router'
import createRouting from './createRouting.js'

const searchClient = algoliasearch(
  process.env.VUE_APP_ALGOLIA_API_KEY || 'latency',
  process.env.VUE_APP_ALGOLIA_APP_ID || '6be0576ff61c053d5f9a3225e2a90f76',
)

Vue.config.productionTip = false

export async function createApp({
  beforeApp = () => {},
  afterApp = () => {},
} = {}) {
  const router = createRouter()
  const routing = createRouting(router)
  const { instantsearch, rootMixin } = createInstantSearch({
    indexName: process.env.VUE_APP_ALGOLIA_INDEX_NAME || 'instant_search',
    routing,
    searchClient,
  })

  await beforeApp({
    router,
    instantsearch,
  })

  const app = new Vue({
    mixins: [rootMixin],
    router,
    render: h => h(App),
  })

  const result = {
    app,
    router,
    instantsearch,
  }

  await afterApp(result)

  return result
}
