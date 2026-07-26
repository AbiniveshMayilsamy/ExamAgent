const mongoose = require('mongoose')

const agentResultSchema = new mongoose.Schema({
  agentId: Number,
  agentName: String,
  status: {
    type: String,
    enum: ['idle', 'running', 'done', 'failed', 'awaiting_review'],
    default: 'idle',
  },
  startedAt: Date,
  finishedAt: Date,
  logs: [String],
  summary: String,
  llmExplanation: String,
  stats: mongoose.Schema.Types.Mixed,
  output: mongoose.Schema.Types.Mixed,
})

const runSchema = new mongoose.Schema({
  startedAt: { type: Date, default: Date.now },
  finishedAt: Date,
  status: {
    type: String,
    enum: ['running', 'done', 'failed', 'manual_review'],
    default: 'running',
  },
  inputFile: String,
  startDate: String,
  endDate: String,
  leaveDays: [String],
  difficultyMap: mongoose.Schema.Types.Mixed,
  yearSessionPattern: mongoose.Schema.Types.Mixed,
  examsPerBranch: mongoose.Schema.Types.Mixed,
  humanIntervention: { type: Boolean, default: false },
  agents: [agentResultSchema],
  schedule: [mongoose.Schema.Types.Mixed],
  conflicts: [mongoose.Schema.Types.Mixed],
  auditLog: [String],
  aiSuggestions: String,
  agentStats: mongoose.Schema.Types.Mixed,
  deptRollRanges: mongoose.Schema.Types.Mixed,
  totalExams: Number,
  totalArrears: Number,
  conflictsFound: Number,
})

module.exports = mongoose.model('Run', runSchema)
