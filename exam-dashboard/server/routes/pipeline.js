const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { triggerPipeline, resumeAgent } = require('../controllers/pipelineController')

const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir)

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})

const upload = multer({ storage })
const router = express.Router()

router.post('/trigger', upload.single('file'), triggerPipeline)
router.post('/resume', resumeAgent)

module.exports = router
