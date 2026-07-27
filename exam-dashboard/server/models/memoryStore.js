// In-memory fallback when MongoDB is unavailable

const memoryStore = {
  runs: new Map(),
  counter: 1,

  async create(data) {
    const run = {
      _id: `mem_${this.counter++}`,
      ...data,
      createdAt: new Date(),
    }
    this.runs.set(run._id, run)
    return run
  },

  async findById(id) {
    return this.runs.get(id) || this.runs.get(`mem_${id}`)
  },

  async find() {
    return Array.from(this.runs.values()).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    )
  },

  async findByIdAndUpdate(id, update) {
    const key = id.startsWith('mem_') ? id : `mem_${id}`
    const existing = this.runs.get(key)
    if (!existing) return null
    
    const updated = { ...existing, ...update }
    this.runs.set(key, updated)
    return updated
  },
}

module.exports = memoryStore