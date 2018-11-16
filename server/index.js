// Generic
const path = require('path')

// Express
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

// Firebase & Battlemap
const { credentials, expressPort, debug } = require('../config')
const Battlemap = require('../libs/battlemap')

// GraphQL
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const { makeExecutableSchema } = require('graphql-tools')
const { GraphQLScalarType } = require('graphql')
const { Kind } = require('graphql/language')

const bm = new Battlemap()

// Generic part
app.use(bodyParser.json())
app.use(function(error, req, res, next) {
  if (error) {
    console.error(error)
  }

  console.log('API:', req.originalUrl)
  next()
})

// API part

app.get('/getScreen', (req, res) => {
  if (debug) console.log('REQUEST: getScreen')
  return bm.screenshot('.tmp/screen.png')
    .then(() => res.sendFile('screen.png', { root: path.join(__dirname, '../.tmp') }))
    .catch(err => res.status(err.code || 500).json({error: err.message}))
})

app.post('/getRequest', (req, res) => {
  if (!req.body.operation) return res.status(400).json({error: 'Opperation is not defined'})

  return bm.getApiData('/' + req.body.operation, req.body.query)
    .then(data => res.json(data))
    .catch(err => res.status(err.code || 500).json({error: err.message}))
})

// GraphQL part
const typeDefs = require('./graphqlTypes')

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

// The resolvers
const resolvers = {
  Query: {
    battles: (_, args) => bm.getBattles(args),
    bases: (_, {args}) => bm.getBases(args),
    mines: (_, {args}) => bm.getMines(args),
    cores: (_, {args}) => bm.getCores(args),
    battleDetail: (_, {args}) => bm.getBattleDetail(args),
    baseDetail: (_, {args}) => bm.getBaseDetail(args),
    clusterDetail: (_, {args}) => bm.getClusterDetail(args),
    coreDetail: (_, {args}) => bm.getCoreDetail(args),
    mineDetail: (_, {args}) => bm.getMineDetail(args),
    playerDetail: (_, {args}) => bm.getPlayerDetail(args),
    search: (_, args) => bm.getSearchQuery(args.term, args.faction),
    request: (_, args) => bm.getApiData(args.operation, args.requestData, args.method),
    playerBaseUniqueId: (_, {args}) => bm.getPlayerBaseUniqueId(args)
  },
  Mutation: {
    restart: () => bm.init(),
    sendMessage: (_, args) => bm.sendMessage(args)
  },
  BattleDetail: {
    oppoBaseDetails: (parent) => bm.getBaseDetail({id: parent.oppo_base}),
    ownBaseDetails: (parent) => bm.getBaseDetail({id: parent.own_base})
  },
  Battle: {
    detail: (parent, args) => parent.finished ? null : bm.getBattleDetail({id: parent.id})
  },
  PlayerDetail: {
    base: async (parent, args, context, info) => bm.getPlayerBase({id: parent.id}),
    base_unique_id: (parent, args, context, info) => bm.getPlayerBaseUniqueId({id: parent.id})
  },
  AnyType: AnyType
}

// Put together a schema
const schema = makeExecutableSchema({ typeDefs, resolvers })

// The GraphQL endpoint
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))

// GraphiQL, a visual editor for queries
app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }))

// Main inicialization
const main = (async () => {
  await bm.init(credentials)
  app.listen(expressPort, () => console.log('Listening on port', expressPort))
})()
  .then(console.log)
  .catch(console.error)
