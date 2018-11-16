const puppeteer = require('puppeteer')
const fs = require('fs')

const {
  loginPage,
  homePage,
  debug
} = require('../config')

const {
  delay
} = require('./functions')

const Cache = require('./cache')

module.exports = class Battlemap {
  constructor(credentials) {
    this.instance = null
    this.page = null
    this.cache = null
  }

  async exit() {
    if(this.restartTimer) {
      this.restartTimer = clearTimeout(this.restartTimer)
    }

    if (this.instance) return this.instance.close()

    return Promise.resolve()
  }

  async init(credentials) {
    console.log('Init started')

    if (!this.cache) {
      this.cache = new Cache()
      await this.cache.init()
    }

    if (credentials) this.credentials = credentials

    await this.exit()

    this.instance = await puppeteer.launch({
      userDataDir: './.userData',
      headless: !!debug,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    })

    this.page = await this.instance.newPage()

    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 6.2 WOW64) AppleWebKit/538.1 (KHTML, like Gecko) Safari/538.1')

    await this.page.setViewport({
      width: 1920,
      height: 1080,
      isMobile: false,
      hasTouch: false,
      isLandscape: true
    })

    if (debug) {
      if (debug === 'verbose') {
        this.page.on('request', request => console.log('REQUEST', request.url()))
        this.page.on('console', msg => console.log('CONSOLE', msg._text))
      }

      this.page.on('pageerror', err => {
        console.log('PAGE Error')
        console.error(err)
      })
    }

    await this.page.goto(homePage)

    if (await this.isLoginNeeded(3000)) {
      await this.login(credentials)
    }

    console.log('Setting up periodic restarter')
    this.restartTimer = setTimeout(() => this.init(), 24 * 60 * 60 * 1000)

    if (debug) console.log('Init done')
  }

  // Auth section
  async login(credentials) {
    console.log('Login started')

    if (debug) {
      await this.screenshot('.debug/loginHard.png')
    }

    if (debug) {
      console.log('Hard login started')
      await this.screenshot('.debug/LoginStageEmail.png')
    }

    console.log('Credentials', credentials)
    await this.page.goto(loginPage)

    if (!(await this.isLoginNeeded(3000))) {
      return true
    }

    try {
      await this.page.waitForSelector('#Email', { timeout: 1000 })
      await this.page.type('#Email', credentials.email) //, { delay: 25 })

      await this.page.click('#next')
      await this.page.waitForNavigation()

      await this.page.waitForSelector('#Passwd', { timeout: 1000 })
      await this.page.type('#Passwd', credentials.password) //, { delay: 25 })

      await this.page.click('#signIn')
      await this.page.waitForNavigation()

      try {
        await this.page.waitForSelector('#skipChallenge,#challengePickerList', { timeout: 500 })
        console.error('Waiting for 2Way challenge')
        await this.isLoginNeeded(15000) // Waiting 15s for 2Way to complete
      } catch (err) { }

      if (await this.isLoginNeeded(5000)) {
        await this.screenshot('.debug/loginFailed.png')
        throw new Error('Login failed')
      }
    } catch (err) {
      await this.screenshot('.debug/missingForm.png')
      throw new Error('Google form not found in time!' + err.message)
    }

    return true
  }

  async isLoginNeeded(timeout = 1) {
    if (debug) {
      await this.screenshot('.debug/isLoginNeeded.png')
    }

    try {
      await this.page.waitForSelector('#user-auth-id', { timeout })
      console.log('Login is not needed')
      return false
    } catch (err) {
      console.log('Login is needed')
      return true
    }
  }

  // Generic functions section
  async evaluate(functionToCall, ...params) {
    return this.page.evaluate(functionToCall, ...params)
  }

  async getApiData(queryEndpoint, requestData = {}, method = 'post', isRecursion = false) {
    if (debug === 'verbose') console.log('Getting api data', queryEndpoint, requestData, method, isRecursion)

    const result = this.page.evaluate((queryEndpoint, requestData, method) => {
      // This one has silenced errors
      // return window.ajaxController.getValues(queryEndpoint, method, customRequestData)
      try {
        /* global $ */
        return new Promise((resolve, reject) => {
          // Set security timeout
          // const timeoutTimer = setTimeout(() => reject({code: 999}), 10000)
          $.ajax({
            type: method,
            url: queryEndpoint,
            data: requestData,
            headers: {
              'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            async: !1,
            success: (data, state, response) => {
              // clearTimeout(timeoutTimer)
              resolve({ data, state, response })
            },
            error: (response, state, message) => {
              // clearTimeout(timeoutTimer)
              resolve({ response, state, message }) // TODO: This is ugly but we need response object
            },
            timeout: 10000
          })
        })
      } catch (err) {
        return Promise.resolve(err.message)
      }
    }, queryEndpoint, requestData, method)
      .then(data => {
        if (debug === 'verbose') console.log('Got response', data)
        if (data.state !== 'success' || data.response.status !== 200) {
          const error = new Error(data.response.responseJSON || data.response.statusText)
          error.code = data.response.status
          throw error
        }

        return data.data
      })
      .then(data => {
        if (typeof data === 'string') {
          try {
            return JSON.parse(data)
          } catch (err) {
            console.error('Failed to parse JSON')
            console.log(data)
            return data
          }
        }

        return data
      })
      .catch(async err => {
        console.error(err)
        if (!err.code) throw err

        let newError

        switch (err.code) {
          case 401:
          case 419:
            console.log('Got unauthorized')
            if (isRecursion) break
            console.log('Doing reauth on fly')
            await this.login(this.credentials)
            return this.getApiData(queryEndpoint, requestData, method, true)
          // break

          case 500:
            console.error('BattleMap crashed')
            newError = new Error('BattleMap crashed with error 500')
            newError.code = 500
            throw newError
          // break

          case 999: // TODO: Find the way to throw it...
            console.error('PhantomJS crashed... recovering')
            await this.init(this.credentials)
            newError = new Error('PhantomJS crashed... Probably from some syntax error')
            newError.code = 500
            throw newError
          // break
        }

        newError = new Error('BattleMap request failed from some reason')
        newError.code = err.code || 500
        newError.data = err.message
        throw newError
      })

    return result
  }

  async screenshot(fileName, options = {}) {
    if (debug === 'verbose') console.log('getting screenshot')
    return this.page.screenshot({ path: fileName, ...options })
  }

  async getSearchQuery(queryString, faction = 0) {
    return this.getApiData('/search', { term: queryString, faction: faction }, 'get')
  }

  // Predefined queries
  getBattles({resolution = 96, factions = [1, 2, 3, 4]}) {
    return this.getApiData('get-battles', { factions, resolution })
    /* return this.page.evaluate(function() {
      return window.battleLogAPIController.getBattles({})
    }) */
  }

  async getIdFromQuery(queryName) {
    const searchData = await this.getSearchQuery(queryName)

    if (!searchData.length) {
      throw new Error(queryName + ' not found')
    }

    return searchData.pop().id
  }

  async checkHealth() {
    return this.page.evaluateAsync(() => {
      return !!Promise
    })
  }

  async getPagedRequest(endpoint, queryData, dataPathKey, lastIdParamPrefix, startWithLastId) {
    let response = (await this.getApiData(endpoint, {...queryData, [`${lastIdParamPrefix}LastID`]: startWithLastId || 0}))
    let mainData = response[dataPathKey]

    while (response[dataPathKey].length) {
      response = await this.getApiData(endpoint, {...queryData, [`${lastIdParamPrefix}LastID`]: response.lastID})
      mainData = mainData.concat(response[dataPathKey])
    }

    return mainData
  }

  async getBases({latMin, lngMin, latMax, lngMax, faction = 0, minLevel = 0, maxLevel = 5, minHealth = 0, maxHealth = 100, lastId}) {
    const params = {
      minLevel,
      maxLevel,
      minHealth,
      maxHealth,
      faction,
      bounds: {
        latitude: [latMin, latMax],
        longitude: [lngMin, lngMax]
      }
    }

    if (faction) {
      return this.getPagedRequest('get-bases', params, 'bases', 'base', lastId)
    }

    const result1 = await this.getPagedRequest('get-bases', {...params, faction: 1}, 'bases', 'base', lastId)
    const result2 = await this.getPagedRequest('get-bases', {...params, faction: 2}, 'bases', 'base', lastId)
    const result3 = await this.getPagedRequest('get-bases', {...params, faction: 3}, 'bases', 'base', lastId)
    const result4 = await this.getPagedRequest('get-bases', {...params, faction: 4}, 'bases', 'base', lastId)

    return result1.concat(result2).concat(result3).concat(result4)
  }

  async getMines({latMin, lngMin, latMax, lngMax, minLevel = 0, maxLevel = 5, minHealth = 0, maxHealth = 100, lastId}) {
    return this.getPagedRequest('get-pois', {
      minLevel,
      maxLevel,
      minHealth,
      maxHealth,
      bounds: {
        latitude: [latMin, latMax],
        longitude: [lngMin, lngMax]
      }
    }, 'POIs', 'POI', lastId)
  }

  async getCores({latMin, lngMin, latMax, lngMax, minLevel = 0, maxLevel = 5, minHealth = 0, maxHealth = 100, lastId}) {
    return this.getPagedRequest('get-cores', {
      minLevel,
      maxLevel,
      minHealth,
      maxHealth,
      bounds: {
        latitude: [latMin, latMax],
        longitude: [lngMin, lngMax]
      }
    }, 'cores', 'core', lastId)
  }

  async getBaseDetail({id, query}) {
    if (!id && query) {
      id = await this.getIdFromQuery(query)
    }

    if (!id) throw new Error('Id or Query is needed!')

    const baseData = (await this.getApiData('/base-profile', { id })).dt

    return {
      ...baseData,
      rings: Object.values(baseData.rings)
    }
  }

  async getBattleDetail({id, query}) {
    const searchData = (!id && query) ? await this.getSearchQuery(query) : null
    if (searchData && searchData[0]) {
      if (searchData[0].is_done) {
        throw new Error('Not possible to query details... Battle has finished')
      }

      id = searchData[0].id
    } else {
      const battles = await this.getBattles({})
      const battle = battles.find(item => item.id === id)
      console.log('Found', battles.map(item => item.id), battle)
      if (!battle) {
        throw new Error('Battle not found or is already finished')
      } else if (battle.finished) {
        throw new Error('Not possible to query details... Battle has finished')
      }
    }

    if (!id) throw new Error('Battle not found')

    return this.getApiData('/get-battle-details', {battleID: id})
  }

  async getClusterDetail({id, query, type}) {
    if (!id && query) {
      id = await this.getIdFromQuery(query)
    }

    type = type || 'simulation'

    if (!id) throw new Error('Base not found')

    return this.getApiData('/base-cluster-data', {id, type})
  }

  async getCoreDetail({id, query}) {
    if (!id && query) {
      id = await this.getIdFromQuery(query)
    }

    if (!id) throw new Error('Core not found')

    return this.getApiData('/core-profile', {id}).then(data => data.dt)
  }

  async getMineDetail({id, query}) {
    if (!id && query) {
      id = await this.getIdFromQuery(query)
    }

    if (!id) throw new Error('Mine not found')

    return this.getApiData('/poi-profile', {id}).then(data => data.dt)
  }

  async getPlayerDetail({id, query}) {
    if (!id && query) {
      id = await this.getIdFromQuery(query)
    }

    if (!id) throw new Error('Player not found')

    return {
      id,
      ...(await this.getApiData('/player-public-profile', {id}))
    }
  }

  async getPlayerBaseUniqueId({id, query}) {
    if (!id && query) {
      id = await this.getIdFromQuery(query)
    }

    if (!id) throw new Error('Player not found')

    return this.cache.getPlayerBaseQuery(id)
  }

  async getPlayerBase({id, query}) {
    const baseUniqueId = await this.getPlayerBaseUniqueId({id, query})

    if (!baseUniqueId) {
      throw new Error('Player base not found')
    }

    return this.getBaseDetail({query: baseUniqueId})
  }

  async sendMessage({message, global = true}) {
    return this.getApiData('/insert-message', {
      message,
      global: global ? 1 : 0
    })
  }
}
