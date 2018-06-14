const gql = require('graphql-tag')

module.exports = gql`
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
    playerBaseUniqueId(id: Int, query: String): String
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
    resolutionTime: String,
    detail(id: Int, query: String): BattleDetail
  }

  type BattleDetail {
    attack_on:String,
    dominance: AnyType,
    id: Int,
    initiated_by_id: Int,
    initiated_on: String,
    is_cancelled: Int,
    is_done: Int,
    oppoBaseDetails: BaseDetail, 
    oppoClusterStrength: Int,
    oppo_base: String,
    oppo_base_fac_enum: Int,
    oppo_base_final_profit: Int,
    oppo_base_name: String,
    ownBaseDetails: BaseDetail, 
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
    r_no: String,
    hth: Int,
    mx_hth: Int,
    lvl: Int
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
