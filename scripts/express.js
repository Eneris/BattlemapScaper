(async function() {
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

  app.listen(expressPort, () => console.log('Example app listening on port', expressPort))
})()
  .catch(console.error)
