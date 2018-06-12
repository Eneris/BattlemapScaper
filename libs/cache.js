// const firebase = require('./firebase')
// const database = firebase.database()
const config = require('../config').mongoDb
const MongoClient = require('mongodb').MongoClient

module.exports = class BattleMapCache {
  constructor(props) {
    this.battles = {}
    this.battleDetails = {}
    this.players = {}
    this.bases = {}
    this.cores = {}
    this.mines = {}
  }

  async init() {
    /* this.mongoClient: MongoClient */
    const authString = `mongodb://${config.user}:${config.password}@${config.url}:${config.port}/?authSource=deltat`
    console.log(authString)
    this.mongoClient = await MongoClient.connect(authString)
    this.db = this.mongoClient.db('deltat')
    console.log('DB connect done')
  }

  saveBase(id, base) {
    return this.db.collection('bases').update({
      _id: id
    }, {
      $set: {
        name: base.name
      },
      $max: {
        level: base.level_id,
        lastUpdateAt: (new Date()).getTime()
      },
      $setOnInsert: {
        _id: id,
        uniqueId: null,
        latitude: base.latitude,
        longitude: base.longitude,
        playerId: base.owner_id,
        factionId: base.faction,
        detail: null
      }
    }, {
      upsert: true
    })
  }

  saveBaseDetail(id, baseDetail) {
    return this.db.collection('bases').update({
      _id: id
    }, {
      $set: {
        uniqueId: baseDetail.bs_hsid,
        name: baseDetail.nm,
        detail: JSON.stringify(baseDetail)
      },
      $max: {
        level: baseDetail.lvl,
        lastUpdateAt: (new Date()).getTime()
      },
      $setOnInsert: {
        _id: id,
        latitude: baseDetail.lat,
        longitude: baseDetail.lng,
        playerId: baseDetail.ownr,
        factionId: null
      }
    }, {
      upsert: true
    })
  }

  savePlayer(id, player, baseUniqueId) {
    return this.db.collection('players').update({
      _id: id
    }, {
      $set: {
        data: JSON.stringify(player)
      },
      $max: {
        level: player.level_id,
        lastUpdateAt: (new Date()).getTime()
      },
      $setOnInsert: {
        _id: id,
        name: player.uname,
        factionId: player.faction_id,
        baseUniqueId: baseUniqueId
      }
    }, {
      upsert: true
    })
  }

  async getLastId(collectionName = 'bases') {
    return ((await this.db.collection(collectionName).find().sort({_id: -1}).limit(1).next()) || {})._id
  }

  async getPlayerBaseQuery(id) {
    return (await this.db.collection('players').findOne({_id: id}, {_id: 0, baseUniqueId: 1}) || {}).baseUniqueId
  }

  async getPlayer(id) {
    return this.db.collection('players').findOne({_id: id}, {data: 0})
  }

  async exit() {
    console.log('Closing DB...')
    if (this.mongoClient) return this.mongoClient.close()
  }

  // async getBase(id)
}
