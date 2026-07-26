const express = require('express')
const Run = require('../models/Run')
const router = express.Router()

// All runs (history list)
router.get('/', async (_req, res) => {
  const runs = await Run.find({}, 'startedAt finishedAt status inputFile totalExams totalArrears conflictsFound')
    .sort({ startedAt: -1 })
    .limit(20)
  res.json(runs)
})

// Single run full detail
router.get('/:id', async (req, res) => {
  const run = await Run.findById(req.params.id)
  if (!run) return res.status(404).json({ error: 'Run not found' })
  res.json(run)
})

module.exports = router
