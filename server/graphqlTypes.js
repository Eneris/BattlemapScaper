const gql = require('graphql-tag')

module.exports = gql`
  type Query {
    battles(factions: [Int], resolution: Int): [Battle]
    bases(args: MapSearchInput): [Base]
    cores(args: MapSearchInput): AnyType
    mines(args: MapSearchInput): AnyType
    mineDetail(args: EntityInput): AnyType
    battleDetail(args: EntityInput): BattleDetail
    baseDetail(args: EntityInput): BaseDetail
    clusterDetail(args: EntityInput, type: String): ClusterDetail
    playerDetail(args: EntityInput): PlayerDetail
    coreDetail(args: EntityInput): CoreDetail
    search(term: String, faction: Int): [AnyType]
    request(operation: String, method: String, requestData: AnyType): AnyType
    playerBaseUniqueId(args: EntityInput): String
  }

  type Mutation {
    restart: String
    sendMessage(message: String!, global: Boolean): Boolean
  }

  scalar AnyType

  input MapSearchInput {
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
  }

  input EntityInput {
    id: Int,
    query: String
  }

  type CoreDetail {
    c_id: Int,
    c_b: [CoreLink],
    p_g: Int,
    cf: Int,
    hth: Float,
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

  type PlayerDetail {
    id: Int,
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
    get_faction_details: PlayerFactionInfo,
    base: BaseDetail,
    base_unique_id: String
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
    health: Float,
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
    hth: Float,
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
    detail: BattleDetail
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
    hth: Float,
    max_hth: Int,
    lvl: Int
  }

  type BaseMod {
    cd: String,
    r_no: String,
    hth: Float,
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
