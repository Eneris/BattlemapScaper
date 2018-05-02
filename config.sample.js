module.exports = {
  debug: 'info',
  homePage: "https://battlemap.deltatgame.com/#home",
  loginPage: "https://battlemap.deltatgame.com/login/google",
  telegramToken: process.env.TELEGRAM_TOKEN || '',
  credentials: {
    email: process.env.GOOGLE_EMAIL || '',
    password: process.env.GOOGLE_PASSWORD || ""
  }
}