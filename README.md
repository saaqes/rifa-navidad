# Gran Rifa Navideña — Constructora Painting 2 S.A.S.

Aplicación web para gestionar la rifa de 100 números (00–99): selección pública, reservas atómicas, integración con WhatsApp y panel administrativo protegido.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL (compatible con Supabase, vía `pg`) · Zod · Vitest.
*Por qué `pg` directo y no el cliente de Supabase:* toda la lógica sensible vive en el servidor con transacciones y bloqueos de fila; las tablas tienen RLS activado **sin políticas**, de modo que las claves públicas de Supabase no pueden leer ni escribir nada. Funciona con cualquier PostgreSQL.

## Funcionalidades
- Cuadrícula 00–99 con estados Disponible / Seleccionado / Reservado / Vendido, actualizada cada 8 s desde el servidor.
- Resumen de selección (cantidad y total), formulario validado (cliente y servidor), pantalla de revisión y confirmación con código `RN-XXXXXX`.
- Reserva atómica: bloqueo ordenado de filas + `CHECK` + índice único parcial; dos solicitudes no pueden tomar el mismo número.
- Reservas temporales con expiración configurable (`RESERVATION_TTL_MINUTES`); la liberación la hace el servidor revalidando el estado en transacción.
- Un número solo pasa a **vendido** cuando el administrador confirma el pago.
- Mensaje de WhatsApp dinámico (`wa.me`) con los datos reales de la reserva.
- Panel `/admin`: números, reservas (búsqueda por código/nombre/teléfono), confirmar pago, cancelar, liberar vencidas, totales, ventas confirmadas e historial de auditoría.
- Admin con sesión firmada (HMAC, cookie HttpOnly/SameSite=Strict), contraseña con scrypt, límite de intentos, verificación de origen y autorización en **cada** ruta `/api/admin/*`.

## Puesta en marcha local
```bash
npm install
cp .env.example .env.local        # completar valores
npm run admin:hash -- "contraseña-de-12+-caracteres"   # pegar resultado en ADMIN_PASSWORD_HASH
openssl rand -hex 32               # pegar en SESSION_SECRET
npm run db:migrate                 # aplica db/schema.sql (idempotente) a DATABASE_URL
npm run dev                        # http://localhost:3000
```
Next.js carga `.env.local`; para `npm run db:migrate` exporta antes las variables (`set -a; . ./.env.local; set +a`).

### Base de datos (Supabase)
1. Crea un proyecto en Supabase → *Settings → Database → Connection string* (usa el *pooler* en modo *session* o la conexión directa).
2. Ponla en `DATABASE_URL` con `DATABASE_SSL=true`.
3. Ejecuta `npm run db:migrate` (o pega `db/schema.sql` en el SQL Editor).

## Pruebas
```bash
createdb rifa_test      # base desechable
TEST_DATABASE_URL=postgresql://usuario@localhost:5432/rifa_test npm test
npm run typecheck && npm run build
```
Cubren: 100 números en formato de dos dígitos, reservas simultáneas (25 solicitudes por los mismos números → 1 éxito), bloqueos cruzados sin interbloqueo, índice único, transiciones de estado, vencimiento, cancelación/reembolso, auditoría, validación, mensaje de WhatsApp y sesiones/contraseñas.

## Despliegue (Vercel u otro host Node)
1. Importa el repositorio y define **todas** las variables de `.env.example` en el panel del host (nunca en el repositorio).
2. Ejecuta `npm run db:migrate` una vez contra la base de producción.
3. `npm run build && npm start` (o despliegue automático de Vercel).
> El limitador de intentos es en memoria por instancia; para tráfico alto, añade un límite en el borde (WAF/Vercel Firewall).

## Datos pendientes antes de publicar
Todo lo siguiente se configura por variables de entorno; si falta, la página muestra «PENDIENTE DE DEFINIR» y **no inventa nada**:
- `RAFFLE_TICKET_PRICE` (sin precio, las reservas están deshabilitadas) · `RAFFLE_PRIZES` · `RAFFLE_DRAW_DATE` · `RAFFLE_TERMS` · `RAFFLE_PAYMENT_INSTRUCTIONS` · `COMPANY_LEGAL_INFO` · `WHATSAPP_NUMBER`.
- **Logo oficial:** copiar a `public/brand/logo.png` (mientras tanto se muestra el nombre en texto).
- **Boleta de referencia:** no estaba disponible en el entorno; el diseño es navideño genérico y debe ajustarse a la imagen oficial cuando se adjunte.
- Credenciales de admin (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`).

## Limitaciones conocidas
- No se ha probado contra Supabase real (no hay credenciales); las pruebas usan PostgreSQL 16 local.
- La confirmación de pago es manual (administrador); no hay pasarela de pago integrada.
- Una reserva vencida no puede confirmarse; si llega un pago tardío, el administrador debe crear/gestionar una nueva reserva.
