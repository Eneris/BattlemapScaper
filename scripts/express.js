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

  const checkIdParam = (req, res, next) => {
    const id = req.params.id
    console.log(id)

    if (String(id).match(/[a-zA-Z]/)) {
      bm.getIdFromQuery(id)
        .then(id => {
          req.queryDataId = id
          return next()
        })
        .catch(err => res.status(err.code || 400).json({error: err.message}))
    } else {
      req.queryDataId = id
      next()
    }
  }

  app.get('/getBase/:id', checkIdParam, async (req, res) => {
    let id = req.queryDataId

    if (debug) console.log('REQUEST: getBase', id)

    try {
      const data = await bm.getBase(id)
      dataRef.child('bases').child(id).set(data)
      res.json(data)
    } catch (err) {
      return res.status(err.code || 500).json({error: err.message})
    }
  })

  app.get('/getCluster/:id/:type?', checkIdParam, async (req, res) => {
    let id = req.queryDataId
    const type = req.params.type || 'simulation'

    if (debug) console.log('REQUEST: getCluster', id, type)

    try {
      const data = await bm.getApiData('/base-cluster-data', {id, type})
      dataRef.child('clusters').child(id).set(data)
      res.json(data)
    } catch (err) {
      return res.status(err.code || 500).json({error: err.message})
    }
  })

  app.get('/getBattle/:id', checkIdParam, async (req, res) => {
    let id = req.queryDataId

    if (debug) console.log('REQUEST: getCluster', id)

    try {
      const data = await bm.getApiData('/get-battle-details', {battleID: id})
      dataRef.child('battleDetails').child(id).set(data)
      res.json(data)
    } catch (err) {
      return res.status(err.code || 500).json({error: err.message})
    }
  })

  app.get('/getBattles', (req, res) => {
    if (debug) console.log('REQUEST: getBattles')
    return bm.getBattles()
      .then(data => {
        console.log('Got battles', data)
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
