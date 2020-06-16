import Vue from 'vue'
import VueInstantSearch, { createServerRootMixin } from 'vue-instantsearch'
import algoliasearch from 'algoliasearch/lite'
import qs from 'qs'
import App from './App.vue'
import { createRouter } from './router'
// import createRouting from './createRouting.js'

const searchClient = algoliasearch(
  process.env.VUE_APP_ALGOLIA_API_KEY || 'latency',
  process.env.VUE_APP_ALGOLIA_APP_ID || '6be0576ff61c053d5f9a3225e2a90f76',
)

Vue.config.productionTip = false

export async function createApp({
  beforeApp = () => {},
  afterApp = () => {},
  context,
} = {}) {
  const router = createRouter()
  // const routing = createRouting(router)

  // provide access to all components
  Vue.use(VueInstantSearch)

  await beforeApp({ router })

  const app = new Vue({
    mixins: [
      createServerRootMixin({
        indexName: 'instant_search',
        searchClient,
        routing: {
          router: {
            read() {
              const url = context
                ? context.url
                : typeof window.location === 'object'
                ? window.location.href
                : ''
              const search = url.slice(url.indexOf('?'))

              return qs.parse(search, {
                ignoreQueryPrefix: true,
              })
            },
            write(routeState) {
              const query = qs.stringify(routeState, {
                addQueryPrefix: true,
              })

              if (typeof history === 'object') {
                history.pushState(routeState, null, query)
              }
            },
            createURL(routeState) {
              console.log(
                `createURL() only runs on the ${
                  process.server ? 'server' : 'client'
                }`,
              )

              const query = qs.stringify(routeState, {
                addQueryPrefix: true,
              })

              return query
            },
            onUpdate(callback) {
              if (typeof window !== 'object') {
                return
              }
              // TODO: handle vue route changes
              this._onPopState = event => {
                if (this.writeTimer) {
                  window.clearTimeout(this.writeTimer)
                  this.writeTimer = undefined
                }

                const routeState = event.state

                // At initial load, the state is read from the URL without update.
                // Therefore the state object is not available.
                // In this case, we fallback and read the URL.
                if (!routeState) {
                  callback(this.read())
                } else {
                  callback(routeState)
                }
              }

              window.addEventListener('popstate', this._onPopState)
            },
            dispose() {
              if (this._onPopState && typeof window == 'object') {
                window.removeEventListener('popstate', this._onPopState)
              }

              // we purposely don't write on dispose, to prevent double entries on navigation
              // TODO: this should be an option in the real router
            },
          },
        },
        stateMapping: {
          routeToState(routeState) {
            console.log(routeState)
            return {
              query: routeState.query,
              page: routeState.page,
            }
          },
          stateToRoute(uiState) {
            console.log(uiState)
            return {
              query: uiState.query,
              page: uiState.page,
            }
          },
        },
      }),
    ],
    serverPrefetch() {
      return this.instantsearch.findResultsState(this)
    },
    beforeMount() {
      if (typeof window === 'object' && window.__ALGOLIA_STATE__) {
        this.instantsearch.hydrate(window.__ALGOLIA_STATE__)
        delete window.__ALGOLIA_STATE__
      }
    },
    router,
    render: h => h(App),
  })

  const result = {
    app,
    router,
  }

  await afterApp(result)

  return result
}
