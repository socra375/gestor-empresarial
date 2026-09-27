<script lang="ts">
  import LegalFooter from '../legal/LegalFooter.svelte';
  import { legalHref } from '../../utils/legal';

  interface Props {
    onEnter: () => void;
  }

  const { onEnter }: Props = $props();

  // Mismo número de WhatsApp que "Cambiar de Plan" en Configuración
  // (PlanTab.svelte) -- acá es la consulta previa al registro, allá el
  // cambio de plan de una cuenta ya existente; misma vía en los dos casos,
  // porque el plan se coordina con el equipo, no hay cobro automatizado.
  const plansWhatsappHref = `https://wa.me/18299788249?text=${encodeURIComponent(
    'Hola, quiero información sobre los planes de Gestor Empresarial.'
  )}`;
</script>

<div class="landing-page">
  <header class="hero">
    <div class="caps" aria-hidden="true">
      <i class="cap c1"></i><i class="cap c2"></i><i class="cap c3"></i><i class="cap c4"></i>
      <i class="cap c5"></i><i class="cap c6"></i><i class="cap c7"></i>
    </div>
    <div class="wrap">
      <nav aria-label="Principal">
        <span class="logo"><img src="{import.meta.env.BASE_URL}logo-256.png" alt="" />Gestor Empresarial</span>
        <div class="nav-links">
          <a href="#funciones">Funciones</a>
          <a href="#demo">Demo</a>
          <a href="#planes">Planes</a>
          <button type="button" class="acceso" onclick={onEnter}>Acceder</button>
        </div>
      </nav>

      <div class="hero-copy">
        <h1><span>Organiza tu salón.</span><span>Controla tus citas.</span><span>Conoce tu negocio.</span></h1>
        <p>Agenda, clientes, pagos y estadísticas de tu salón, peluquería o spa en un solo lugar.</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" onclick={onEnter}>Probar gratis</button>
          <a class="btn btn-ghost" href="#demo">Ver cómo funciona</a>
        </div>
      </div>
    </div>
  </header>

  <main>
    <section class="features" id="funciones">
      <div class="wrap">
        <h2>Todo lo que necesitas para administrar tu salón</h2>
        <div class="list">
          <div class="item"><div class="ico" aria-hidden="true">💇</div><h3>Servicios</h3><p>Tu catálogo con precio y duración.</p></div>
          <div class="item"><div class="ico" aria-hidden="true">📅</div><h3>Agenda</h3><p>Citas por día y por persona.</p></div>
          <div class="item"><div class="ico" aria-hidden="true">👥</div><h3>Clientes</h3><p>Contacto e historial de cada visita.</p></div>
          <div class="item"><div class="ico" aria-hidden="true">💳</div><h3>Pagos</h3><p>Cobros y saldos pendientes al día.</p></div>
          <div class="item"><div class="ico" aria-hidden="true">🧾</div><h3>Facturas</h3><p>Comprobantes listos para enviar.</p></div>
          <div class="item"><div class="ico" aria-hidden="true">👨‍💼</div><h3>Equipo</h3><p>Horarios y trabajo de cada persona.</p></div>
          <div class="item"><div class="ico" aria-hidden="true">📊</div><h3>Estadísticas</h3><p>Ingresos, citas y servicios más pedidos.</p></div>
        </div>
      </div>
    </section>

    <section class="demo" id="demo">
      <div class="wrap">
        <div class="demo-head">
          <h2>Mira lo que puedes hacer</h2>
          <p>Así se ve tu día en el gestor: quién viene, cuánto has cobrado y qué falta por confirmar.</p>
        </div>

        <div
          class="win"
          role="img"
          aria-label="Demostración del panel: 12 citas hoy, 8,450 dólares de ingresos y 1,200 pendientes, con tres próximas citas."
        >
          <div class="win-bar">
            <div class="dots" aria-hidden="true"><b></b><b></b><b></b></div>
            <span class="badge-demo">Demostración · datos ficticios</span>
          </div>
          <div class="app" aria-hidden="true">
            <aside class="side">
              <div class="brand"><img src="{import.meta.env.BASE_URL}logo-256.png" alt="" />Gestor</div>
              <span class="side-link on">📊 Inicio</span>
              <span class="side-link">📅 Agenda</span>
              <span class="side-link">👥 Clientes</span>
              <span class="side-link">💇 Servicios</span>
              <span class="side-link">💳 Pagos</span>
              <span class="side-link">🧾 Facturas</span>
              <span class="side-link">👨‍💼 Equipo</span>
            </aside>
            <div class="main">
              <h4>Buenos días 👋</h4>
              <div class="stats">
                <div class="stat"><small>Citas hoy</small><strong>12</strong></div>
                <div class="stat"><small>Ingresos</small><strong>$8,450</strong></div>
                <div class="stat warn"><small>Pendiente</small><strong>$1,200</strong></div>
              </div>
              <div class="cols">
                <div class="panel">
                  <h5>Próximas citas</h5>
                  <div class="cita"><time>09:00</time><div>María<span>Corte</span></div><em class="tag ok">Confirmada</em></div>
                  <div class="cita"><time>10:30</time><div>Laura<span>Color</span></div><em class="tag pend">Pendiente</em></div>
                  <div class="cita"><time>12:00</time><div>Ana<span>Manicure</span></div><em class="tag ok">Confirmada</em></div>
                </div>
                <div class="panel">
                  <h5>Ingresos de la semana</h5>
                  <div class="bars">
                    <div><i style="height:52%"></i>L</div>
                    <div><i style="height:64%"></i>M</div>
                    <div><i style="height:48%"></i>X</div>
                    <div><i style="height:78%"></i>J</div>
                    <div><i style="height:70%"></i>V</div>
                    <div class="hoy"><i style="height:96%"></i>S</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p class="demo-note">Los nombres, citas y cifras de esta demostración son inventados. Tu panel mostrará los datos de tu negocio.</p>
      </div>
    </section>

    <section class="plans" id="planes">
      <div class="wrap">
        <div class="plans-head">
          <h2>Un plan para cada etapa de tu negocio</h2>
          <p>Empieza gratis, sin tarjeta. Cambia de plan cuando quieras — lo coordinás directo con nuestro equipo.</p>
        </div>

        <div class="plan-grid">
          <div class="plan-card">
            <h3>Mensual</h3>
            <p class="plan-tag">Para arrancar tu negocio</p>
            <p class="plan-price"><span class="amount">$20</span><span class="period">/mes</span></p>
            <ul class="plan-features">
              <li>10 días de prueba gratis</li>
              <li>Hasta 10–15 clientes</li>
              <li>Agenda, clientes y servicios</li>
              <li>Facturas en PDF</li>
            </ul>
            <button type="button" class="btn btn-plan" onclick={onEnter}>Probar gratis</button>
          </div>

          <div class="plan-card featured">
            <span class="plan-badge">Recomendado</span>
            <h3>6 Meses</h3>
            <p class="plan-tag">Para negocios en crecimiento</p>
            <p class="plan-price"><span class="amount">$100</span><span class="period">/6 meses</span></p>
            <p class="plan-equiv">Equivale a $16.67/mes</p>
            <ul class="plan-features">
              <li>20 días de prueba gratis</li>
              <li>Hasta 50–90 clientes</li>
              <li>Todo lo del plan Mensual</li>
              <li>Equipo y empleados</li>
              <li>Estadísticas del negocio</li>
            </ul>
            <button type="button" class="btn btn-plan btn-plan-primary" onclick={onEnter}>Probar gratis</button>
          </div>

          <div class="plan-card">
            <span class="plan-badge plan-badge-gold">Menor precio por mes</span>
            <h3>Anual</h3>
            <p class="plan-tag">El plan completo</p>
            <p class="plan-price"><span class="amount">$200</span><span class="period">/año</span></p>
            <p class="plan-equiv">13 meses por $200 (1 mes gratis) · $15.38/mes</p>
            <ul class="plan-features">
              <li>Más de 150 clientes</li>
              <li>Todo lo del plan 6 Meses</li>
              <li>Asistente virtual <span class="soon">(próximamente)</span></li>
            </ul>
            <button type="button" class="btn btn-plan" onclick={onEnter}>Probar gratis</button>
          </div>
        </div>

        <p class="plans-note">
          Precios en dólares estadounidenses. Pagos no reembolsables: probá gratis antes de pagar y cancelá cuando
          quieras (ver <a href={legalHref('reembolsos')}>Política de reembolsos</a>). ¿Ya tenés cuenta y querés cambiar
          de plan? <a href={plansWhatsappHref} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a>.
        </p>
      </div>
    </section>

    <section class="closing">
      <div class="wrap">
        <h2>Empieza a ordenar tu negocio hoy</h2>
        <div class="actions">
          <button type="button" class="btn btn-primary" onclick={onEnter}>Probar gratis</button>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="wrap">
      Gestor Empresarial · <button type="button" class="link-inline" onclick={onEnter}>Acceder a mi cuenta</button>
      <div class="landing-legal"><LegalFooter /></div>
    </div>
  </footer>
