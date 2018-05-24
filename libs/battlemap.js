const phantom = require('phantom')

const {
  loginPage,
  homePage,
  debug
} = require('../config')

const {
  delay
} = require('./functions')

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
    this.instance = await phantom.create([
      '--cookies-file=../.cookies/cookies.txt',
      '--remote-debugger-port=9000',
      '--remote-debugger-autorun=yes',
      '--ssl-protocol=tlsv1',
      '--ssl-protocol=any',
      '--web-security=false',
      '--ignore-ssl-errors=true'
    ])

    this.page = await this.instance.createPage()

    await this.page.property('viewportSize', {width: 1920, height: 1080})

    if (debug) {
      if (debug === 'verbose') {
        await this.page.on('onResourceRequested', function(requestData) {
          console.info('Requesting', requestData.url)
        })
      }

      await this.page.on('onResourceError', function(errorData) {
        console.error('Resource error', errorData)
      })

      await this.page.on('onError', function(errorData) {
        console.error('Resource error', errorData)
      })

      await this.page.on('onConsoleMessage', function(...args) {
        console.log(...args)
      })
    }

    await this.page.open(homePage)
    await this.login(credentials)

    if (debug) console.log('Init done')

    return this.page
  }

  async exit() {
    return this.instance.exit()
  }

  // Auth section
  async login(credentials) {
    console.log('Login started')
    const status = await this.page.open(loginPage)

    if (status === 'fail') {
      throw new Error('Failed to load page ' + loginPage)
    }

    if (await this.isLoginNeeded()) {
      await this.googleLogin(credentials)
    }

    await delay(2000)

    if (debug) {
      await this.page.render('.debug/loginHard.png')
    }

    return true
  }

  async googleLogin(credentials) {
    if (debug) {
      console.log('Hard login started')
      await this.page.render('.debug/LoginStageEmail.png')
    }

    const pageCheck = await this.page.evaluate(function() {
      return !!document.querySelector('#Email')
    })

    if (!pageCheck) await this.page.render('.debug/missingForm.png')

    /*  console.log(await this.page.evaluate(function() {
       return document.innerHTML
     })) */

    await this.page.evaluate(function(credentials) {
      document.querySelector('#Email').value = credentials.email
      document.querySelector('#next').click()
    }, credentials)

    await delay(1000)

    if (debug) await this.page.render('.debug/LoginStagePassword.png')

    await this.page.evaluate(function(credentials) {
      document.querySelector('#Passwd').value = credentials.password
      document.querySelector('#signIn').click()
    }, credentials)

    await delay(1000)

    if (debug) {
      await this.page.render('.debug/LoginStageLoad.png')
    }

    return true
  }

  async isLoginNeeded() {
    if (debug) {
      await this.page.render('.debug/isLoginNeeded.png')
    }

    const result = await this.page.evaluate(function() {
      return !!document.querySelector('#user-auth-id')
    })

    if (debug) {
      console.log(result ? 'Login recovered' : 'Login required')
    }

    return !result
  }

  // Generic functions section
  async evaluate(functionToCall, ...params) {
    return this.page.evaluate(functionToCall, ...params)
  }

  async getApiData(queryEndpoint, requestData = {}, method = 'post', isRecursion = false) {
    if (debug === 'verbose') console.log('Getting api data', queryEndpoint, requestData, method, isRecursion)

    const result = this.page.evaluate(function({queryEndpoint, customRequestData, method}) {
      // This one has silenced errors
      // return window.ajaxController.getValues(queryEndpoint, method, customRequestData)

      /* global $ */
      return new Promise((resolve, reject) => {
        // Set security timeout
        // const timeoutTimer = setTimeout(() => reject({code: 999}), 10000)
        $.ajax({
          type: method,
          url: queryEndpoint,
          data: customRequestData,
          headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
          },
          async: !1,
          success: (data, state, response) => {
            // clearTimeout(timeoutTimer)
            resolve({data, state, response})
          },
          error: (response, state, message) => {
            // clearTimeout(timeoutTimer)
            resolve({response, state, message}) // TODO: This is ugly but we need response object
          }
        })
      })
    }, {queryEndpoint, requestData, method})
      .then(data => {
        if (debug === 'verbose') console.log('Got response', data)
        if (data.state !== 'success' || data.response.state !== 200) {
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

  async render(fileName, options = {}) {
    if (debug === 'verbose') console.log('getting screenshot')
    return this.page.render(fileName, options)
  }

  async getSearchQuery(queryString, faction = 0) {
    return this.getApiData('/search', {term: queryString, faction: faction}, 'get')
  }

  async getBase(id) {
    const baseData = await this.getApiData('/base-profile', {id})
    return baseData.dt
  }

  // Predefined queries
  getBattles() {
    // return this.getApiData('get-battles', { factions: [1, 2, 3, 4], resolution: 0 })
    return this.page.evaluate(function() {
      return window.battleLogAPIController.getBattles({})
    })
  }

  async getIdFromQuery(queryName) {
    const searchData = await this.getSearchQuery(queryName)

    if (typeof searchData === 'object' && typeof searchData.message === 'string' && searchData.message === '') {
      throw new Error('Login probably expired')
    }

    if (!searchData.length) {
      throw new Error(queryName + ' not found')
    }

    return searchData.pop().id
  }

  async checkHealth() {
    return this.page.evaluateAsync(function() {
      return !!Promise
    })
  }
}
