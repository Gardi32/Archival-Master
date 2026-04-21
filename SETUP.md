# ArchivalMaster — Guía de Setup

## Paso 1 — Crear proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta gratuita
2. Creá un nuevo proyecto (elegí la región más cercana: South America / São Paulo)
3. Anotá estas credenciales desde **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## Paso 2 — Variables de entorno

Editá el archivo `.env.local` en la raíz del proyecto y reemplazá los valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

## Paso 3 — Crear la base de datos

1. En Supabase, abrí **SQL Editor**
2. Copiá todo el contenido de `supabase-schema.sql`
3. Pegalo en el editor y ejecutá (Run)
4. Verificá que las tablas aparezcan en **Table Editor**

## Paso 4 — Crear Storage Buckets

En Supabase, andá a **Storage** y creá dos buckets:

| Nombre | Público |
|--------|---------|
| `frames` | ✅ Sí (para thumbnails de materiales) |
| `documents` | ❌ No (para contratos/facturas) |

Luego, en cada bucket, configurá las **Policies** para permitir acceso autenticado:
- Para `frames` (público): permitir `SELECT` para todos, `INSERT/DELETE` para usuarios autenticados
- Para `documents` (privado): `SELECT/INSERT/DELETE` solo para usuarios autenticados

## Paso 5 — Instalar dependencias y correr localmente

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

## Paso 6 — Crear tu primera cuenta

1. Andá a `/auth/login`
2. Hacé click en "¿No tenés cuenta? Registrate"
3. Ingresá tu email y contraseña
4. Confirmá el email (o en Supabase → Authentication → Users, podés confirmar manualmente)
5. ¡Listo para crear tu primer proyecto!

---

## Deploy en Vercel (opcional)

```bash
npm install -g vercel
vercel
```

Seguí los pasos e ingresá las variables de entorno en el dashboard de Vercel.

---

## Estructura del proyecto

```
app/
  auth/login/          → Pantalla de login/registro
  projects/            → Lista de proyectos
  projects/[id]/
    materials/         → Registro principal de materiales (AG Grid)
    providers/         → Directorio de proveedores
    edl/               → Import y matching de EDL
    budget/            → Presupuesto calculado desde EDL
    orders/            → Pedidos formales por proveedor
    documents/         → Archivo de contratos, facturas, recibos
    settings/          → Equipo y configuración

components/
  materials/           → Grid, form y panel de detalle
  providers/           → CRUD de proveedores
  edl/                 → Parser y UI de import
  budget/              → Cálculo y pedidos
  documents/           → Gestión de archivos
  layout/              → Sidebar y header
  ui/                  → Componentes base

lib/
  supabase/            → Client, server y middleware
  edl-parser.ts        → Parser CMX3600, XML, CSV
  utils.ts             → Helpers y constantes

supabase-schema.sql    → Schema completo de la BD
```

---

## EDL — Formatos soportados

| Formato | Extensión | Generado por |
|---------|-----------|-------------|
| CMX3600 | `.edl` | Premiere Pro, Resolve, Avid |
| FCP XML | `.xml` | Final Cut Pro |
| Premiere XML | `.xml` | Adobe Premiere |
| CSV | `.csv` | Exportación manual |

La detección del formato es automática.
