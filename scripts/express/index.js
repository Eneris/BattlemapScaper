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
const Firebase = require('../../libs/firebase')

// GraphQL
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const { makeExecutableSchema } = require('graphql-tools')
const gql = require('graphql-tag')
const { GraphQLScalarType } = require('graphql')
const { Kind } = require('graphql/language')

const database = Firebase.database()
const bm = new Battlemap()
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

const typeDefs = gql`
  type Query {
    battles: [Battle]
    bases(
      latMin: Float!,
      lngMin: Float!,
      latMax: Float!,
      lngMax: Float!,
      faction: Int,
      minLevel: Int,
      maxLevel: Int,
      minHealth: Int,
      maxHealth: Int,
      lastId: Int
    ): [Base]
    cores(
      latMin: Float!,
      lngMin: Float!,
      latMax: Float!,
      lngMax: Float!,
      minLevel: Int,
      maxLevel: Int,
      minHealth: Int,
      maxHealth: Int,
      lastId: Int
    ): AnyType
    mines(
      latMin: Float!,
      lngMin: Float!,
      latMax: Float!,
      lngMax: Float!,
      minLevel: Int,
      maxLevel: Int,
      minHealth: Int,
      maxHealth: Int,
      lastId: Int
    ): AnyType
    mineDetail(id: Int, query: String): AnyType
    battleDetail(id: Int, query: String): BattleDetail
    baseDetail(id: Int, query: String): BaseDetail
    clusterDetail(id: Int, query: String, type: String): ClusterDetail
    search(term: String!, faction: Int): [AnyType]
    request(operation: String!, method: String, requestData: AnyType): AnyType
    coreDetail(id: Int, query: String): CoreDetail
    player(id: Int, query: String): Player
  }

  type Mutation {
    reauth: Int
  }

  scalar AnyType

  type CoreDetail {
    c_id: Int,
    c_b: [CoreLink],
    p_g: Int,
    cf: Int,
    hth: Int,
    edit_lock_time: Int,
    _lng: Float,
    _ltd: Float,
    lat: Float,
    cm_d: CoreUpgrades,
    lng:Float,
    no_of_edits: Int,
    owr: String,
    d_tc: Int,
    name: String,
    ctr: String,
    c_hsid: String,
    ergy: Int,
    max_hth: Int,
    ctr_f: Int,
    lvl: Int
  }

  type CoreUpgrades {
    mods: [CoreMod]
  }

  type Player {
    base_level: Int,
    level_id: Int,
    core_info_id: Int,
    stats_id: Int,
    poi_info_id: Int,
    social_info_id: Int,
    uname: String,
    faction_id: Int,
    get_core_info: PlayerCores,
    get_stats_public: PlayerStats,
    get_poi_info: PlayerPoiInfo,
    get_faction_details: PlayerFactionInfo
  }

  type PlayerCores {
    id: Int,
    no_of_cores_seeded: Int,
    owned_cores: String,
    no_of_bases_destroyed: Int,
    no_of_cores_destroyed: Int,
    no_of_cores_captured: Int
  }

  type PlayerStats {
    id: Int,
    total_mods_deployed: Int,
    nof_of_battles_won: Int,
    achievements: String,
    unlocked_skills: String
  }

  type PlayerPoiInfo {
    id: Int,
    no_of_pois_captured: Int
  }

  type PlayerFactionInfo {
    id: Int,
    fac_enum: Int
  }

  type Base {
    faction: Int,
    health: Int,
    id: Int,
    latitude: Float,
    level_id: Int,
    longitude: Float,
    name: String,
    owner_id: Int
  }

  type BaseDetail {
    av_pwr: Int,
    bf: Int,
    bs_hsid: String,
    bs_id: Int,
    bs_lnks: [BaseLink],
    cr_lnks: [CoreLink],
    cr_nm: String,
    del: Boolean,
    hth: Int,
    lat: Float,
    lng: Float,
    lvl: Int,
    mltng: Boolean,
    mx_hth: Int,
    nm: String,
    ownr: String,
    rings: [[BaseMod]],
    strngth: Int,
    tc_gen: Boolean,
    tm_gen: Boolean,
    us_pwr: Int
  }

  type Battle {
    battleUniqueID: String,
    currentCycle: Int,
    factionEnum: Int,
    finished: Int,
    id: Int,
    oppoBase: String,
    ownBase: String,
    reservedPower: Int,
    resolutionTime: String
  }

  type BattleDetail {
    attack_on:String,
    dominance: AnyType,
    id: Int,
    initiated_by_id: Int,
    initiated_on: String,
    is_cancelled: Int,
    is_done: Int,
    oppoBaseDetails: Base,
    oppoClusterStrength: Int,
    oppo_base: String,
    oppo_base_fac_enum: Int,
    oppo_base_final_profit: Int,
    oppo_base_name: String,
    ownBaseDetails: Base,
    ownClusterStrength: Int,
    own_base: String,
    own_base_fac_enum: Int,
    own_base_final_profit: Int,
    own_base_name: String,
    reservedPower: Int,
    unique_name: String,
    winner_fac_enum: AnyType
  }

  type ClusterDetail {
    ClusterBases: [ClusterBase],
    clusterBaseId: Int,
    clusterBaseName: String,
    clusterFor: String,
    clusterLinks: [AnyType]
    clusterStrength: Int,
    factionEnum: Int,
    parentBases: [Int],
    type: String
  }

  type ClusterBase {
    latitude: Float,
    longitude: Float,
    linked_bases: LinkedBases,
    faction: Int
  }

  type LinkedBases {
    childs: AnyType,
    parents: AnyType
  }

  type CoreMod {
    sl_no: Int,
    m_cd: String,
    is_lnk: Int,
    uid: String,
    hth: Int,
    max_hth: Int,
    lvl: Int
  }

  type BaseMod {
    cd: String,
    hth: Int,
    lvl: Int,
    mx_hth: Int,
    r_no: String
  }

  type BaseLink {
    fwd: Boolean,
    lng: Float,
    ltd: Float
  }

  type CoreLink {
    lng: Float,
    ltd: Float
  }
`

// The resolvers
const resolvers = {
  AnyType: AnyType,
  Query: {
    battles: (parentResult, args) => {
      return bm.getBattles()
    },
    bases: (parentResult, args) => {
      return bm.getBases(args.latMin, args.lngMin, args.latMax, args.lngMax, args.faction, args.minLevel, args.maxLevel, args.minHealth, args.maxHealth, args.lastId)
    },
    mines: (parent, args) => {
      return bm.getMines(args.latMin, args.lngMin, args.latMax, args.lngMax, args.faction, args.minLevel, args.maxLevel, args.minHealth, args.maxHealth, args.lastId)
    },
    cores: (parent, args) => {
      return bm.getCores(args.latMin, args.lngMin, args.latMax, args.lngMax, args.faction, args.minLevel, args.maxLevel, args.minHealth, args.maxHealth, args.lastId)
    },
    battleDetail: async (parentRequest, args) => {
      if (!args.id && !args.query) throw new Error('Id or Query is needed!')
      if (!args.id && args.query) {
        args.id = await bm.getIdFromQuery(args.query)
      }

      return bm.getBattles(args.id)
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
    }
  }
}

// Put together a schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
})

// The GraphQL endpoint
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))

// GraphiQL, a visual editor for queries
app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }))

// Main inicialization
const main = async () => {
  await bm.init(credentials)
  app.listen(expressPort, () => console.log('Example app listening on port', expressPort))
}

main()
  .catch(console.error)
