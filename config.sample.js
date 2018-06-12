module.exports = {
  debug: 'info',
  homePage: 'https://battlemap.deltatgame.com/#home',
  loginPage: 'https://battlemap.deltatgame.com/login/google',
  telegramToken: process.env.TELEGRAM_TOKEN || '',
  credentials: {
    email: process.env.GOOGLE_EMAIL || '',
    password: process.env.GOOGLE_PASSWORD || ''
  },
  firebase: {
    databaseUrl: process.env.FB_DATABASE_URL || '',
    projectId: process.env.FB_PROJECT_ID || '',
    clientEmail: process.env.FB_CLIENT_EMAIL || '',
    privateKey: process.env.FB_PRIVATE_KEY || ''
  },
  mongoDb: {
    url: process.env.MONGO_URL || '',
    port: 27017,
    database: process.env.MONGO_DATABASE || '',
    user: process.env.MONGO_USER || '',
    password: process.env.MONGO_PASSWORD || ''
  },
  expressPort: process.env.PORT || 8080
}
