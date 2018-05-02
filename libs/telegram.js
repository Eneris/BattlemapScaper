const TelegramBot = require('tgfancy')
const config = require('../config')

module.exports = new TelegramBot(
  config.telegramToken, {
    polling: true
  }
);