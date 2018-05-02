const phantom = require('phantom')

const {
  loginPage,
  credentials,
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
      '--ssl-protocol=tlsv1',
      '--ssl-protocol=any',
      '--web-security=false',
      '--ignore-ssl-errors=true'
    ])

    this.page = await this.login(this.instance, this.credentials)

    console.log('Init done')

    return this.page
  }

  async exit() {
    return this.instance.exit()
  }

  async login() {
    const page = await this.instance.createPage()

    await this.page.property('viewportSize', {width: 1920, height: 1080})

    if (debug) {
      console.log('Login started')

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
    }

    const status = await this.page.open(loginPage)

    if (status === 'fail') {
      throw new Error('Failed to load page ' + loginPage)
    }

    if (await this.isLoginNeeded(page)) {
      await this.googleLogin(page, credentials)
    }

    await delay(2000)

    if (debug) {
      await this.page.render('../.debug/loginHard.png')
    }

    return page
  }

  async googleLogin(page, credentials) {
    if (debug) {
      console.log('Hard login started')
      await this.page.render('../.debug/LoginStageEmail.png')
    }

    const pageCheck = await this.page.evaluate(function() {
      return !!document.querySelector('#Email')
    })

    if (!pageCheck) await this.page.render('../.debug/missingForm.png')

    /*  console.log(await this.page.evaluate(function() {
       return document.innerHTML
     })) */

    await this.page.evaluate(function(credentials) {
      document.querySelector('#Email').value = credentials.email
      document.querySelector('#next').click()
    }, credentials)

    await delay(1000)

    if (debug) await this.page.render('../.debug/LoginStagePassword.png')

    await this.page.evaluate(function(credentials) {
      document.querySelector('#Passwd').value = credentials.password
      document.querySelector('#signIn').click()
    }, credentials)

    await delay(1000)

    if (debug) {
      await this.page.render('../.debug/LoginStageLoad.png')
    }

    return page
  }

  async isLoginNeeded(page) {
    if (debug) {
      await this.page.render('../.debug/isLoginNeeded.png')
    }

    const result = await this.page.evaluate(function() {
      return !!document.querySelector('#user-auth-id')
    })

    if (debug) {
      console.log(result ? 'Login recovered' : 'Login required')
    }

    return !result
  }

  async getBattleList(withPlayers = false) {
    const battles = await this.page.evaluate(function() {
      return window.battleLogAPIController.getBattles() || []
    })

    if (withPlayers) {
      ;
    }

    return battles
  }

  async getBattleDetails(battleID) {
    console.log('Getting battle details for', battleID)
    const battle = await this.page.evaluate(function(battleID) {
      return window.battleLogAPIController.getBattleDetails({battleID: battleID})
    }, battleID)

    console.log('Query result', battle)

    return battle
  }

  async getSearchQuery(queryString, faction = 0) {
    return this.page.evaluate(function(queryString, faction) {
      return new Promise((resolve, reject) => {
        /* global $ */
        $.ajax({
          url: '/search',
          data: {
            term: queryString,
            faction: faction || 0
          },
          success: resolve,
          fail: reject
        })
      })
    }, {queryString})
  }

  /* async getBattleIdFromQuery(queryString) */
}
