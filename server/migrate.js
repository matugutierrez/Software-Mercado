require('dotenv').config()
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const { pool } = require('./db')

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8')
  await pool.query(schema)

  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  const existing = await pool.query('SELECT id FROM users WHERE username = $1', [adminUsername])
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10)
    await pool.query(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4)',
      [adminUsername, hash, 'Administrador', 'admin']
    )
    console.log(`Usuario admin creado: ${adminUsername} / ${adminPassword}`)
  } else {
    console.log('El usuario admin ya existe, no se crea de nuevo.')
  }

  const catCount = await pool.query('SELECT count(*) FROM categories')
  if (Number(catCount.rows[0].count) === 0) {
    const defaults = [
      ['Almacen', '#6C5CE7'],
      ['Bebidas', '#00CEC9'],
      ['Golosinas', '#FD79A8'],
      ['Limpieza', '#0984E3'],
      ['Cigarrillos', '#636E72'],
      ['Otros', '#B2BEC3']
    ]
    for (const [name, color] of defaults) {
      await pool.query('INSERT INTO categories (name, color) VALUES ($1, $2)', [name, color])
    }
    console.log('Categorias iniciales creadas.')
  }

  console.log('Migracion completa.')
  await pool.end()
}

run().catch((err) => {
  console.error('Error en la migracion', err)
  process.exit(1)
})
