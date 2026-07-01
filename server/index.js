require('dotenv').config()
const express = require('express')
const path = require('path')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)

const { pool } = require('./db')
const { attachUser, requireAuth } = require('./middleware/auth')

const authRoutes = require('./routes/auth')
const productRoutes = require('./routes/products')
const categoryRoutes = require('./routes/categories')
const customerRoutes = require('./routes/customers')
const supplierRoutes = require('./routes/suppliers')
const { router: cashRegisterRoutes } = require('./routes/cashRegister')
const salesRoutes = require('./routes/sales')
const reportRoutes = require('./routes/reports')
const dashboardRoutes = require('./routes/dashboard')

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '..', 'views'))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '..', 'public')))

app.use(
  session({
    store: new pgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'kiosco-secreto',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 12 }
  })
)
app.use(attachUser)

app.use('/', authRoutes)
app.use('/', dashboardRoutes)
app.use('/productos', productRoutes)
app.use('/categorias', categoryRoutes)
app.use('/clientes', customerRoutes)
app.use('/proveedores', supplierRoutes)
app.use('/caja', cashRegisterRoutes)
app.use('/pos', salesRoutes)
app.use('/reportes', reportRoutes)

app.use((req, res, next) => {
  res.status(404).render('error', { message: 'Pagina no encontrada', user: req.session.user })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).render('error', { message: 'Ocurrio un error inesperado', user: req.session.user })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Kiosco POS corriendo en el puerto ${port}`)
})
