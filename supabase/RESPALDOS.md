# Copias de seguridad

El workflow `.github/workflows/backup.yml` guarda cada noche una copia **cifrada**
de la base de datos (esquemas `public` y `auth`: negocios, clientes, citas,
facturas, planes y usuarios). Cada copia queda disponible 14 días en
GitHub → Actions → "Copia de seguridad nocturna" → la corrida → *Artifacts*.

No incluye los archivos subidos (logos y fondos): esos viven en Supabase Storage.

## Configurar (una sola vez)

En GitHub → Settings → Secrets and variables → Actions → *New repository secret*:

| Secret | Qué poner |
|---|---|
| `SUPABASE_DB_URL` | Supabase → **Connect** → *Session pooler* → URI, reemplazando `[YOUR-PASSWORD]` por la contraseña de la base. Usa el pooler (puerto 5432): GitHub no llega a la conexión directa. |
| `BACKUP_PASSPHRASE` | Una frase larga que solo tú conozcas. **Guárdala fuera de GitHub**: sin ella las copias no se pueden abrir. |

Después, en Actions → "Copia de seguridad nocturna" → *Run workflow* para probarla.

## Restaurar

1. Descarga el artifact (`gestor-AAAA-MM-DD.dump.gpg`) y descífralo:

   ```bash
   gpg --decrypt --output backup.dump gestor-AAAA-MM-DD.dump.gpg
   ```

2. Revisa qué contiene: `pg_restore --list backup.dump`.
3. Restaura en un proyecto de Supabase **nuevo o vacío** (nunca encima del de
   producción sin una copia previa), con PostgreSQL 17:

   ```bash
   pg_restore --no-owner --no-privileges --data-only --dbname "URI_DEL_PROYECTO_DESTINO" backup.dump
   ```

   Antes de `--data-only`, crea las tablas con `supabase/schema.sql` en el
   proyecto destino. Si algo no cuadra, pide ayuda antes de tocar producción.
