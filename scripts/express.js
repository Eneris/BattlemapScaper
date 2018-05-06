(async function() {
  const path = require('path')
  const express = require('express')
  const app = express()
  const { credentials, expressPort, debug } = require('../config')
  const Battlemap = require('../libs/battlemap')

  const bm = new Battlemap()

  await bm.init(credentials)

  app.get('/getBase/:baseId', async (req, res) => {
    let id = req.params.baseId

    if (debug) console.log('REQUEST: getBase', id)

    try {
      if (String(id).match(/[a-zA-Z]/)) {
        id = await bm.getIdFromQuery(id)
      }

      if (!id) throw new Error('Wrong base id')

      const data = await bm.getApiData('/base-profile', {id})

      if (!data) throw new Error('No data returned')

      res.json(data)
    } catch (err) {
      return res.status(err.code || 500).json({error: err.message})
    }
  })

  app.get('/getCluster/:baseId/:type?', async (req, res) => {
    let id = req.params.baseId
    const type = req.params.type || 'simulation'

    if (debug) console.log('REQUEST: getCluster', id, type)

    try {
      if (String(id).match(/[a-zA-Z]/)) {
        id = await bm.getIdFromQuery(id)
      }

      if (!id) throw new Error('Wrong base id')

      const data = await bm.getApiData('/base-cluster-data', {id, type})

      if (!data) throw new Error('No data returned')

      res.json(data)
    } catch (err) {
      return res.status(err.code || 500).json({error: err.message})
    }
  })

  app.get('/getBattles', (req, res) => {
    if (debug) console.log('REQUEST: getBattles')
    return bm.getBattleList()
      .then(data => res.json(data))
      .catch(err => res.status(err.code || 500).json({error: err.message}))
  })

  app.get('/reauth', (req, res) => {
    if (debug) console.log('REQUEST: reauth')
    return bm.login(credentials)
      .then(data => res.json(data))
      .catch(err => res.status(err.code || 500).json({error: err.message}))
  })

  app.get('/getScreen', (req, res) => {
    if (debug) console.log('REQUEST: getScreen')
    return bm.render('.tmp/screen.png')
      .then(() => res.sendFile('screen.png', { root: path.join(__dirname, '../.tmp') }))
      .catch(err => res.status(err.code || 500).json({error: err.message}))
  })

  app.listen(expressPort, () => console.log('Example app listening on port', expressPort))
})()
  .catch(console.error)
