<script lang="ts">
  import { teamWhatsappHref } from '../../utils/whatsapp';
  import { LEGAL_VERSION, legalHref, type LegalDoc } from '../../utils/legal';

  interface Props {
    doc: LegalDoc;
  }

  const { doc }: Props = $props();

  const TITLES: Record<LegalDoc, string> = {
    terminos: 'Términos y condiciones',
    privacidad: 'Política de privacidad',
    cookies: 'Política de cookies y almacenamiento',
    reembolsos: 'Política de reembolsos',
  };

  const whatsappHref = teamWhatsappHref('Hola, tengo una consulta sobre Gestor Empresarial.');
  const updated = new Date(`${LEGAL_VERSION}T12:00:00`).toLocaleDateString('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  function goBack(event: MouseEvent) {
    event.preventDefault();
    if (window.history.length > 1) window.history.back();
    else window.location.hash = '';
  }
</script>

<main class="legal-page">
  <article class="legal-card" aria-labelledby="legal-title">
    <a href="#/" class="back" onclick={goBack}>← Volver</a>
    <h1 id="legal-title">{TITLES[doc]}</h1>
    <p class="updated">Última actualización: {updated}</p>

    {#if doc === 'terminos'}
      <h2>1. Quiénes somos</h2>
      <p>
        <strong>Gestor Empresarial</strong> es un servicio web para administrar la agenda, los clientes, los servicios y la
        facturación de salones, peluquerías, spas y pequeños negocios, operado desde República Dominicana. Contacto:
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp +1 829-978-8249</a>.
      </p>

      <h2>2. Aceptación</h2>
      <p>
        Al crear una cuenta o usar el servicio aceptas estos términos y la
        <a href={legalHref('privacidad')}>Política de privacidad</a>. Si no estás de acuerdo, no uses el servicio.
      </p>

      <h2>3. Tu cuenta</h2>
      <p>
        Eres responsable de mantener la confidencialidad de tu correo y contraseña y de toda la actividad realizada con tu
        cuenta o por los empleados que invites. Avísanos de inmediato si sospechas un uso no autorizado.
      </p>

      <h2>4. Planes, prueba gratis y pagos</h2>
      <p>
        Los planes, precios y límites vigentes (incluido el número máximo de clientes de cada plan) se publican en la
        página principal. Al registrarte tienes un período de prueba gratis: 7 días, o 10 días si eliges la prueba del
        plan Mensual (los días ya usados se descuentan). Los planes de 6 Meses y Anual se contratan directamente, sin
        prueba. El pago y los cambios de plan se coordinan directamente con nuestro equipo; no se realizan cobros
        automáticos desde la app. Las devoluciones se rigen por la
        <a href={legalHref('reembolsos')}>Política de reembolsos</a>. Si un plan vence o no se paga, el acceso puede
        quedar suspendido hasta regularizarlo; tus datos no se borran por ese motivo.
      </p>

      <h2>5. Uso aceptable</h2>
      <p>
        No puedes usar el servicio para actividades ilegales, para cargar datos de personas sin una base legal para
        hacerlo, para intentar acceder a datos de otros negocios, ni para afectar el funcionamiento del sistema.
        Podemos suspender cuentas que incumplan estas reglas.
      </p>

      <h2>6. Los datos de tus clientes</h2>
      <p>
        Los datos de clientes, citas y facturas que cargas pertenecen a tu negocio. Tu negocio es el responsable de esos
        datos frente a sus clientes (por ejemplo, de informarles y de tener su consentimiento cuando corresponda);
        Gestor Empresarial solo los almacena y procesa para prestarte el servicio, según la
        <a href={legalHref('privacidad')}>Política de privacidad</a>.
      </p>

      <h2>7. Uso de inteligencia artificial</h2>
      <p>
        Esta aplicación fue desarrollada con asistencia de herramientas de inteligencia artificial, bajo revisión humana.
        Funciones futuras, como el asistente virtual anunciado para el plan Anual, podrán usar inteligencia artificial
        para generar respuestas o sugerencias: esas respuestas pueden contener errores y deben verificarse antes de
        tomar decisiones con ellas. Te avisaremos dentro de la app cuando una función use inteligencia artificial.
      </p>

      <h2>8. Disponibilidad y responsabilidad</h2>
      <p>
        El servicio se ofrece "tal cual" y "según disponibilidad". Trabajamos para que funcione de forma continua y
        segura, pero no garantizamos que esté libre de interrupciones o errores. En la medida que lo permita la ley, la
        responsabilidad total de Gestor Empresarial se limita al monto pagado por el servicio en los últimos 3 meses, y
        no respondemos por lucro cesante ni daños indirectos. Te recomendamos revisar tus facturas antes de enviarlas.
      </p>

      <h2>9. Propiedad intelectual</h2>
      <p>
        El nombre, logo, diseño y código de Gestor Empresarial son de su titular. Los logos, fondos y contenidos que
        subes siguen siendo tuyos, y declaras tener derecho a usarlos.
      </p>

      <h2>10. Cambios y ley aplicable</h2>
      <p>
        Podemos actualizar estos términos; la fecha de arriba indica la versión vigente y avisaremos de cambios
        importantes dentro de la app. Estos términos se rigen por las leyes de la República Dominicana.
      </p>
    {:else if doc === 'privacidad'}
      <p>
        En <strong>Gestor Empresarial</strong> (República Dominicana) tratamos los datos personales conforme a la Ley
        172-13 sobre protección de datos de carácter personal. Contacto para cualquier consulta o solicitud:
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp +1 829-978-8249</a>.
      </p>

      <h2>1. Qué datos recogemos</h2>
      <ul>
        <li><strong>Tu cuenta:</strong> correo electrónico y contraseña (la contraseña se guarda cifrada; nosotros no podemos verla).</li>
        <li><strong>Tu negocio:</strong> nombre, tipo, moneda, datos fiscales y de contacto que decidas cargar, logo y fondo.</li>
        <li><strong>Datos que cargas de tus clientes:</strong> nombre y, de forma opcional, teléfono, dirección y correo; sus citas, facturas y saldos.</li>
        <li><strong>Tu equipo:</strong> nombre y cargo de los empleados que invites.</li>
        <li><strong>Registro de actividad:</strong> qué acciones se hicieron en la cuenta y cuándo, para seguridad.</li>
      </ul>
      <p>Solo pedimos los datos necesarios para prestar el servicio. Los campos marcados como opcionales pueden dejarse vacíos.</p>

      <h2>2. Para qué los usamos</h2>
      <p>
        Para crear y proteger tu cuenta, mostrarte tu información, generar tus facturas, gestionar tu plan y atender tus
        consultas. <strong>No vendemos datos, no mostramos publicidad y no usamos herramientas de analítica ni de
        rastreo.</strong>
      </p>

      <h2>3. Con quién los compartimos</h2>
      <p>Solo con los proveedores necesarios para que la app funcione:</p>
      <ul>
        <li><strong>Supabase</strong>: base de datos, autenticación y almacenamiento de archivos (servidores en Estados Unidos, región us-west-2).</li>
        <li>
          <strong>GitHub Pages</strong> y <strong>Vercel</strong>: alojan la página web (solo entregan los archivos de la
          app; no ponen cookies ni analítica).
        </li>
        <li><strong>Google</strong>: solo si eliges "Entrar con Google" (recibe tu solicitud de inicio de sesión).</li>
        <li><strong>WhatsApp</strong>: solo si tocas un botón de WhatsApp para escribirnos.</li>
        <li>
          <strong>Telegram</strong>: nuestro equipo recibe ahí un aviso cuando se registra un negocio nuevo (nombre del
          negocio, correo, tipo y período de prueba) y administra los planes desde un bot privado.
        </li>
      </ul>
      <p>También podremos revelar datos si una autoridad competente lo exige conforme a la ley.</p>

      <h2>4. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tu cuenta esté activa. Si tu plan vence, conservamos los datos para que puedas reactivarla. Puedes
        pedir que borremos tu cuenta y todos sus datos en cualquier momento.
      </p>

      <h2>5. Tus derechos</h2>
      <p>
        Puedes pedir acceso, rectificación, actualización o eliminación de tus datos, u oponerte a su tratamiento,
        escribiéndonos por WhatsApp. Si eres cliente de un negocio que usa Gestor Empresarial, dirige tu solicitud a ese
        negocio: nosotros lo ayudaremos a responderte.
      </p>

      <h2>6. Seguridad</h2>
      <p>
        Toda la comunicación viaja cifrada (HTTPS) y cada negocio solo puede ver sus propios datos gracias a reglas de
        acceso en la base de datos. Ningún sistema es 100% infalible, pero aplicamos medidas razonables para proteger
        tu información.
      </p>

      <h2>7. Menores de edad</h2>
      <p>El servicio está dirigido a negocios y no a menores de 18 años.</p>

      <h2>8. Cookies</h2>
      <p>Consulta la <a href={legalHref('cookies')}>Política de cookies y almacenamiento</a>.</p>
    {:else if doc === 'cookies'}
      <p>
        <strong>No usamos cookies de rastreo, de publicidad ni de analítica.</strong> Solo guardamos en tu navegador la
        información estrictamente necesaria para que la app funcione, por eso no hace falta pedirte consentimiento para
        ella.
      </p>

      <h2>Qué guardamos en tu navegador</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Nombre</th><th scope="col">Para qué sirve</th><th scope="col">Duración</th></tr>
          </thead>
          <tbody>
            <tr><td><code>sb-…-auth-token</code></td><td>Mantener tu sesión iniciada de forma segura.</td><td>Hasta que cierres sesión</td></tr>
            <tr><td><code>gs_lang</code></td><td>Recordar el idioma que elegiste.</td><td>Hasta que lo borres</td></tr>
            <tr><td><code>gestorTrialPlan</code></td><td>Recordar el plan que elegiste para probar en la página principal.</td><td>Hasta terminar el registro</td></tr>
            <tr><td><code>gestorLandingSeen</code></td><td>No volver a mostrarte la página de presentación.</td><td>Hasta que lo borres</td></tr>
            <tr><td><code>sessionBannerLastShown</code></td><td>Mostrar el aviso de bienvenida una sola vez al día.</td><td>Hasta que lo borres</td></tr>
            <tr><td><code>gestorStorageNoticeSeen</code></td><td>Recordar que ya viste este aviso.</td><td>Hasta que lo borres</td></tr>
            <tr><td><code>ge_last_active</code></td><td>Saber si la pestaña estuvo inactiva para actualizar tus datos.</td><td>Hasta cerrar la pestaña</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Recursos propios</h2>
      <p>Las fuentes tipográficas y los íconos se sirven desde nuestro propio sitio, sin conectarse a servicios de terceros.</p>

      <h2>Cómo borrarlo</h2>
      <p>
        Puedes borrar estos datos cuando quieras desde la configuración de tu navegador ("Borrar datos de navegación" o
        "Datos de sitios"). Si lo haces, tendrás que volver a iniciar sesión.
      </p>
    {:else}
      <h2>1. Prueba gratis antes de pagar</h2>
      <p>
        Al registrarte tienes un período de prueba gratis para evaluar el servicio antes de pagar: 7 días, o 10 días si
        eliges la prueba del plan Mensual (los días ya usados se descuentan). Los planes de 6 Meses y Anual se contratan
        directamente, sin prueba. No pedimos tarjeta para empezar.
      </p>

      <h2>2. Pagos no reembolsables</h2>
      <p>
        Una vez pagado un período (mensual, semestral o anual), el importe <strong>no se reembolsa</strong>, ni total ni
        parcialmente, salvo que la ley aplicable disponga otra cosa o que no hayamos podido prestar el servicio por una
        falla nuestra.
      </p>

      <h2>3. Cancelar cuando quieras</h2>
      <p>
        Puedes cancelar en cualquier momento para que tu plan no se renueve. Mantendrás el acceso hasta el final del
        período ya pagado.
      </p>

      <h2>4. Tus datos se conservan</h2>
      <p>
        Si tu plan vence o lo cancelas, tus citas, clientes, facturas y servicios quedan guardados para que puedas
        reactivar tu cuenta. Si prefieres que los borremos, pídenoslo.
      </p>

      <h2>5. Contacto</h2>
      <p>
        Para cancelar, cambiar de plan o hacer cualquier consulta sobre pagos, escríbenos por
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp +1 829-978-8249</a>.
      </p>
    {/if}

    <nav class="legal-nav" aria-label="Documentos legales">
      {#each Object.entries(TITLES) as [key, title] (key)}
        {#if key !== doc}
          <a href={legalHref(key as LegalDoc)}>{title}</a>
        {/if}
      {/each}
    </nav>
  </article>
</main>

<style>
  .legal-page {
    min-height: 100vh;
    padding: 32px 16px 64px;
    background: #f7eef1;
    color: #3a1a2a;
    font-family: var(--font-inter, 'Inter', system-ui, sans-serif);
  }

  .legal-card {
    max-width: 72ch;
    margin: 0 auto;
    padding: 32px clamp(20px, 5vw, 48px);
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(59, 15, 39, 0.1);
    line-height: 1.65;
    font-size: 0.97rem;
  }

  h1 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: clamp(1.9rem, 5vw, 2.4rem);
    color: #6e1f45;
    margin: 12px 0 4px;
    line-height: 1.15;
  }

  h2 {
    font-size: 1.05rem;
    color: #6e1f45;
    margin: 1.6em 0 0.4em;
  }

  .updated {
    color: #6b4a5b;
    font-size: 0.85rem;
    margin: 0 0 1.5em;
  }

  a {
    color: #8a2f55;
  }

  a:focus-visible {
    outline: 2px solid #8a2f55;
    outline-offset: 2px;
  }

  .back {
    font-weight: 600;
    text-decoration: none;
  }

  ul {
    padding-left: 1.2em;
  }

  li {
    margin-bottom: 0.35em;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }

  th,
  td {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid #ecdde4;
    vertical-align: top;
  }

  th {
    color: #6e1f45;
  }

  code {
    font-size: 0.85em;
    background: #f7eef1;
    padding: 1px 4px;
    border-radius: 4px;
  }

  @media (max-width: 560px) {
    th,
    td {
      padding: 6px 4px;
    }

    td code {
      word-break: break-all;
    }
  }

  .legal-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    margin-top: 2.5em;
    padding-top: 1.2em;
    border-top: 1px solid #ecdde4;
    font-size: 0.88rem;
  }
</style>
