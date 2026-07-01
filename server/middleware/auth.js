function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login')
  }
  next()
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).render('error', { message: 'No tenes permiso para ver esta pagina', user: req.session.user })
    }
    next()
  }
}

function attachUser(req, res, next) {
  res.locals.user = req.session.user || null
  next()
}

module.exports = { requireAuth, requireRole, attachUser }
