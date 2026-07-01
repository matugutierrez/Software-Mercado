const express = require('express')
const { query } = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')

const router = express.Router()

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, color } = req.body
  await query('INSERT INTO categories (name, color) VALUES ($1, $2)', [name, color || '#6C5CE7'])
  res.redirect('/productos')
})

router.post('/:id/eliminar', requireAuth, requireRole('admin'), async (req, res) => {
  await query('DELETE FROM categories WHERE id = $1', [req.params.id])
  res.redirect('/productos')
})

module.exports = router
