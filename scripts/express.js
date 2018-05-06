(async function() {
  const path = require('path')
  const express = require('express')
  const app = express()
  const { credentials, expressPort, debug } = require('../config')
  const Battlemap = require('../libs/battlemap')
  const Firebase = require('../libs/firebase')

  const database = Firebase.database()

  const bm = new Battlemap()
  const dataRef = database.ref('/data')

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

      dataRef.child('bases').child(id).set(data)

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

      dataRef.child('clusters').child(id).set(data)

      res.json(data)
    } catch (err) {
      return res.status(err.code || 500).json({error: err.message})
    }
  })

  app.get('/getBattle/:id', async (req, res) => {
    let id = req.params.id

    if (debug) console.log('REQUEST: getCluster', id)

    try {
      if (String(id).match(/[a-zA-Z]/)) {
        id = await bm.getIdFromQuery(id)
      }

      if (!id) throw new Error('Wrong battle id')

      const data = await bm.getBattleDetails(id)

      if (!data) throw new Error('No data returned')

      dataRef.child('battleDetails').child(id).set(data)

      res.json(data)
    } catch (err) {
      return res.status(err.code || 500).json({error: err.message})
    }
  })

  app.get('/getBattles', (req, res) => {
    if (debug) console.log('REQUEST: getBattles')
    return bm.getBattleList()
      .then(data => {
        dataRef.child('battles').set(data)
        return res.json(data)
      })
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
