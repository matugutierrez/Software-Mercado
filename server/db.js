const { Pool } = require('pg')

const useSsl = process.env.DATABASE_SSL === 'true'
const timezone = process.env.TZ || 'America/Argentina/Buenos_Aires'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false
})

async function query(text, params) {
  const client = await pool.connect()
  try {
    await client.query(`SET TIMEZONE TO '${timezone}'`)
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

module.exports = { pool, query }