</div>

<style>
  /* Landing de marca (burdeos/oro), mismos tokens que AuthScreen.svelte --
     página completa propia (position: fixed, con su propio scroll), para
     no heredar el fondo oscuro ni el padding-bottom reservado a la barra
     de navegación de la app (ninguno de los dos existe en este estado). */
  .landing-page {
    --noche: #2e0a1e;
    --burdeos: #4a1230;
    --ciruela: #6e1f45;
    --rosa: #e98f8f;
    --melocoton: #f6b79a;
    --oro: #d9b270;
    --tinta: #3a1a2a;
    --suave: #7d5a6c;
    --campo: #f7eef1;
    --linea: #ebdce3;
    --papel: #ffffff;
    --fondo: #fcf8f9;
    --ok: #2f7a5b;
    --ok-bg: #e4f3ec;
    --pend: #a9651c;
    --pend-bg: #fbebd3;
    --serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    --jost: 'Jost', 'Segoe UI', system-ui, sans-serif;

    position: fixed;
    inset: 0;
    overflow-y: auto;
    scroll-behavior: smooth;
    font-family: var(--jost);
    color: var(--tinta);
    background: var(--fondo);
    line-height: 1.5;
  }

  .landing-page * {
    box-sizing: border-box;
  }

  .wrap {
    width: min(1120px, 100% - 48px);
    margin-inline: auto;
  }

  /* ---------- Hero ---------- */
  .hero {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    color: #fff;
    background: linear-gradient(140deg, #3a0e26 0%, #7a2549 52%, #e9827f 115%);
    padding-bottom: 150px;
  }

  .hero::before {
    content: '';
    position: absolute;
    z-index: -2;
    width: 520px;
    height: 520px;
    border-radius: 50%;
    top: -120px;
    right: -60px;
    background: radial-gradient(circle, rgba(246, 183, 154, 0.45), rgba(246, 183, 154, 0) 68%);
  }

  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 26px 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--serif);
    font-weight: 600;
    font-size: 1.5rem;
  }

  .logo img {
    display: block;
    width: 38px;
    height: 38px;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 28px;
    font-size: 0.95rem;
  }

  .nav-links a {
    text-decoration: none;
    color: rgba(255, 255, 255, 0.85);
  }

  .nav-links a:hover {
    color: #fff;
  }

  .nav-links .acceso {
    padding: 8px 20px;
    border-radius: 999px;
    border: 1.5px solid rgba(255, 255, 255, 0.4);
    color: #fff;
    background: transparent;
    font: inherit;
    cursor: pointer;
  }

  .nav-links .acceso:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .hero-copy {
    padding-top: 84px;
    max-width: 700px;
  }

  .hero-copy h1 {
    font-family: var(--serif);
    font-weight: 600;
    font-size: clamp(2.8rem, 6.4vw, 5rem);
    line-height: 0.98;
    letter-spacing: -0.015em;
    margin: 0;
  }

  .hero-copy h1 span {
    display: block;
  }

  .hero-copy p {
    margin-top: 26px;
    max-width: 46ch;
    font-size: 1.15rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 38px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 52px;
    padding: 0 30px;
    border-radius: 999px;
    font: inherit;
    font-weight: 600;
    font-size: 1rem;
    text-decoration: none;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  }

  .btn:hover {
    transform: translateY(-1px);
  }

  .btn-primary {
    background: #fff;
    color: var(--ciruela);
    border: 0;
    box-shadow: 0 12px 26px rgba(30, 0, 16, 0.3);
  }

  .btn-ghost {
    color: #fff;
    border: 1.5px solid rgba(255, 255, 255, 0.55);
    background: transparent;
  }

  .btn-ghost:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .caps {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
  }

  .cap {
    position: absolute;
    border-radius: 999px;
    transform: translate(-50%, -50%) rotate(-55deg);
  }

  .c1 { width: 92px; height: 300px; left: 62%; top: 96%; background: linear-gradient(180deg, #f6b79a, #e4737f); }
  .c2 { width: 70px; height: 230px; left: 74%; top: 104%; background: linear-gradient(180deg, #d9b270, #f19a87); }
  .c3 { width: 112px; height: 340px; left: 86%; top: 88%; background: linear-gradient(180deg, #f9c4a2, #e9787e); }
  .c4 { width: 54px; height: 200px; left: 97%; top: 98%; background: linear-gradient(180deg, #ffd9b8, #f09a8a); opacity: 0.92; }
  .c5 { width: 11px; height: 120px; left: 66%; top: 70%; background: rgba(217, 178, 112, 0.95); }
  .c6 { width: 10px; height: 96px; left: 84%; top: 60%; background: rgba(255, 255, 255, 0.4); }
  .c7 { width: 10px; height: 84px; left: 93%; top: 74%; background: rgba(217, 178, 112, 0.85); }

  /* ---------- Funciones ---------- */
  .features {
    padding: 96px 0 40px;
  }

  h2 {
    font-family: var(--serif);
    font-weight: 600;
    color: var(--ciruela);
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.05;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .features h2 {
    max-width: 18ch;
  }

  .list {
    margin-top: 48px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-top: 1px solid var(--linea);
  }

  .list::after {
    content: '';
    border-bottom: 1px solid var(--linea);
  }

  .item {
    padding: 28px 24px 30px 0;
    border-bottom: 1px solid var(--linea);
  }

  .item .ico {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: var(--campo);
    display: grid;
    place-items: center;
    font-size: 1.35rem;
  }

  .item h3 {
    margin-top: 16px;
    font-family: var(--serif);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--ciruela);
  }

  .item p {
    margin-top: 4px;
    font-size: 0.95rem;
    color: var(--suave);
    max-width: 24ch;
  }

  /* ---------- Demo ---------- */
  .demo {
    padding: 72px 0 110px;
  }

  .demo-head {
    max-width: 640px;
  }

  .demo-head p {
    margin-top: 12px;
    color: var(--suave);
    font-size: 1.05rem;
  }

  .win {
    margin-top: 44px;
    background: var(--papel);
    border-radius: 14px;
    border: 1px solid var(--linea);
    box-shadow: 0 40px 80px rgba(74, 18, 48, 0.18);
    overflow: hidden;
  }

  .win-bar {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 18px;
    background: #f3e8ed;
    border-bottom: 1px solid var(--linea);
  }

  .dots {
    display: flex;
    gap: 7px;
  }

  .dots b {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #dcc6d1;
  }

  .badge-demo {
    margin-left: auto;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--pend);
    background: var(--pend-bg);
    padding: 4px 12px;
    border-radius: 999px;
  }

  .app {
    display: grid;
    grid-template-columns: 210px 1fr;
    min-height: 470px;
  }

  .side {
    background: var(--burdeos);
    color: rgba(255, 255, 255, 0.8);
    padding: 22px 14px;
  }

  .side .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 10px 20px;
    font-family: var(--serif);
    font-weight: 600;
    font-size: 1.15rem;
    color: #fff;
  }

  .side .brand img {
    display: block;
    width: 28px;
    height: 28px;
  }

  .side-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 0.92rem;
    color: inherit;
  }

  .side-link.on {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
  }

  .main {
    padding: 28px 32px 32px;
    background: var(--fondo);
  }

  .main h4 {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 1.9rem;
    color: var(--ciruela);
    margin: 0;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 20px;
  }

  .stat {
    background: #fff;
    border: 1px solid var(--linea);
    border-radius: 12px;
    padding: 16px 18px;
  }

  .stat small {
    color: var(--suave);
    font-size: 0.85rem;
  }

  .stat strong {
    display: block;
    margin-top: 2px;
    font-family: var(--serif);
    font-size: 2.2rem;
    line-height: 1.1;
    color: var(--tinta);
    font-weight: 600;
  }

  .stat.warn strong {
    color: var(--pend);
  }

  .cols {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 16px;
    margin-top: 16px;
  }

  .panel {
    background: #fff;
    border: 1px solid var(--linea);
    border-radius: 12px;
    padding: 18px 20px;
  }

  .panel h5 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--tinta);
    margin: 0 0 8px;
  }

  .cita {
    display: grid;
    grid-template-columns: 56px 1fr auto;
    gap: 8px 12px;
    align-items: center;
    padding: 11px 0;
    border-top: 1px solid var(--linea);
    font-size: 0.95rem;
  }

  .cita:first-of-type {
    border-top: 0;
  }

  .cita time {
    font-weight: 600;
    color: var(--ciruela);
    font-variant-numeric: tabular-nums;
  }

  .cita span {
    color: var(--suave);
    font-size: 0.88rem;
    display: block;
  }

  .tag {
    font-style: normal;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 4px 11px;
    border-radius: 999px;
    white-space: nowrap;
  }

  .tag.ok {
    background: var(--ok-bg);
    color: var(--ok);
  }

  .tag.pend {
    background: var(--pend-bg);
    color: var(--pend);
  }

  .bars {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    height: 150px;
    margin-top: 14px;
  }

  .bars div {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    height: 100%;
    justify-content: flex-end;
    font-size: 0.75rem;
    color: var(--suave);
  }

  .bars i {
    width: 100%;
    border-radius: 6px 6px 2px 2px;
    background: linear-gradient(180deg, var(--rosa), var(--ciruela));
  }

  .bars .hoy i {
    background: linear-gradient(180deg, var(--oro), #c0893a);
  }

  .demo-note {
    margin-top: 16px;
    font-size: 0.88rem;
    color: var(--suave);
  }

  /* ---------- Planes ---------- */
  .plans {
    padding: 96px 0;
    background: var(--campo);
  }

  .plans-head {
    max-width: 640px;
    margin-inline: auto;
    text-align: center;
  }

  .plans-head h2 {
    max-width: none;
    margin-inline: auto;
  }

  .plans-head p {
    margin-top: 12px;
    color: var(--suave);
    font-size: 1.05rem;
  }

  .plan-grid {
    margin-top: 48px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    align-items: stretch;
  }

  .plan-card {
    position: relative;
    display: flex;
    flex-direction: column;
    background: var(--papel);
    border: 1px solid var(--linea);
    border-radius: 16px;
    padding: 32px 28px;
  }

  .plan-card.featured {
    border-color: var(--ciruela);
    box-shadow: 0 30px 60px rgba(74, 18, 48, 0.16);
    transform: translateY(-8px);
  }

  .plan-badge {
    position: absolute;
    top: -14px;
    left: 28px;
    padding: 5px 14px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(90deg, var(--burdeos), var(--ciruela));
  }

  .plan-badge-gold {
    background: linear-gradient(90deg, #c0893a, var(--oro));
    color: var(--tinta);
  }

  .plan-card h3 {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 1.6rem;
    color: var(--ciruela);
    margin: 0;
  }

  .plan-tag {
    margin: 4px 0 0;
    color: var(--suave);
    font-size: 0.9rem;
  }

  .plan-price {
    margin: 20px 0 0;
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .plan-price .amount {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 2.6rem;
    color: var(--tinta);
    line-height: 1;
  }

  .plan-price .period {
    color: var(--suave);
    font-size: 0.95rem;
  }

  .plan-equiv {
    margin: 6px 0 0;
    font-size: 0.85rem;
    color: var(--ok);
    font-weight: 500;
  }

  .plan-features {
    list-style: none;
    padding: 0;
    margin: 24px 0 28px;
    flex: 1;
  }

  .plan-features li {
    position: relative;
    padding: 8px 0 8px 26px;
    border-top: 1px solid var(--linea);
    font-size: 0.92rem;
  }

  .plan-features li:first-child {
    border-top: 0;
  }

  .plan-features li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--ok);
    font-weight: 700;
  }

  .plan-features .soon {
    color: var(--suave);
    font-size: 0.85rem;
  }

  .btn-plan {
    width: 100%;
    height: 48px;
    border-radius: 999px;
    border: 1.5px solid var(--ciruela);
    background: transparent;
    color: var(--ciruela);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-plan:hover {
    background: var(--campo);
  }

  .btn-plan-primary {
    border: 0;
    color: #fff;
    background: linear-gradient(90deg, var(--burdeos), var(--ciruela));
  }

  .btn-plan-primary:hover {
    filter: brightness(1.08);
  }

  .plans-note {
    margin-top: 36px;
    text-align: center;
    font-size: 0.88rem;
    color: var(--suave);
  }

  .plans-note a {
    color: var(--ciruela);
    font-weight: 500;
  }

  /* ---------- Cierre ---------- */
  .closing {
    text-align: center;
    color: #fff;
    padding: 84px 0;
    background: linear-gradient(140deg, #3a0e26 0%, #7a2549 60%, #c9596d 130%);
  }

  .closing h2 {
    color: #fff;
    max-width: 20ch;
    margin-inline: auto;
  }

  .closing .actions {
    justify-content: center;
  }

  .landing-legal {
    margin-top: 12px;
  }

  footer {
    padding: 26px 0;
    text-align: center;
    font-size: 0.88rem;
    color: var(--suave);
  }

  .link-inline {
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  @media (max-width: 960px) {
    .list {
      grid-template-columns: repeat(2, 1fr);
    }
    .app {
      grid-template-columns: 1fr;
    }
    .side {
      display: none;
    }
    .cols {
      grid-template-columns: 1fr;
    }
    .plan-grid {
      grid-template-columns: 1fr;
      max-width: 420px;
      margin-inline: auto;
    }
    .plan-card.featured {
      transform: none;
    }
  }

  @media (max-width: 620px) {
    .nav-links a {
      display: none;
    }
    .hero {
      padding-bottom: 210px;
    }
    .caps {
      top: 38%;
    }
    .hero-copy {
      padding-top: 56px;
    }
    .stats {
      grid-template-columns: 1fr;
    }
    .main {
      padding: 22px 18px;
    }
    .badge-demo {
      font-size: 0.72rem;
    }
    .btn {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .landing-page {
      scroll-behavior: auto;
    }
    .btn {
      transition: none;
    }
  }
</style>
