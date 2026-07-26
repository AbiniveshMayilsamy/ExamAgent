const express = require('express')
const router = express.Router()

// In-memory settings (persisted to process.env for the current session)
router.post('/', (req, res) => {
  const { ollamaUrl, ollamaModel } = req.body
  if (ollamaUrl) process.env.OLLAMA_URL = ollamaUrl
  if (ollamaModel) process.env.OLLAMA_MODEL = ollamaModel
  res.json({ ok: true })
})

router.get('/', (req, res) => {
  res.json({
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3',
  })
})

module.exports = router
