const express = require('express')
const { getDbReady } = require('../dbState')
const memoryStore = require('../models/memoryStore')
const Run = require('../models/Run')
const router = express.Router()

function getStore() {
  return getDbReady() ? Run : memoryStore
}

// All runs (history list)
router.get('/', async (_req, res) => {
  const store = getStore()
  const runs = await store.find()
  // Select only needed fields
  const limited = runs.map(r => ({
    _id: r._id,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    status: r.status,
    inputFile: r.inputFile,
    totalExams: r.totalExams,
    totalArrears: r.totalArrears,
    conflictsFound: r.conflictsFound,
  }))
  res.json(limited.slice(0, 20))
})

// Single run full detail
router.get('/:id', async (req, res) => {
  const store = getStore()
  const run = await store.findById(req.params.id)
  if (!run) return res.status(404).json({ error: 'Run not found' })
  res.json(run)
})

module.exports = router