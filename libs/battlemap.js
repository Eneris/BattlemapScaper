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

const {
  saveCookies,
  loadCookies
} = require('./cookies')

module.exports = class Battlemap {
  constructor(credentials) {
    this.page = null
    this.cache = {
      battleStringToId: {},
      battleDetails: {},
      battleList: []
    }
  }

  async init(credentials) {
    this.credentials = credentials

    this.instance = await puppeteer.launch({
      userDataDir: './.userData',
      headless: debug !== 'verbose',
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

      this.page.on('pageerror', err => console.error(err))
    }

    await this.page.goto(homePage)

    if (await this.isLoginNeeded(3000)) {
      await this.login(credentials)
    }

    if (debug) console.log('Init done')

    return this.page
  }

  async exit() {
    return this.instance.close()
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
      } catch (err) {}

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

  async getBase(id) {
    const baseData = await this.getApiData('/base-profile', { id })
    return baseData.dt
  }

  // Predefined queries
  getBattles() {
    return this.getApiData('get-battles', { factions: [1, 2, 3, 4], resolution: 0 })
    /* return this.page.evaluate(function() {
      return window.battleLogAPIController.getBattles({})
    }) */
  }

  async getIdFromQuery(queryName) {
    console.log('Got search')
    const searchData = await this.getSearchQuery(queryName)
    console.log('Got data', searchData)

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
}
