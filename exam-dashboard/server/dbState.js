// Simple config to track DB state - avoiding circular require issues
let dbReady = false

function setDbReady(ready) {
  dbReady = ready
}

function getDbReady() {
  return dbReady
}

module.exports = { getDbReady, setDbReady }