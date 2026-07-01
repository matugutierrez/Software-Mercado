const express = require('express')
const { query } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/', requireAuth, async (req, res) => {
  const todaySummary = await query(
    `SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS sales_count
     FROM sales WHERE created_at >= date_trunc('day', now())`
  )

  const weekSales = await query(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, SUM(total) AS total
     FROM sales WHERE created_at > now() - interval '7 days'
     GROUP BY 1 ORDER BY 1 ASC`
  )

  const lowStock = await query(
    `SELECT * FROM products WHERE active = true AND stock <= min_stock ORDER BY stock ASC LIMIT 8`
  )

  const topToday = await query(
    `SELECT si.product_name, SUM(si.quantity) AS quantity
     FROM sale_items si JOIN sales s ON s.id = si.sale_id
     WHERE s.created_at >= date_trunc('day', now())
     GROUP BY si.product_name ORDER BY quantity DESC LIMIT 5`
  )

  const productCount = await query('SELECT COUNT(*) FROM products WHERE active = true')
  const customerCount = await query('SELECT COUNT(*) FROM customers')

  res.render('dashboard', {
    todaySummary: todaySummary.rows[0],
    weekSales: weekSales.rows,
    lowStock: lowStock.rows,
    topToday: topToday.rows,
    productCount: productCount.rows[0].count,
    customerCount: customerCount.rows[0].count
  })
})

module.exports = router
