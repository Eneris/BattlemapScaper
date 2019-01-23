// Generic
const path = require('path')
const {
  credentials,
  expressPort,
  debug,
  sentryUrl
} = require('../config')
const packageJson = require('../package.json');

// Express
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const Sentry = require('@sentry/node')

if (sentryUrl) {
  Sentry.init({
    dsn: sentryUrl,
    release: `${packageJson.name}@${packageJson.version}`
  })
  app.use(Sentry.Handlers.requestHandler())
  app.use(Sentry.Handlers.errorHandler())
}

const {
  handleLog,
  handleError
} = require('../libs/functions')

// Firebase & Battlemap
const Battlemap = require('../libs/battlemap')

// GraphQL
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const { makeExecutableSchema } = require('graphql-tools')
const { GraphQLScalarType } = require('graphql')
const { Kind } = require('graphql/language')

const bm = new Battlemap()

// Generic part
app.use(bodyParser.json())
app.use(function (error, req, res, next) {
  if (error) {
    error(error)
  }

  handleLog('API:', req.originalUrl)
  next()
})

app.use('/graphql', function (error, req, res, next) {
  if (error) throw error

  handleLog(error)
  next()
})

// API part

app.get('/getScreen', (req, res) => {
  if (debug) handleLog('REQUEST: getScreen')
  return bm.screenshot('.tmp/screen.png')
    .then(() => res.sendFile('screen.png', { root: path.join(__dirname, '../.tmp') }))
    .catch(err => res.status(err.code || 500).json({ error: err.message }))
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
    bases: (_, { args }) => bm.getBases(args),
    mines: (_, { args }) => bm.getMines(args),
    cores: (_, { args }) => bm.getCores(args),
    battleDetail: (_, { args }) => bm.getBattleDetail(args),
    baseDetail: (_, { args }) => bm.getBaseDetail(args),
    clusterDetail: (_, { args }) => bm.getClusterDetail(args),
    coreDetail: (_, { args }) => bm.getCoreDetail(args),
    mineDetail: (_, { args }) => bm.getMineDetail(args),
    playerDetail: (_, { args }) => bm.getPlayerDetail(args),
    search: (_, args) => bm.getSearchQuery(args.term, args.faction),
    request: (_, args) => bm.getApiData(args.operation, args.requestData, args.method),
    playerBaseUniqueId: (_, { args }) => bm.getPlayerBaseUniqueId(args)
  },
  Mutation: {
    restart: () => bm.init().then(() => 'success').catch(() => 'failure'),
    sendMessage: (_, args) => bm.sendMessage(args)
  },
  BattleDetail: {
    oppoBaseDetails: (parent) => bm.getBaseDetail({ id: parent.oppo_base }),
    ownBaseDetails: (parent) => bm.getBaseDetail({ id: parent.own_base })
  },
  Battle: {
    detail: (parent, args) => parent.finished ? null : bm.getBattleDetail({ id: parent.id })
  },
  PlayerDetail: {
    base: async (parent, args, context, info) => bm.getPlayerBase({ id: parent.id }),
    base_unique_id: (parent, args, context, info) => bm.getPlayerBaseUniqueId({ id: parent.id })
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
  app.listen(expressPort, () => handleLog('Listening on port', expressPort))
})()
  .then(handleLog)
  .catch(handleError)
