const express = require('express')
const { query } = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')

const router = express.Router()

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const suppliers = await query('SELECT * FROM suppliers ORDER BY name ASC')
  const products = await query('SELECT id, name, cost FROM products WHERE active = true ORDER BY name ASC')
  const purchases = await query(
    `SELECT pu.*, s.name AS supplier_name
     FROM purchases pu LEFT JOIN suppliers s ON s.id = pu.supplier_id
     ORDER BY pu.created_at DESC LIMIT 20`
  )
  res.render('suppliers', { suppliers: suppliers.rows, products: products.rows, purchases: purchases.rows })
})

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, phone, email, notes } = req.body
  await query('INSERT INTO suppliers (name, phone, email, notes) VALUES ($1,$2,$3,$4)', [name, phone, email, notes])
  res.redirect('/proveedores')
})

router.post('/:id/eliminar', requireAuth, requireRole('admin'), async (req, res) => {
  await query('DELETE FROM suppliers WHERE id = $1', [req.params.id])
  res.redirect('/proveedores')
})

router.post('/compras', requireAuth, requireRole('admin'), async (req, res) => {
  const { supplier_id, items } = req.body
  const parsedItems = JSON.parse(items || '[]')
  if (parsedItems.length === 0) return res.redirect('/proveedores')

  const total = parsedItems.reduce((sum, it) => sum + Number(it.quantity) * Number(it.cost), 0)
  const purchase = await query(
    'INSERT INTO purchases (supplier_id, user_id, total) VALUES ($1,$2,$3) RETURNING id',
    [supplier_id || null, req.session.user.id, total]
  )
  const purchaseId = purchase.rows[0].id

  for (const it of parsedItems) {
    await query(
      'INSERT INTO purchase_items (purchase_id, product_id, quantity, cost) VALUES ($1,$2,$3,$4)',
      [purchaseId, it.productId, it.quantity, it.cost]
    )
    await query('UPDATE products SET stock = stock + $1, cost = $2 WHERE id = $3', [it.quantity, it.cost, it.productId])
    await query(
      `INSERT INTO stock_movements (product_id, type, quantity, reference) VALUES ($1, 'compra', $2, $3)`,
      [it.productId, it.quantity, `Compra #${purchaseId}`]
    )
  }

  res.redirect('/proveedores')
})

module.exports = router
