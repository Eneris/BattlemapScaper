// Generic
const path = require('path')

// Express
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

// Swagger
const swaggerUi = require('swagger-ui-express')
const YAML = require('yamljs')
const swaggerDocument = YAML.load('./scripts/express/swagger.yml')

// Firebase & Battlemap
const { credentials, expressPort, debug } = require('../../config')
const Battlemap = require('../../libs/battlemap')
const Cache = require('../../libs/cache')
const Firebase = require('../../libs/firebase')

// GraphQL
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const { makeExecutableSchema } = require('graphql-tools')
const gql = require('graphql-tag')
const { GraphQLScalarType } = require('graphql')
const { Kind } = require('graphql/language')

const database = Firebase.database()
const bm = new Battlemap()
const cache = new Cache()
const dataRef = database.ref('/data')

// Generic part
app.use(bodyParser.json())
app.use(function(error, req, res, next) {
  if (error) {
    console.error(error)
  }

  console.log('API:', req.originalUrl)
  next()
})

// Swagger init
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

// API part
const checkIdParam = (req, res, next) => {
  const id = req.params.id

  if (String(id).match(/[a-zA-Z]/)) {
    console.log('Have to search for ID')
    bm.getIdFromQuery(id)
      .then(id => {
        console.log('Found id', id)
        req.queryDataId = id
      })
      .then(() => next())
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
      dataRef.child('battles').set(data)
      return res.json(data)
    })
    .catch(err => res.status(err.code || 500).json({error: err.message}))
})

app.get('/getScreen', (req, res) => {
  if (debug) console.log('REQUEST: getScreen')
  return bm.screenshot('.tmp/screen.png')
    .then(() => res.sendFile('screen.png', { root: path.join(__dirname, '../../.tmp') }))
    .catch(err => res.status(err.code || 500).json({error: err.message}))
})

app.post('/getRequest', (req, res) => {
  if (!req.body.operation) return res.status(400).json({error: 'Opperation is not defined'})

  return bm.getApiData('/' + req.body.operation, req.body.query)
    .then(data => res.json(data))
    .catch(err => res.status(err.code || 500).json({error: err.message}))
})

app.post('/reauth', (req, res) => {
  if (debug) console.log('REQUEST: reauth')
  return bm.login(credentials)
    .then(data => res.json(data))
    .catch(err => res.status(err.code || 500).json({error: err.message}))
})

// GraphQL part
const AnyType = new GraphQLScalarType({
  name: 'AnyType',
  description: 'Here can be about anything. Mostly TODO structures',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => {
    switch (ast.kind) {
      case Kind.Int:
      default:
        return ast.value
    }
  }
})

const typeDefs = require('./graphqlTypes')

// The resolvers
const resolvers = {
  AnyType: AnyType,
  Query: {
    battles: (parentResult, args) => {
      return bm.getBattles()
    },
    bases: (parentResult, args) => bm.getBases(
      args.latMin,
      args.lngMin,
      args.latMax,
      args.lngMax,
      args.faction,
      args.minLevel,
      args.maxLevel,
      args.minHealth,
      args.maxHealth,
      args.lastId
    ),
    mines: (parent, args) => bm.getMines(
      args.latMin,
      args.lngMin,
      args.latMax,
      args.lngMax,
      args.faction,
      args.minLevel,
      args.maxLevel,
      args.minHealth,
      args.maxHealth,
      args.lastId
    ),
    cores: (parent, args) => bm.getCores(
      args.latMin,
      args.lngMin,
      args.latMax,
      args.lngMax,
      args.faction,
      args.minLevel,
      args.maxLevel,
      args.minHealth,
      args.maxHealth,
      args.lastId
    ),
    battleDetail: async (parentRequest, args) => {
      if (parentRequest) {
        if (parentRequest.id) args.id = parentRequest.id
      }
      if (!args.id && !args.query) throw new Error('Id or Query is needed!')
      if (!args.id && args.query) {
        args.id = await bm.getIdFromQuery(args.query)
      }

      return bm.getApiData('/get-battle-details', {battleID: args.id})
    },
    baseDetail: async (parentRequest, args) => {
      if (!args.id && !args.query) throw new Error('Id or Query is needed!')
      if (!args.id && args.query) {
        args.id = await bm.getIdFromQuery(args.query)
      }

      return bm.getBase(args.id)
    },
    clusterDetail: (parentRequest, args) => {
      if (!args.id && !args.query) throw new Error('Id or Query is needed!')
      return bm.getApiData('/base-cluster-data', {id: args.id, type: args.type || 'simulation'})
    },
    search: (parentRequest, args) => {
      return bm.getSearchQuery(args.term, args.faction)
    },
    request: (parentRequest, args) => {
      return bm.getApiData(args.operation, args.requestData, args.method)
    },
    coreDetail: async (parent, args) => {
      if (!args.id && !args.query) throw new Error('Id or Query is needed!')
      if (!args.id && args.query) {
        args.id = await bm.getIdFromQuery(args.query)
      }

      return bm.getApiData('/core-profile', {id: args.id}).then(data => data.dt)
    },
    mineDetail: async (parent, args) => {
      if (!args.id && !args.query) throw new Error('Id or Query is needed!')
      if (!args.id && args.query) {
        args.id = await bm.getIdFromQuery(args.query)
      }

      return bm.getApiData('/poi-profile', {id: args.id}).then(data => data.dt)
    },
    player: async (parent, args) => {
      if (!args.id && !args.query) throw new Error('Id or Query is needed!')
      if (!args.id && args.query) {
        args.id = await bm.getIdFromQuery(args.query)
      }

      return bm.getApiData('/player-public-profile', {id: args.id})
    },
    playerBaseUniqueId: async (parent, args) => {
      if (!args.id && !args.query) throw new Error('Id or Query is needed!')
      if (!args.id && args.query) {
        args.id = await bm.getIdFromQuery(args.query)
      }

      return cache.getPlayerBaseQuery(args.id)
    }
  },
  BattleDetail: {
    async oppoBaseDetails(parentRequest, args) {
      if (parentRequest.oppo_base) args.id = parseInt(parentRequest.oppo_base)
      if (!args.id && !args.query) throw new Error('Id or Query is needed!')
      if (!args.id && args.query) {
        args.id = await bm.getIdFromQuery(args.query)
      }

      return bm.getBase(args.id)
    },
    async ownBaseDetails(parentRequest, args) {
      if (parentRequest.own_base) args.id = parseInt(parentRequest.own_base)
      if (!args.id && !args.query) throw new Error('Id or Query is needed!')
      if (!args.id && args.query) {
        args.id = await bm.getIdFromQuery(args.query)
      }

      return bm.getBase(args.id)
    }
  }
}

// Put together a schema
const schema = makeExecutableSchema({ typeDefs, resolvers })

// The GraphQL endpoint
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))

// GraphiQL, a visual editor for queries
app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }))

// Main inicialization
const main = async () => {
  await cache.init()
  await bm.init(credentials)
  app.listen(expressPort, () => console.log('Example app listening on port', expressPort))
}

main()
  .catch(console.error)
