/* ════════════════════════════════════════════════════════════════
   CE.X · LIBRARY.JS — interações + motor de "copiar código"
   Vanilla, zero dependência. Usado pela galeria (index.html) e
   reutilizável no site/admin.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── COPIAR CÓDIGO (lê o markup real do demo → garante fidelidade) ── */
  function cleanHTML(node) {
    const clone = node.cloneNode(true);
    // remove handles internos da galeria
    clone.querySelectorAll('[data-strip]').forEach(n => n.remove());
    clone.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(a => {
        if (a.name.startsWith('data-cc') || a.name === 'data-dm-ref' || a.name === 'data-strip') el.removeAttribute(a.name);
      });
    });
    // re-indenta
    let html = clone.innerHTML;
    html = html.replace(/\t/g, '  ').replace(/^\s*\n/gm, '');
    const lines = html.split('\n');
    const minIndent = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length));
    return lines.map(l => l.slice(minIndent)).join('\n').trim();
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const card = btn.closest('.gx-comp');
    const demo = card && card.querySelector('.gx-demo');
    if (!demo) return;
    const code = cleanHTML(demo);
    navigator.clipboard.writeText(code).then(() => {
      const old = btn.textContent;
      btn.textContent = '✓ copiado';
      btn.classList.add('ok');
      setTimeout(() => { btn.textContent = old; btn.classList.remove('ok'); }, 1400);
    });
  });

  /* ── VER CÓDIGO (toggle do bloco <pre>) ── */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-toggle-code]');
    if (!btn) return;
    const card = btn.closest('.gx-comp');
    const pre = card && card.querySelector('.gx-code');
    if (!pre) return;
    if (!pre.dataset.filled) {
      const code = cleanHTML(card.querySelector('.gx-demo'));
      pre.querySelector('code').textContent = code;
      pre.dataset.filled = '1';
    }
    pre.classList.toggle('open');
    btn.textContent = pre.classList.contains('open') ? 'ocultar código' : 'ver código';
  });

  /* ── FAQ / ACCORDION ── */
  document.addEventListener('click', function (e) {
    const q = e.target.closest('.faq-q, .acc-head');
    if (!q) return;
    q.parentElement.classList.toggle('open');
  });

  /* ── TABS ── */
  document.addEventListener('click', function (e) {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    const wrap = tab.closest('[data-tabs]') || tab.closest('.tabs').parentElement;
    const i = [...tab.parentElement.children].indexOf(tab);
    wrap.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const panels = wrap.querySelectorAll('.tab-panel');
    panels.forEach((p, idx) => p.classList.toggle('active', idx === i));
  });

  /* ── SEGMENTED ── */
  document.addEventListener('click', function (e) {
    const b = e.target.closest('.segmented button');
    if (!b) return;
    b.parentElement.querySelectorAll('button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  });

  /* ── CHIPS (toggle) ── */
  document.addEventListener('click', function (e) {
    const chip = e.target.closest('.chip[data-toggle]');
    if (!chip) return;
    chip.classList.toggle('active');
  });

  /* ── TOGGLE / CHECK / RADIO ── */
  document.addEventListener('click', function (e) {
    const tg = e.target.closest('.toggle');
    if (tg) { tg.classList.toggle('on'); return; }
    const ck = e.target.closest('.check-row');
    if (ck) { ck.querySelector('.check-box').classList.toggle('checked'); return; }
    const rd = e.target.closest('.radio-row');
    if (rd) {
      rd.parentElement.querySelectorAll('.radio-dot').forEach(d => d.classList.remove('checked'));
      rd.querySelector('.radio-dot').classList.add('checked');
    }
  });

  /* ── DROPDOWN ── */
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('[data-dropdown]');
    document.querySelectorAll('.dropdown.open').forEach(d => {
      if (!trigger || d !== trigger.closest('.dropdown')) d.classList.remove('open');
    });
    if (trigger) trigger.closest('.dropdown').classList.toggle('open');
  });

  /* ── MODAL ── */
  document.addEventListener('click', function (e) {
    const open = e.target.closest('[data-modal-open]');
    if (open) { document.getElementById(open.getAttribute('data-modal-open'))?.classList.add('open'); return; }
    if (e.target.closest('[data-modal-close]') || e.target.classList.contains('modal-overlay')) {
      e.target.closest('.modal-overlay')?.classList.remove('open');
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); });

  /* ── BANNER / TOAST close ── */
  document.addEventListener('click', function (e) {
    const c = e.target.closest('.banner-close, .toast');
    if (c) c.closest('.banner, .toast')?.remove();
  });

  /* ── NAV DRAWER (mobile) ── */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-nav-open]')) { document.querySelector('.nav-drawer')?.classList.add('open'); }
    if (e.target.closest('[data-nav-close]') || e.target.closest('.nav-drawer-links a')) { document.querySelector('.nav-drawer')?.classList.remove('open'); }
  });

  /* ── CARROSSEL (setas + arrastar) ── */
  function initRow(track) {
    const card = () => track.querySelector(':scope > *');
    const step = () => (card() ? card().offsetWidth + 18 : 260);
    const head = track.closest('.row')?.querySelector('.row-arrows');
    if (head) {
      const [prev, next] = head.querySelectorAll('.row-arrow');
      prev?.addEventListener('click', () => track.scrollBy({ left: -step() * 2, behavior: 'smooth' }));
      next?.addEventListener('click', () => track.scrollBy({ left: step() * 2, behavior: 'smooth' }));
    }
    // drag-to-scroll
    let down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', e => { down = true; moved = false; sx = e.pageX; sl = track.scrollLeft; track.classList.add('dragging'); track.setPointerCapture(e.pointerId); });
    track.addEventListener('pointermove', e => { if (!down) return; const d = e.pageX - sx; if (Math.abs(d) > 4) moved = true; track.scrollLeft = sl - d; });
    const end = () => { down = false; track.classList.remove('dragging'); };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('click', e => { if (moved) { e.preventDefault(); } }, true);
  }
  document.querySelectorAll('.row-track:not(.is-fixed)').forEach(initRow);

  /* ── CALENDÁRIO (render do mês atual + navegação) ── */
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DOW = ['D','S','T','Q','Q','S','S'];
  function buildCal(el) {
    let view = new Date();
    const events = JSON.parse(el.getAttribute('data-events') || '{}'); // {"2026-06-20":"cat-clay"}
    function render() {
      const y = view.getFullYear(), m = view.getMonth();
      const first = new Date(y, m, 1).getDay();
      const days = new Date(y, m + 1, 0).getDate();
      const today = new Date();
      let html = `<div class="cal-head"><div class="cal-month">${MESES[m]}<span>${y}</span></div>
        <div class="cal-nav"><button data-cal-prev>‹</button><button data-cal-next>›</button></div></div>
        <div class="cal-grid">`;
      DOW.forEach(d => html += `<div class="cal-dow">${d}</div>`);
      for (let i = 0; i < first; i++) html += `<div class="cal-day muted"></div>`;
      for (let d = 1; d <= days; d++) {
        const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
        const ev = events[key];
        const cls = ['cal-day', isToday ? 'today' : '', ev ? 'event ' + ev : ''].filter(Boolean).join(' ');
        html += `<div class="${cls}">${d}</div>`;
      }
      html += `</div>`;
      el.innerHTML = html + (el.getAttribute('data-legend') || '');
      el.querySelector('[data-cal-prev]').onclick = () => { view = new Date(y, m - 1, 1); render(); };
      el.querySelector('[data-cal-next]').onclick = () => { view = new Date(y, m + 1, 1); render(); };
    }
    render();
  }
  document.querySelectorAll('[data-calendar]').forEach(buildCal);

  /* ── GALERIA: navegação lateral (scroll-spy) ── */
  const secs = [...document.querySelectorAll('.gx-section[id]')];
  const navlinks = [...document.querySelectorAll('.gx-nav a')];
  if (secs.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          navlinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px' });
    secs.forEach(s => io.observe(s));
  }

  /* ── GALERIA: busca ── */
  const search = document.getElementById('gx-search');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll('.gx-comp').forEach(c => {
        const hit = c.getAttribute('data-name')?.toLowerCase().includes(q) || c.textContent.toLowerCase().includes(q);
        c.style.display = (!q || hit) ? '' : 'none';
      });
      document.querySelectorAll('.gx-section').forEach(s => {
        const any = [...s.querySelectorAll('.gx-comp')].some(c => c.style.display !== 'none');
        s.style.display = any ? '' : 'none';
      });
    });
  }
})();
