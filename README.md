# 📚 Librería SJ

<div align="center">

![Librería SJ Banner](./assets/banner-libreria-sj.png)

### Una plataforma moderna para vender libros físicos de forma rápida, organizada y profesional.

**Librería SJ** es un e-commerce full stack diseñado para la venta de libros físicos, con catálogo dinámico, carrito de compras, promociones, panel administrativo, gestión de inventario, órdenes, categorías, checkout personalizado, notificaciones por correo y conexión directa con WhatsApp.

---

![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Flask](https://img.shields.io/badge/Backend-Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/API-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)

</div>

---

## 🧭 Tabla de contenido

- [Descripción del proyecto](#-descripción-del-proyecto)
- [Demo](#-demo)
- [Capturas](#-capturas)
- [Características principales](#-características-principales)
- [Tecnologías utilizadas](#-tecnologías-utilizadas)
- [Arquitectura del proyecto](#-arquitectura-del-proyecto)
- [Estructura de carpetas](#-estructura-de-carpetas)
- [Modelo de datos](#-modelo-de-datos)
- [Endpoints principales](#-endpoints-principales)
- [Instalación local](#-instalación-local)
- [Variables de entorno](#-variables-de-entorno)
- [Flujo de compra](#-flujo-de-compra)
- [Panel administrativo](#-panel-administrativo)
- [Promociones y descuentos](#-promociones-y-descuentos)
- [SEO y rendimiento](#-seo-y-rendimiento)
- [Seguridad](#-seguridad)
- [Próximas mejoras](#-próximas-mejoras)
- [Autor](#-autor)

---

## 📌 Descripción del proyecto

**Librería SJ** es una tienda online creada para vender libros físicos de manera profesional, sencilla y confiable.

El proyecto permite a los usuarios explorar libros por categorías, buscar títulos, ver ofertas, agregar productos al carrito y realizar pedidos sin necesidad de registrarse. Además, cuenta con un panel administrativo donde se pueden gestionar libros, categorías, inventario, órdenes y contenido editable del sitio.

La plataforma está pensada para ser clara para el cliente, fácil de administrar y escalable para futuras integraciones como pagos en línea, envíos automatizados, sistema de usuarios y recomendaciones inteligentes.

---

## 🌐 Demo

| Servicio | Enlace |
|---|---|
| Sitio web | [Ver Librería SJ](https://www.libreriajs.com) |
| API Backend | Producción en Render |
| Frontend | Producción en Vercel |

> Nota: Si el dominio cambia, actualiza esta sección con el nuevo enlace oficial.

---

## 🖼 Capturas

> Puedes crear una carpeta llamada `assets` en tu repositorio y colocar ahí las imágenes del proyecto.

### Página principal

![Home Librería SJ](./assets/home.png)

### Catálogo de libros

![Catálogo](./assets/catalogo.png)

### Carrito de compras

![Carrito](./assets/carrito.png)

### Panel administrativo

![Admin](./assets/admin.png)

---

## ✨ Características principales

### 🛍 Para clientes

- Catálogo de libros físicos.
- Búsqueda por título, autor o palabra clave.
- Filtros por categorías.
- Sección de ofertas.
- Vista rápida de cada libro.
- Carrito de compras dinámico.
- Cálculo automático del total.
- Checkout sin necesidad de crear cuenta.
- Confirmación de pedido por WhatsApp.
- Confirmación por correo electrónico.
- Diseño responsive para celulares, tablets y computadoras.
- Interfaz limpia, moderna y fácil de usar.

---

### 🧑‍💼 Para administradores

- Inicio de sesión seguro con JWT.
- Panel privado de administración.
- Crear, editar, activar, archivar y eliminar libros.
- Crear y eliminar categorías.
- Gestión de inventario.
- Control de stock.
- Gestión de órdenes.
- Cambio de estado de pedidos.
- Administración de secciones del sitio.
- Control de libros destacados, novedades, recomendados, ofertas y preventa.

---

### 📦 Gestión de productos

Cada libro puede tener:

- Título.
- Autor.
- Precio normal.
- Precio de oferta.
- Descripción.
- Imagen.
- Stock disponible.
- Categoría.
- Estado activo o archivado.
- Marcador de oferta.
- Marcador de destacado.
- Marcador de novedad.
- Marcador de preventa.
- Marcador de recomendado.
- Promoción 2x1.
- Libro asociado para promoción 2x1.

---

## 🧰 Tecnologías utilizadas

### Frontend

| Tecnología | Uso |
|---|---|
| React | Construcción de la interfaz |
| Vite | Entorno rápido de desarrollo |
| JavaScript | Lógica del frontend |
| CSS | Estilos personalizados |
| Axios | Comunicación con la API |
| LocalStorage | Persistencia temporal del carrito |

---

### Backend

| Tecnología | Uso |
|---|---|
| Python | Lenguaje principal |
| Flask | API REST |
| SQLAlchemy | ORM para base de datos |
| JWT | Autenticación del administrador |
| PostgreSQL | Base de datos en producción |
| SQLite | Base de datos local |
| Gunicorn | Servidor WSGI en producción |
| SMTP | Envío de correos |

---

### Deploy

| Plataforma | Uso |
|---|---|
| Vercel | Deploy del frontend |
| Render | Deploy del backend |
| PostgreSQL Render | Base de datos en producción |

---

## 🏗 Arquitectura del proyecto

```mermaid
flowchart TD
    A[Cliente] --> B[Frontend React en Vercel]
    B --> C[API Flask en Render]
    C --> D[(Base de datos PostgreSQL)]
    C --> E[Servicio SMTP]
    C --> F[WhatsApp Link]
    G[Administrador] --> B
    B --> H[Panel Admin]
    H --> C
