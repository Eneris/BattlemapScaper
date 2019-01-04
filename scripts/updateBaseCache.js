const { credentials } = require('../config')
const Battlemap = require('../libs/battlemap')
const Cache = require('../libs/cache')
const fs = require('fs')
const path = require('path')

const fetch = require('node-fetch')
const gql = require('graphql-tag')

const {handleLog, handleError} = require('../libs/functions')

const fetchGraphql = ({query, variables}) => fetch('http://deltat.eneris.wtf/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: query,
    variables: variables
  })
}).then(data => data.json())

const cache = new Cache()

const queryPlayer = async (id) => (await fetchGraphql({
  query: gql`
    query player($args: EntityInput!) {
      playerDetail(args: $args) {
        base_level
        level_id
        core_info_id
        stats_id
        poi_info_id
        social_info_id
        uname
        faction_id
        get_core_info {
          id
          no_of_cores_seeded
          owned_cores
          no_of_bases_destroyed
          no_of_cores_destroyed
          no_of_cores_captured
        }
        get_stats_public {
          id
          total_mods_deployed
          nof_of_battles_won
          achievements
          unlocked_skills
        }
        get_poi_info {
          id
          no_of_pois_captured
        }
        get_faction_details {
          id
          fac_enum
        }
      }
    }
  `,
  variables: {
    args: { id }
  }
})).data.playerDetail

const queryBaseDetail = async (id) => (await fetchGraphql({
  query: gql`
    query baseDetail($args: EntityInput!) {
      baseDetail(args: $args) {
        av_pwr
        bf
        bs_hsid
        bs_id
        bs_lnks {
          fwd
          lng
          ltd
        }
        cr_lnks {
          lng
          ltd
        }
        cr_nm
        del
        hth
        lat
        lng
        lvl
        mltng
        mx_hth
        nm
        ownr
        rings {
          cd
          hth
          lvl
          mx_hth
          r_no
        }
        strngth
        tc_gen
        tm_gen
        us_pwr
      }
    }
  `,
  variables: {
    args: { id }
  }
})).data.baseDetail

const main = async () => {
  await cache.init()
  const lastBaseId = await cache.getLastId('bases')

  handleLog('Last base id found in cache', lastBaseId)

  let basesList = (await fetchGraphql({
    query: gql`
      query bases($args: MapSearchInput!) {
        bases(args: $args) {
          faction
          health
          id
          latitude
          level_id
          longitude
          name
          owner_id
        }
      }
    `,
    variables: {
      args: {
        latMin: -200,
        lngMin: -200,
        latMax: 200,
        lngMax: 200,
        lastId: lastBaseId
      }
    }
  })).data.bases

  handleLog('Bases found', basesList.length)

  for (let key in basesList) {
    try {
      const base = basesList[key]
      handleLog('Save base cache', base.id)
      await cache.saveBase(base.id, base)

      handleLog('Fetching base profile')
      const baseDetail = await queryBaseDetail(base.id)
      await cache.saveBaseDetail(base.id, baseDetail)

      handleLog('Fetching player profile')
      const player = await queryPlayer(base.owner_id)
      await cache.savePlayer(base.owner_id, player, baseDetail.bs_hsid)
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  await cache.exit()
  return true
}

main()
  .catch(err => {
    handleLog('Got error')
    handleError(err)
    return cache.exit()
  })
  .then(() => process.exit())
