const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { triggerPipeline, resumeAgent } = require('../controllers/pipelineController')

const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})

const upload = multer({ storage })
const router = express.Router()

// Support multi-file uploads (year_1, year_2, year_3, year_4, arrear_file)
router.post('/trigger', upload.any(), triggerPipeline)
router.post('/resume', resumeAgent)

module.exports = router
