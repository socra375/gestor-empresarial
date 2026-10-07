# Gestor Empresarial para Salones de Belleza
## Guía Completa del Sistema

---

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [¿Cómo Funciona?](#cómo-funciona)
3. [Características Principales](#características-principales)
4. [Módulos y Funcionalidades](#módulos-y-funcionalidades)
5. [Tipos de Clientes](#tipos-de-clientes)
6. [Planes de Suscripción](#planes-de-suscripción)
7. [Información Técnica](#información-técnica)
8. [Seguridad y Cumplimiento](#seguridad-y-cumplimiento)

---

## Descripción General

**Gestor Empresarial** es una plataforma completa, profesional y multidioma para la gestión integral de negocios de belleza y bienestar. Diseñada específicamente para:

- 💇 Salones de belleza y peluquerías
- 💈 Barberías
- 💅 Spas
- 🧖 Centros de masajes
- 💄 Estudios de estética

### ¿Qué es?

Una aplicación web moderna, rápida y segura que funciona en cualquier dispositivo (computadora, tablet, smartphone) sin necesidad de instalar nada. Toda la información está centralizada en la nube, accesible desde cualquier lugar.

### Versión Actual

**v2.0** — Reescrito completamente con tecnología moderna (Vite + TypeScript + Svelte 5), reemplazando la versión anterior. Más rápido, más confiable y con una interfaz completamente rediseñada.

---

## ¿Cómo Funciona?

### Flujo Típico de Uso

1. **Registro**: El dueño del salón se registra con su email en la plataforma
2. **Configuración Inicial**: Agrega información del negocio (nombre, logo, moneda, impuestos)
3. **Definición de Servicios**: Crea el catálogo de servicios con precios y duraciones
4. **Gestión de Clientes**: Registra clientes y su información de contacto
5. **Agenda Diaria**: Crea y gestiona citas de clientes
6. **Facturación**: Genera facturas automáticas al completar citas
7. **Equipo**: Invita a empleados para que gestionen su parte de la agenda

### Acceso

- **Para Dueños/Administradores**: Acceso completo a todas las funciones
- **Para Empleados**: Acceso limitado (ven solo sus citas y clientes, sin facturación ni configuración)
- **Todos los datos**: Guardados automáticamente en la nube

---

## Características Principales

### ✅ Gestión de Agenda

- Vista diaria de citas (mañana/tarde)
- Citas programadas y walk-ins
- Estados de cita: pendiente, confirmada, completada, cancelada, no-show
- Asignación de especialista y servicio
- Recordatorios automáticos por WhatsApp

### ✅ Gestión de Clientes

- Base de datos centralizada de clientes
- Historial completo de visitas
- Teléfono normalizado para recordatorios automáticos
- Servicios y especialistas preferidos
- Créditos pendientes por cobrar

### ✅ Catálogo de Servicios

- Precios y duraciones personalizables
- Asignación de especialistas habilitados
- Categorización de servicios
- Modificación rápida de precios

### ✅ Facturación

- Generación automática de facturas al completar citas
- Métodos de pago: efectivo, tarjeta, transfer, crédito
- PDF descargable con logo del negocio
- Números de factura secuenciales por negocio
- Cálculo automático de impuestos
- Historial de todas las facturas emitidas

### ✅ Equipo de Trabajo

- Invitaciones por código con expiración
- Roles: administrador y empleado
- Permisos a nivel de base de datos (no solo de interfaz)
- Acceso de solo lectura para empleados
- Registro de actividad de todos los usuarios

### ✅ Dashboard e Informes

- Resumen de ingresos del período
- Gráfico de tendencias (últimos 7 días)
- Cuentas por cobrar por cliente
- Próximas citas del día
- Checklist para negocios nuevos

### ✅ Configuración Personalizada

- Datos del negocio (nombre, descripción, datos de contacto)
- Logo e identidad de marca
- Moneda y símbolos
- Impuestos (IVA, ISR, etc.)
- Favicon y PWA instalable
- Idioma del negocio

### ✅ Idiomas

Disponible completamente en 6 idiomas:
- 🇪🇸 Español
- 🇬🇧 Inglés
- 🇫🇷 Francés
- 🇵🇹 Portugués
- 🇩🇪 Alemán
- 🇮🇹 Italiano

Cada negocio puede elegir su idioma y se recuerda automáticamente.

---

## Módulos y Funcionalidades

### 1. **INICIO (Dashboard)**

Página de bienvenida y resumen ejecutivo:

- Para negocios nuevos: Checklist de configuración inicial
- Ingresos del período actual
- Próximas citas del día
- Gráfico de ingresos (últimos 7 días)
- Cuentas por cobrar pendientes
- Especialistas más solicitados

### 2. **AGENDA**

Gestión completa de citas:

- Vista por día (mañana/tarde)
- Crear cita programada o walk-in
- Editar cita existente
- Cambiar estado de cita
- Recordar cliente por WhatsApp
- Avisos de citas para mañana
- Múltiples servicios por cita
- Asignación de especialista

### 3. **CLIENTES**

Base de datos de clientes:

- Listado completo de clientes
- Historial de citas de cada cliente
- Servicios preferidos
- Especialista preferido
- Créditos pendientes
- Información de contacto (teléfono, email)
- Notas personales (formato WALKIN para clientes ocasionales)

### 4. **SERVICIOS**

Catálogo de servicios:

- Nombre y descripción
- Precio
- Duración (en minutos)
- Especialistas habilitados
- Edición rápida de precios
- Orden personalizable

### 5. **FACTURAS**

Sistema de facturación:

- Generadas automáticamente al completar cita
- Resumen de cliente, servicio y precio
- Descuento aplicable
- Método de pago (efectivo, tarjeta, transfer, crédito)
- Cálculo automático de impuestos
- PDF descargable con logo del negocio
- Número de factura secuencial
- Historial filtrable por rango de fechas

### 6. **EQUIPO**

Gestión de empleados:

- Generar invitaciones por código único
- Establecer fecha de expiración
- Empleados con acceso de solo lectura
- Roles: administrador (acceso completo) y empleado (solo agenda)
- Registro de actividad de cada usuario
- Posibilidad de cambiar o revocar acceso

### 7. **CONFIGURACIÓN**

Personalización completa:

**Datos del Negocio:**
- Nombre, descripción, ubicación
- Teléfono, email, sitio web

**Branding:**
- Logo (para facturas, favicon, PWA)
- Colores personalizables
- Favicon
- App instalable (PWA)

**Finanzas:**
- Moneda del negocio
- Impuestos (IVA, ISR, ITBIS, etc.)
- Tasas de impuesto personalizables

**Preferencias:**
- Idioma del negocio
- Apariencia (claro/oscuro)
- Zona horaria

**Seguridad:**
- Cambio de contraseña
- Autenticación de dos factores (2FA)

**Auditoría:**
- Log de actividad de todos los usuarios
- Fechas y horas de acceso
- Qué cambió y quién lo cambió

---

## Tipos de Clientes

La plataforma está diseñada para **negocios de belleza y bienestar de todos los tamaños**:

### 📌 Pequeños Salones
- 1-3 empleados
- Hasta 50-100 clientes regulares
- Citas diarias
- Facturación simple

**Ejemplo**: Peluquería local, salón de manicura, barbería independiente.

### 📌 Salones Medianos
- 4-10 empleados
- 100-500 clientes regulares
- Múltiples servicios y especialistas
- Facturación con impuestos complejos

**Ejemplo**: Salón de belleza integral, spa con varios servicios.

### 📌 Centros de Bienestar Grandes
- 10+ empleados
- 500+ clientes
- Múltiples sucursales (planeado)
- Reportes avanzados

**Ejemplo**: Cadena de spas, centro de estética profesional.

### 📌 Casos de Uso Especiales

- **Servicios por cita**: Múltiples tratamientos en una sola cita
- **Especialistas asignados**: Clientes solicitando especialista específico
- **Walk-ins**: Clientes sin cita previa
- **Créditos**: Clientes con saldo a favor (prepagos, regalos)
- **Descuentos**: Aplicables por cita

---

## Planes de Suscripción

### 🆓 PLAN GRATIS (Trial)

- Duración: 14 días
- Acceso completo a todas las funciones
- Hasta 2 empleados
- Sin tarjeta de crédito requerida

**Ideal para**: Prueba sin riesgo

---

### 💼 PLAN BÁSICO

- Costo: $9.99 USD / mes
- Usuarios: hasta 2
- Clientes: ilimitados
- Citas: ilimitadas
- Funciones: agenda, clientes, servicios, facturas básicas
- Soporte: email

**Ideal para**: Pequeños salones, autónomos

---

### 🌟 PLAN PROFESIONAL

- Costo: $24.99 USD / mes
- Usuarios: hasta 5
- Todas las funciones del Plan Básico
- Equipo con invitaciones por código
- Reportes avanzados
- Facturación con impuestos personalizados
- 2FA (autenticación de dos factores)
- Soporte: email prioritario

**Ideal para**: Salones medianos, equipos de trabajo

---

### 🚀 PLAN EMPRESARIAL

- Costo: $99.99 USD / mes
- Usuarios: ilimitados
- Todas las funciones disponibles
- Sucursales múltiples (planeado)
- API de integración (planeado)
- Análisis y reportes avanzados
- Soporte: chat en vivo + email
- SLA garantizado

**Ideal para**: Cadenas de salones, grandes centros de bienestar

---

## Información Técnica

### Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Frontend | Vite + TypeScript + Svelte 5 |
| Backend / Base de Datos | Supabase (PostgreSQL 17) |
| Autenticación | Supabase Auth (email/contraseña) |
| Storage | Supabase Storage (logos, fondos) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |
| Testing | Vitest (unit), Playwright (E2E) |
| PDF | jsPDF |

### Arquitectura

```
┌─────────────────────────────────────────────┐
│         GitHub Pages (Static Hosting)       │
├─────────────────────────────────────────────┤
│    Svelte SPA (Single Page Application)     │
│    - Components reactivos                   │
│    - TypeScript para seguridad de tipos     │
│    - i18n para 6 idiomas                    │
├─────────────────────────────────────────────┤
│         Supabase (Backend)                  │
│    - PostgreSQL 17                          │
│    - Row Level Security (RLS)               │
│    - Autenticación integrada                │
│    - Copias de seguridad cifradas           │
└─────────────────────────────────────────────┘
```

### Características de Seguridad

- ✅ **Autenticación**: Basada en email/contraseña con Supabase Auth
- ✅ **Autorización**: Políticas RLS (Row Level Security) en PostgreSQL
- ✅ **Encriptación**: HTTPS en tránsito, GPG para copias de seguridad
- ✅ **Validación**: Todos los inputs validados en server-side
- ✅ **CSRF**: Protegido por defecto con Supabase
- ✅ **XSS**: Svelte escapa automáticamente
- ✅ **Roles**: Admin y Empleado con permisos a nivel de BD
- ✅ **Auditoría**: Log de todas las actividades por usuario

### Copias de Seguridad

- 🔐 Automáticas cada noche
- 🔒 Cifradas con AES-256 (GPG)
- 📦 Disponibles por 14 días en GitHub Actions
- 🔑 Requiere frase secreta para restaurar
- 📊 Incluye tablas: businesses, customers, appointments, invoices, users

### Performance

- ⚡ Carga inicial: < 2 segundos
- ⚡ Transiciones: < 500ms
- ⚡ Índices de BD optimizados
- ⚡ PWA instalable en dispositivos
- ⚡ Funciona offline (modo limitado)

---

## Seguridad y Cumplimiento

### Cumplimiento Regulatorio

- ✅ Respetuoso de privacidad de datos
- ✅ Almacenamiento en servidores de confianza
- ✅ Facturas con formato profesional
- ✅ Registros de auditoría para compliance
- ✅ Soporte para múltiples monedas e impuestos

### Protección de Datos

- ✅ SSL/TLS en tránsito
- ✅ Cifrado en almacenamiento (backups)
- ✅ Autenticación obligatoria
- ✅ Sesiones con timeout automático
- ✅ Imposible acceso entre negocios (aislamiento de datos)

### Disponibilidad

- ✅ 99.9% uptime (SLA de Supabase)
- ✅ Redundancia geográfica
- ✅ Copias de seguridad automáticas
- ✅ Recuperación de desastres en < 1 hora

---

## Cómo Empezar

### 1. Registro

Visita la plataforma y regístrate con:
- Email válido
- Contraseña segura (8+ caracteres)

### 2. Configuración Inicial

1. **Datos del negocio**: Nombre, ubicación, moneda
2. **Logo**: Carga el logo de tu salón
3. **Impuestos**: Configura la tasa de IVA/impuestos
4. **Servicios**: Crea tu catálogo de servicios

### 3. Añade tu Primer Cliente y Cita

1. Registra un cliente
2. Crea una cita
3. Completa la cita
4. Se generará automáticamente una factura

### 4. Invita a tu Equipo

1. Ve a Configuración → Equipo
2. Genera un código de invitación
3. Comparte el código con tus empleados
4. Ellos se registran usando el código

---

## Preguntas Frecuentes

### ¿Es gratis?

Sí, hay un plan gratis por 14 días con todas las funciones. Luego puedes elegir un plan de pago o seguir con funcionalidad limitada.

### ¿Qué pasa con mis datos si cancelo?

Tus datos se conservan por 90 días. Puedes reactivar tu cuenta en cualquier momento.

### ¿Funciona sin internet?

La aplicación es principalmente online, pero puedes usar modo offline limitado en dispositivos. Los cambios se sincronizarán cuando vuelva la conexión.

### ¿Puedo cambiar de plan después?

Sí, en cualquier momento. El cambio es inmediato.

### ¿Hay soporte en español?

Sí, todos nuestros planes incluyen soporte en español vía email.

### ¿Cuántos empleados puedo añadir?

Depende del plan. Básico: 2, Profesional: 5, Empresarial: ilimitados.

### ¿Puedo ver reportes?

Sí, el dashboard muestra ingresos, tendencias y cuentas por cobrar. Los planes Profesional y Empresarial tienen reportes más avanzados.

---

## Soporte

- 📧 Email: support@gestoremp... (configurar)
- 💬 Chat: Disponible en Plan Empresarial
- 📖 Documentación: En la plataforma
- 🎥 Tutoriales: Próximamente

---

**Última actualización**: October 2026

**Versión del documento**: 1.0

---

*Gestor Empresarial — Gestión profesional para tu salón de belleza*
