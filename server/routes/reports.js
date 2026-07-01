const express = require('express')
const { query } = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { movingAverageForecast, daysUntilStockout } = require('../utils/forecast')

const router = express.Router()

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const raw = parseInt(req.query.range, 10)
  const range = [7, 30, 90].includes(raw) ? raw : 30

  const salesByDay = await query(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, SUM(total) AS total, COUNT(*) AS count
     FROM sales WHERE created_at > now() - ($1 || ' days')::interval
     GROUP BY 1 ORDER BY 1 ASC`,
    [range]
  )

  const topProducts = await query(
    `SELECT si.product_name, SUM(si.quantity) AS quantity, SUM(si.subtotal) AS total
     FROM sale_items si JOIN sales s ON s.id = si.sale_id
     WHERE s.created_at > now() - ($1 || ' days')::interval
     GROUP BY si.product_name ORDER BY total DESC LIMIT 10`,
    [range]
  )

  const byPaymentMethod = await query(
    `SELECT payment_method, SUM(total) AS total, COUNT(*) AS count
     FROM sales WHERE created_at > now() - ($1 || ' days')::interval
     GROUP BY payment_method`,
    [range]
  )

  const summary = await query(
    `SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS sales_count,
            COALESCE(AVG(total),0) AS avg_ticket
     FROM sales WHERE created_at > now() - ($1 || ' days')::interval`,
    [range]
  )

  const lowStock = await query(
    `SELECT * FROM products WHERE active = true AND stock <= min_stock ORDER BY stock ASC`
  )

  res.render('reports', {
    range,
    salesByDay: salesByDay.rows,
    topProducts: topProducts.rows,
    byPaymentMethod: byPaymentMethod.rows,
    summary: summary.rows[0],
    lowStock: lowStock.rows
  })
})

router.get('/prediccion', requireAuth, requireRole('admin'), async (req, res) => {
  const products = await query('SELECT * FROM products WHERE active = true ORDER BY name ASC')

  const forecasts = []
  for (const product of products.rows) {
    const history = await query(
      `SELECT to_char(date_trunc('day', s.created_at), 'YYYY-MM-DD') AS day, SUM(si.quantity) AS quantity
       FROM sale_items si JOIN sales s ON s.id = si.sale_id
       WHERE si.product_id = $1 AND s.created_at > now() - interval '30 days'
       GROUP BY 1 ORDER BY 1 ASC`,
      [product.id]
    )
    const quantities = history.rows.map((r) => Number(r.quantity))
    const forecast = movingAverageForecast(quantities, 7)
    const stockoutDays = daysUntilStockout(Number(product.stock), forecast.dailyAverage)

    if (quantities.length > 0 || Number(product.stock) <= Number(product.min_stock)) {
      forecasts.push({ product, forecast, stockoutDays })
    }
  }

  forecasts.sort((a, b) => (a.stockoutDays ?? 999) - (b.stockoutDays ?? 999))

  const atRisk = forecasts.filter((f) => f.stockoutDays !== null && f.stockoutDays <= 3)
  const outOfStock = forecasts.filter((f) => Number(f.product.stock) <= 0)
  const totalEvaluated = forecasts.length

  res.render('forecast', { forecasts, atRisk: atRisk.length, outOfStock: outOfStock.length, totalEvaluated })
})

module.exports = router
