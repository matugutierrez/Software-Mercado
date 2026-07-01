const express = require('express')
const { query } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/', requireAuth, async (req, res) => {
  const customers = await query('SELECT * FROM customers ORDER BY name ASC')
  res.render('customers', { customers: customers.rows })
})

router.post('/', requireAuth, async (req, res) => {
  const { name, phone, email, notes } = req.body
  await query('INSERT INTO customers (name, phone, email, notes) VALUES ($1,$2,$3,$4)', [name, phone, email, notes])
  res.redirect('/clientes')
})

router.post('/:id/editar', requireAuth, async (req, res) => {
  const { name, phone, email, notes } = req.body
  await query('UPDATE customers SET name=$1, phone=$2, email=$3, notes=$4 WHERE id=$5', [name, phone, email, notes, req.params.id])
  res.redirect('/clientes')
})

router.post('/:id/eliminar', requireAuth, async (req, res) => {
  await query('DELETE FROM customers WHERE id = $1', [req.params.id])
  res.redirect('/clientes')
})

router.get('/api/buscar', requireAuth, async (req, res) => {
  const term = req.query.q || ''
  const result = await query('SELECT * FROM customers WHERE name ILIKE $1 ORDER BY name ASC LIMIT 10', [`%${term}%`])
  res.json(result.rows)
})

module.exports = router
