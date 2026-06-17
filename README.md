<!-- HEADER ANIMADO -->
<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0f172a,50:1e293b,100:facc15&height=230&section=header&text=Librería%20SJ&fontSize=58&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=E-commerce%20moderno%20para%20libros%20físicos&descAlignY=58&descSize=18" />

</div>

<div align="center">

# 📚 Librería SJ

### Plataforma full stack para venta de libros físicos en República Dominicana

<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=24&duration=2800&pause=700&color=FACC15&center=true&vCenter=true&width=900&lines=Catálogo+de+libros+físicos;Carrito+de+compras+dinámico;Panel+administrativo+privado;Checkout+con+WhatsApp+y+correo;Frontend+React+%2B+Backend+Flask" alt="Typing SVG" />

<br/>

<a href="https://libreriasj.com">
  <img src="https://img.shields.io/badge/Visitar%20sitio-libreriasj.com-facc15?style=for-the-badge&logo=googlechrome&logoColor=black" />
</a>

</div>

---

<div align="center">

![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Flask](https://img.shields.io/badge/Backend-Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/ORM-SQLAlchemy-D71F00?style=for-the-badge)
![SQLite](https://img.shields.io/badge/Local%20DB-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Production%20DB-PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/API-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)

</div>

---

## 🧠 Sobre el proyecto

**Librería SJ** es una tienda online moderna para vender libros físicos de forma sencilla, rápida y profesional.

El proyecto fue desarrollado como una aplicación **full stack**, separando el frontend y el backend para lograr una arquitectura más limpia, escalable y fácil de mantener.

El cliente puede navegar por el catálogo, buscar libros, ver ofertas, agregar productos al carrito y completar su pedido sin registrarse.  
El administrador puede gestionar libros, categorías, inventario, órdenes, contenido del sitio y promociones desde un panel privado.

---

## 🌐 Demo oficial

<div align="center">

### 🔗 Sitio en producción

<a href="https://libreriasj.com">
  <img src="https://img.shields.io/badge/ABRIR%20LIBRERÍA%20SJ-111827?style=for-the-badge&logo=googlechrome&logoColor=facc15" />
</a>

</div>

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

## ✨ Características principales

<table>
  <tr>
    <td width="50%">
      <h3>🛒 Para clientes</h3>
      <ul>
        <li>Catálogo de libros físicos.</li>
        <li>Búsqueda por título, autor o palabra clave.</li>
        <li>Filtros por categorías.</li>
        <li>Sección de ofertas.</li>
        <li>Carrito de compras dinámico.</li>
        <li>Checkout sin registro obligatorio.</li>
        <li>Confirmación por WhatsApp.</li>
        <li>Confirmación por correo electrónico.</li>
        <li>Diseño responsive para móviles, tablets y laptops.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🧑‍💼 Para administradores</h3>
      <ul>
        <li>Login privado con autenticación JWT.</li>
        <li>Panel administrativo.</li>
        <li>Crear, editar y archivar libros.</li>
        <li>Gestión de categorías.</li>
        <li>Control de inventario.</li>
        <li>Gestión de órdenes.</li>
        <li>Cambio de estado de pedidos.</li>
        <li>Administración de contenido del sitio.</li>
        <li>Control de ofertas, novedades y destacados.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🏗 Arquitectura general


flowchart TD
    A[Usuario / Cliente] --> B[Frontend React + Vite]
    B --> C[API Flask]
    C --> D[(Base de datos)]
    C --> E[Correo SMTP]
    C --> F[WhatsApp Link]

    G[Administrador] --> H[Panel Admin]
    H --> B
    H --> C

    B --> I[Vercel]
    C --> J[Render]

---

<div align="center">

### 🚀 Desarrollado por Quisqueya Tech Labs

<img width="680" height="480" alt="quisqueya_tech_labs" src="https://github.com/user-attachments/assets/5395f5f4-7ad1-45f5-a37c-6c6f99e7ecdc" />

<br/>

**Tecnología creada con visión, disciplina y propósito desde República Dominicana <img width="100" height="100" alt="ProudToBeDominicanDominicanIndependenceGIF" src="https://github.com/user-attachments/assets/f5eb3f3b-13b9-4bda-92fe-c8d15d33b221" />
.**

</div>
```



