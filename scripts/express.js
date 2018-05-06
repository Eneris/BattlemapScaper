(async function() {
  const path = require('path')
  const express = require('express')
  const app = express()
  const { credentials, expressPort } = require('../config')
  const Battlemap = require('../libs/battlemap')

  const bm = new Battlemap()

  await bm.init(credentials)

  app.get('/getBase/:baseId', (req, res) => {
    const id = req.params.baseId

    if (!id) {
      return res.status(400).json({error: 'Wrong base id'})
    }

    return bm.getApiData('/base-profile', {id})
      .then(data => res.json(data))
      .catch(err => res.status(err.code || 500).json({error: err.message}))
  })

  app.get('/getCluster/:baseId/:type?', (req, res) => {
    const baseId = req.params.baseId
    const type = req.params.type || 'simulation'

    if (!baseId) {
      return res.status(400).json({error: 'Wrong base id'})
    }

    return bm.getApiData('/base-cluster-data', {id: baseId, type: type})
      .then(data => res.json(data))
      .catch(err => res.status(err.code || 500).json({error: err.message}))
  })

  app.get('/getBattles', (req, res) => {
    return bm.getBattleList()
      .then(data => res.json(data))
      .catch(err => res.status(err.code || 500).json({error: err.message}))
  })

  app.get('/reauth', (req, res) => {
    return bm.login(credentials)
      .then(data => res.json(data))
      .catch(err => res.status(err.code || 500).json({error: err.message}))
  })

  app.get('/getScreen', (req, res) => {
    return bm.render('.tmp/screen.png')
      .then(() => res.sendFile('screen.png', { root: path.join(__dirname, '../.tmp') }))
      .catch(err => res.status(err.code || 500).json({error: err.message}))
  })

  app.listen(expressPort, () => console.log('Example app listening on port', expressPort))
})()
  .catch(console.error)
