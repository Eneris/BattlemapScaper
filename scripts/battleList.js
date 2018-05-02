(async function () {
  const { credentials } = require('../config')
  const Battlemap = require('../libs/battlemap')
    
  const bm = new Battlemap()

  await bm.init(credentials)

  const battles = await bm.getBattleList()

  console.log(battles)

  await bm.exit()
})()
  .catch(console.error)
