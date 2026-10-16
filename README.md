# Gran Rifa Navideña — Constructora Painting 2 S.A.S.

Aplicación web para gestionar la rifa de 100 números (00–99): selección pública, reservas atómicas, integración con WhatsApp y panel administrativo protegido.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL (compatible con Supabase, vía `pg`) · Zod · Vitest.
*Por qué `pg` directo y no el cliente de Supabase:* toda la lógica sensible vive en el servidor con transacciones y bloqueos de fila; las tablas tienen RLS activado **sin políticas**, de modo que las claves públicas de Supabase no pueden leer ni escribir nada. Funciona con cualquier PostgreSQL.

## Funcionalidades
- Diseño navideño animado (nieve cayendo, luces, bolas colgantes, trineo de Santa); respeta «reducir movimiento».
- Cuadrícula 00–99 con estados Disponible / Seleccionado / Reservado / Vendido, actualizada cada 8 s desde el servidor.
- El comprador elige números y deja **nombre completo y teléfono**; recibe un código `RN-XXXXXX`. No hay WhatsApp del lado del comprador.
- Reserva atómica: bloqueo ordenado de filas + `CHECK` + índice único parcial; dos solicitudes no pueden tomar el mismo número.
- Reservas temporales con expiración configurable (`RESERVATION_TTL_MINUTES`).
- **Flujo del administrador:** la reserva aparece en `/admin` → **Confirmar** (el pago pasa a pagado y los números a vendidos) → aparece **«Escribir a este número»** por cada boleta: abre el chat de WhatsApp con el comprador con el mensaje escrito y deja la imagen de la boleta copiada para pegarla (Ctrl+V). En celulares también hay **«Compartir imagen + texto»**; además hay «Copiar mensaje» y «Descargar».
- **Boleta con número:** la boleta oficial (`public/brand/boleta.jpg`) con el número del comprador grande en la esquina superior derecha, generada en `/boleta/<código>/<número>/imagen`. Solo existe para números de reservas pagadas.
- **Eliminar canceladas:** en el panel se puede eliminar una reserva cancelada/vencida o todas a la vez («Eliminar canceladas»). Las activas y pagadas no se pueden eliminar. El historial conserva el registro.
- Panel `/admin` con usuario y contraseña: búsqueda, confirmar pago, cancelar (motivo obligatorio si ya estaba pagada), liberar vencidas, totales, ventas confirmadas e historial.
- Seguridad: sesión firmada (HMAC, cookie HttpOnly/SameSite=Strict), contraseña con scrypt, límite de intentos, verificación de origen y autorización en **cada** ruta `/api/admin/*`.

**Usuario del panel:** `admin` (o el valor de `ADMIN_USER`). La contraseña es la que generes con `npm run admin:hash` y guardes en `ADMIN_PASSWORD_HASH`.

## Puesta en marcha local
```bash
npm install
cp .env.example .env.local        # completar valores
npm run admin:hash -- "contraseña-de-12+-caracteres"   # pegar resultado en ADMIN_PASSWORD_HASH
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # pegar en SESSION_SECRET
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

## Datos de la rifa
Tomados de la boleta aprobada y editables en `src/config/raffle-data.ts`: boleta $200.000, premios 1.º y 2.º de $5.000.000 (sorteos 22 y 29 de diciembre de 2026) con las últimas dos cifras de la Lotería de la Cruz Roja.

Variables opcionales: `RAFFLE_TICKET_PRICE` (sobrescribe el precio), `RAFFLE_TERMS` (si se define, se exige aceptarlas), `RAFFLE_PAYMENT_INSTRUCTIONS`, `COMPANY_LEGAL_INFO`, `WHATSAPP_COUNTRY_CODE` (por defecto `57`, se antepone a teléfonos de 10 dígitos).
Obligatorias: `DATABASE_URL`, `DATABASE_SSL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`.

Pendiente: el logo de `public/brand/logo.png` se recortó de la boleta (baja resolución); reemplázalo por el archivo original cuando lo tengas.

## Limitaciones conocidas
- WhatsApp (`wa.me`) no permite adjuntar archivos desde un enlace. Por eso la imagen se copia al portapapeles (se pega con Ctrl+V) o se comparte desde el celular. El envío 100 % automático con imagen requiere la API de WhatsApp Business (Meta), no incluida.
- La confirmación de pago es manual (administrador); no hay pasarela de pago integrada.
- Una reserva vencida no puede confirmarse; si llega un pago tardío, el administrador debe gestionar una nueva reserva.
- Las pruebas usan PostgreSQL local; no se han ejecutado contra Neon/Supabase reales.
