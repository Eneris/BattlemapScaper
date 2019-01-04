
const Sentry = require('@sentry/node')
const delay = (timeToWait) => new Promise((resolve) => setTimeout(resolve, timeToWait))
const handleLog = (...args) => console.log('[' + (new Date()).toISOString() + ']', ...args)
const handleError = (err) => {
  if (typeof err === 'string') Sentry.captureMessage(err)
  else if (err instanceof Error) Sentry.captureException(err)
  console.error(err)
}

module.exports = {
  delay,
  handleLog,
  handleError
}
