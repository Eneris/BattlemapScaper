(async function () {
  const { credentials } = require('../config')

  const Battlemap = require('../libs/battlemap')
  const Telegram = require('../libs/telegram')

  const bm = new Battlemap()

  Telegram.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id.toString()
    const messageId = msg.message_id
    await bm.init(credentials)
    Telegram.sendMessage(chatId, 'Started...', {reply_to_message_id: messageId})
  })

  Telegram.onText(/\/battle (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString()
    const battleId = match[1] || null

    if (!battleId) return Telegram.sendMessage(chatId, 'Wrong BattleID')

    const battle = await bm.getBattleDetails(parseInt(battleId))

    console.log('Battle', battle)
    if (!battle) return Telegram.sendMessage(chatId, 'Battle not found')
    
    const now = new Date()
    const battleEnd = new Date(battle.attack_on + " GMT+00:00 ")
    const diff = battle.own_base_final_profit - battle.oppo_base_final_profit

    Telegram.sendMessage(chatId, [
      'Cosmo: ' + battle.own_base_final_profit,
      'Nyoco: ' + battle.oppo_base_final_profit,
      'Difference: ' + diff + '(' + (diff > 0 ? 'Cosmo' : 'Nyoco') + ')',
      'TimeLeft: ' + Math.floor((battleEnd.getTime() - now.getTime()) / 1000 / 60) + 'min'
    ].join("\n"))
  })

  Telegram.onText(/\/stop/, async (msg) => {
    const chatId = msg.chat.id.toString()
    const messageId = msg.message_id
    await bm.exit()
    Telegram.sendMessage(chatId, 'Stopped...', {reply_to_message_id: messageId})
    process.exit()
  })
})()
  .catch(console.error)