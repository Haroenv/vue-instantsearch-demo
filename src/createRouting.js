import qs from 'qs'
import filterRefinements from './filterRefinements.js'

export default vueRouter => {
  return {
    router: {
      read() {
        return vueRouter.currentRoute.query
      },
      write(routeState) {
        return vueRouter
          .push({
            query: routeState,
          })
          .catch(error => {
            // Ignore NavigationDuplicated errors
            // @see https://github.com/vuejs/vue-router/issues/2872
            if (error.name !== 'NavigationDuplicated') {
              throw error
            }
          })
      },
      createURL(routeState) {
        console.log(
          `createURL() only runs on the ${
            process.server ? 'server' : 'client'
          }`,
        )

        const queryParameters = {}
        const refinements = filterRefinements(routeState)

        if (routeState.query) {
          queryParameters.query = encodeURIComponent(routeState.query)
        }

        if (routeState.page && routeState.page !== 1) {
          queryParameters.page = routeState.page
        }

        if (Object.keys(refinements).length) {
          const key = Object.keys(refinements)[0]
          queryParameters[key] = refinements[key].map(encodeURIComponent)
        }

        const queryString = qs.stringify(queryParameters, {
          addQueryPrefix: true,
          arrayFormat: 'repeat',
        })

        return `${window.location.origin}${window.location.pathname}${queryString}`
      },
      onUpdate(cb) {
        this._onPopState = () => {
          cb(this.read())
        }
        window.addEventListener('popstate', this._onPopState)
      },
      dispose() {
        window.removeEventListener('popstate', this._onPopState)
        this.write()
      },
    },
    stateMapping: {
      routeToState(routeState) {
        const refinementList = {}
        if (routeState) {
          const refinements = filterRefinements(routeState)
          const refinementArr = Object.keys(refinements)
          const refinementLength = refinementArr.length
          let i = 0
          for (; i < refinementLength; i++) {
            const key = refinementArr[i]
            if (!refinements[key]) continue
            refinementList[key] =
              typeof refinements[key] === 'string'
                ? new Array(refinements[key])
                : refinements[key]
            refinementList[key].map(decodeURIComponent)
          }
        }
        return {
          query: routeState.query,
          page: routeState.page,
          refinementList,
        }
      },
      stateToRoute(uiState) {
        const refinementList = {}
        if (uiState && uiState.refinementList) {
          const refinementArr = Object.keys(uiState.refinementList)
          const refinementLength = refinementArr.length
          let i = 0
          for (; i < refinementLength; i++) {
            const key = refinementArr[i]
            refinementList[key] = uiState.refinementList[key]
          }
        }
        return {
          query: uiState.query,
          page: uiState.page,
          ...refinementList,
        }
      },
    },
  }
}
