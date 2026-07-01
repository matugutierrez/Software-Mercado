const express = require('express')
const { query, pool } = require('../db')
const { requireAuth } = require('../middleware/auth')
const { getOpenSession } = require('./cashRegister')

const router = express.Router()

router.get('/', requireAuth, async (req, res) => {
  const session = await getOpenSession(req.session.user.id)
  const categories = await query('SELECT * FROM categories ORDER BY name ASC')
  const products = await query(
    `SELECT p.*, c.name AS category_name, c.color AS category_color
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.active = true ORDER BY p.name ASC`
  )
  res.render('pos', { session, categories: categories.rows, products: products.rows })
})

router.post('/cobrar', requireAuth, async (req, res) => {
  const session = await getOpenSession(req.session.user.id)
  if (!session) {
    return res.status(400).json({ error: 'No hay una caja abierta. Abri la caja antes de vender.' })
  }

  const { items, discount, payment_method, amount_paid, customer_id } = req.body
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El carrito esta vacio' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const subtotal = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0)
    const disc = Number(discount) || 0
    const total = Math.max(subtotal - disc, 0)
    const paid = Number(amount_paid) || total
    const change = payment_method === 'efectivo' ? Math.max(paid - total, 0) : 0

    const saleResult = await client.query(
      `INSERT INTO sales (user_id, customer_id, cash_session_id, subtotal, discount, total, payment_method, amount_paid, change_given)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, created_at`,
      [req.session.user.id, customer_id || null, session.id, subtotal, disc, total, payment_method || 'efectivo', paid, change]
    )
    const saleId = saleResult.rows[0].id

    for (const it of items) {
      const productResult = await client.query('SELECT stock, name FROM products WHERE id = $1 FOR UPDATE', [it.productId])
      const product = productResult.rows[0]
      if (!product) continue

      const lineSubtotal = Number(it.quantity) * Number(it.unitPrice)
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [saleId, it.productId, product.name, it.quantity, it.unitPrice, lineSubtotal]
      )
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [it.quantity, it.productId])
      await client.query(
        `INSERT INTO stock_movements (product_id, type, quantity, reference) VALUES ($1, 'venta', $2, $3)`,
        [it.productId, -Math.abs(Number(it.quantity)), `Venta #${saleId}`]
      )
    }

    await client.query('COMMIT')
    res.json({ saleId, total, change, createdAt: saleResult.rows[0].created_at })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'No se pudo procesar la venta' })
  } finally {
    client.release()
  }
})

router.get('/recibo/:id', requireAuth, async (req, res) => {
  const saleResult = await query(
    `SELECT s.*, u.full_name AS cashier_name, c.name AS customer_name
     FROM sales s LEFT JOIN users u ON u.id = s.user_id LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.id = $1`,
    [req.params.id]
  )
  const sale = saleResult.rows[0]
  if (!sale) return res.status(404).send('Venta no encontrada')

  const itemsResult = await query('SELECT * FROM sale_items WHERE sale_id = $1', [req.params.id])
  res.render('receipt', { sale, items: itemsResult.rows })
})

module.exports = router
