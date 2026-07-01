const express = require('express')
const { query } = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')

const router = express.Router()

router.get('/', requireAuth, async (req, res) => {
  const search = req.query.q || ''
  const products = await query(
    `SELECT p.*, c.name AS category_name, c.color AS category_color
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.active = true AND (p.name ILIKE $1 OR p.barcode ILIKE $1)
     ORDER BY p.name ASC`,
    [`%${search}%`]
  )
  const categories = await query('SELECT * FROM categories ORDER BY name ASC')
  res.render('products', { products: products.rows, categories: categories.rows, search })
})

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, barcode, category_id, price, cost, stock, min_stock, unit } = req.body
  await query(
    `INSERT INTO products (name, barcode, category_id, price, cost, stock, min_stock, unit)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [name, barcode || null, category_id || null, price || 0, cost || 0, stock || 0, min_stock || 3, unit || 'unidad']
  )
  res.redirect('/productos')
})

router.post('/:id/editar', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, barcode, category_id, price, cost, stock, min_stock, unit } = req.body
  await query(
    `UPDATE products SET name=$1, barcode=$2, category_id=$3, price=$4, cost=$5, stock=$6, min_stock=$7, unit=$8, updated_at=now()
     WHERE id=$9`,
    [name, barcode || null, category_id || null, price || 0, cost || 0, stock || 0, min_stock || 3, unit || 'unidad', req.params.id]
  )
  res.redirect('/productos')
})

router.post('/:id/eliminar', requireAuth, requireRole('admin'), async (req, res) => {
  await query('UPDATE products SET active = false WHERE id = $1', [req.params.id])
  res.redirect('/productos')
})

router.post('/:id/ajustar-stock', requireAuth, requireRole('admin'), async (req, res) => {
  const { quantity, note } = req.body
  const qty = Number(quantity)
  await query('UPDATE products SET stock = stock + $1 WHERE id = $2', [qty, req.params.id])
  await query(
    `INSERT INTO stock_movements (product_id, type, quantity, reference) VALUES ($1, 'ajuste', $2, $3)`,
    [req.params.id, qty, note || 'Ajuste manual']
  )
  res.redirect('/productos')
})

router.get('/api/buscar', requireAuth, async (req, res) => {
  const term = req.query.q || ''
  const result = await query(
    `SELECT * FROM products WHERE active = true AND (barcode = $1 OR name ILIKE $2) ORDER BY name ASC LIMIT 15`,
    [term, `%${term}%`]
  )
  res.json(result.rows)
})

module.exports = router
