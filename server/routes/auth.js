const express = require('express')
const bcrypt = require('bcryptjs')
const { query } = require('../db')

const router = express.Router()

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/')
  res.render('login', { error: null })
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  const result = await query('SELECT * FROM users WHERE username = $1 AND active = true', [username])
  const u = result.rows[0]

  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    return res.render('login', { error: 'Usuario o contrasena incorrectos' })
  }

  req.session.user = { id: u.id, username: u.username, fullName: u.full_name, role: u.role }
  res.redirect('/')
})

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'))
})

module.exports = router
