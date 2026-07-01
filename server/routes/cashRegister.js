const express = require('express')
const { query } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

async function getOpenSession(userId) {
  const result = await query(
    `SELECT * FROM cash_sessions WHERE user_id = $1 AND status = 'abierta' ORDER BY opened_at DESC LIMIT 1`,
    [userId]
  )
  return result.rows[0] || null
}

router.get('/', requireAuth, async (req, res) => {
  const session = await getOpenSession(req.session.user.id)
  let movements = []
  let salesTotal = 0

  if (session) {
    const mv = await query('SELECT * FROM cash_movements WHERE cash_session_id = $1 ORDER BY created_at DESC', [session.id])
    movements = mv.rows
    const st = await query(
      `SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE cash_session_id = $1 AND payment_method = 'efectivo'`,
      [session.id]
    )
    salesTotal = Number(st.rows[0].total)
  }

  const history = await query(
    `SELECT cs.*, u.full_name FROM cash_sessions cs JOIN users u ON u.id = cs.user_id
     WHERE cs.status = 'cerrada' ORDER BY cs.closed_at DESC LIMIT 15`
  )

  res.render('cash-register', { session, movements, salesTotal, history: history.rows })
})

router.post('/abrir', requireAuth, async (req, res) => {
  const existing = await getOpenSession(req.session.user.id)
  if (!existing) {
    await query('INSERT INTO cash_sessions (user_id, opening_amount) VALUES ($1, $2)', [req.session.user.id, req.body.opening_amount || 0])
  }
  res.redirect('/caja')
})

router.post('/movimiento', requireAuth, async (req, res) => {
  const session = await getOpenSession(req.session.user.id)
  if (session) {
    await query(
      'INSERT INTO cash_movements (cash_session_id, type, amount, description) VALUES ($1,$2,$3,$4)',
      [session.id, req.body.type, req.body.amount, req.body.description]
    )
  }
  res.redirect('/caja')
})

router.post('/cerrar', requireAuth, async (req, res) => {
  const session = await getOpenSession(req.session.user.id)
  if (!session) return res.redirect('/caja')

  const st = await query(
    `SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE cash_session_id = $1 AND payment_method = 'efectivo'`,
    [session.id]
  )
  const movementsResult = await query(
    `SELECT COALESCE(SUM(CASE WHEN type = 'ingreso' THEN amount ELSE -amount END), 0) AS net FROM cash_movements WHERE cash_session_id = $1`,
    [session.id]
  )

  const expected = Number(session.opening_amount) + Number(st.rows[0].total) + Number(movementsResult.rows[0].net)
  const closingAmount = Number(req.body.closing_amount || 0)
  const difference = closingAmount - expected

  await query(
    `UPDATE cash_sessions SET status='cerrada', closing_amount=$1, expected_amount=$2, difference=$3, closed_at=now() WHERE id=$4`,
    [closingAmount, expected, difference, session.id]
  )

  res.redirect('/caja')
})

module.exports = { router, getOpenSession }
