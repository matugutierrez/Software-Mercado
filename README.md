# Aura POS

Sistema de gestion y punto de venta para kioscos y mercados de barrio. Incluye ventas rapidas con escaneo de codigo de barras, control de stock, caja diaria, clientes, proveedores/compras, reportes y un modulo de prediccion de demanda que te avisa que reponer antes de que se te acabe.

Hecho con Node.js, Express, EJS y PostgreSQL. No usa ningun servicio externo: los graficos son SVG generados en el propio navegador y las sesiones se guardan en tu misma base de datos.

## Que incluye

- Login con roles (administrador y cajero)
- Punto de venta con grilla de productos, categorias, busqueda y lectura de codigo de barras (funciona con cualquier lector USB tipo teclado)
- Carrito con descuento, metodos de pago (efectivo, tarjeta, transferencia) y calculo de vuelto
- Recibo imprimible en formato ticket
- Caja diaria: apertura, ingresos/egresos, cierre con calculo de diferencia
- Catalogo de productos con categorias, stock minimo y alertas
- Clientes y proveedores, con registro de compras que actualiza stock y costo automaticamente
- Reportes: ventas por dia, productos mas vendidos, metodos de pago, ticket promedio
- Prediccion de demanda por producto: promedio diario, tendencia y dias hasta quedarte sin stock

## Como correrlo en tu computadora

1. Instalar dependencias

```
npm install
```

2. Copiar `.env.example` a `.env` y completar `DATABASE_URL` con tu Postgres local.

3. Crear las tablas y el usuario administrador inicial

```
npm run migrate
```

4. Levantar el servidor

```
npm start
```

La aplicacion queda disponible en `http://localhost:3000`. El usuario administrador que se crea es el que definas en `ADMIN_USERNAME` / `ADMIN_PASSWORD` (por defecto `admin` / `admin123`).

## Como subirlo a Render

1. Subi esta carpeta a un repositorio (GitHub, GitLab o Bitbucket).
2. En Render, crea tu base de datos PostgreSQL (la armas vos mismo, como dijiste). Copia la "Internal Database URL" o "External Database URL" que te da Render.
3. Crea un nuevo **Web Service** en Render apuntando a ese repositorio.
   - Build command: `npm install`
   - Start command: `npm run migrate && npm start`
4. En las variables de entorno del Web Service agrega:
   - `DATABASE_URL`: la URL de tu base Postgres de Render
   - `DATABASE_SSL`: `true`
   - `SESSION_SECRET`: cualquier texto largo y aleatorio
   - `ADMIN_USERNAME` y `ADMIN_PASSWORD`: las credenciales del primer usuario administrador
5. Deploy. La primera vez que arranca, `npm run migrate` crea las tablas y el usuario administrador.

El archivo `render.yaml` incluido es solo una referencia opcional por si en algun momento querés crear los recursos con un Blueprint; no es necesario usarlo si preferís crear la base y el servicio a mano.

## Estructura del proyecto

```
server/       backend Express (rutas, autenticacion, conexion a la base)
views/        vistas EJS (paginas y componentes reutilizables)
public/       CSS, JavaScript del navegador y assets
schema.sql    esquema completo de la base de datos
```

Todo el codigo esta pensado para que lo puedas modificar libremente: los nombres de rutas, tablas y estilos son simples y directos.
