/* ==========================================================================
   STOK DARAH SULSEL — APP LOGIC (Supabase Auth + Realtime + Panel Petugas)
   Jika js/config.js belum diisi, aplikasi berjalan dalam MODE DEMO (data
   tersimpan lokal di HP) sampai Supabase dikonfigurasi.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     KONEKSI SUPABASE
     ------------------------------------------------------------------ */
  const cfg = window.SUPABASE_CONFIG || {};
  const SUPABASE_READY =
    !!(cfg.url && cfg.anonKey &&
       !cfg.url.includes('MASUKKAN') && !cfg.anonKey.includes('MASUKKAN')) &&
    !!window.supabase;

  const sb = SUPABASE_READY ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;

  /* ------------------------------------------------------------------
     STATE APLIKASI
     ------------------------------------------------------------------ */
  const GOLS = ['A', 'B', 'O', 'AB'];
  const COMPS = [
    { key: 'wb',  label: 'WB',       desc: 'Whole Blood (Darah Utuh)' },
    { key: 'prc', label: 'PRC',      desc: 'Packed Red Cells (Sel Darah Merah Pekat)' },
    { key: 'tc',  label: 'TD / TC',  desc: 'Trombosit Concentrate' },
    { key: 'ffp', label: 'RFP / FFP', desc: 'Rich Fresh Plasma / Plasma Segar Beku' }
  ];

  const DEMO_KEY = 'stok_darah_sulsel_demo_v2';
  const DEMO_DEFAULT = {
    stock: {
      A:  { wb: 0, prc: 0, tc: 17, ffp: 47, status: 'Aman',     updated_at: new Date().toISOString() },
      B:  { wb: 0, prc: 0, tc: 0,  ffp: 53, status: 'Waspada',  updated_at: new Date().toISOString() },
      O:  { wb: 0, prc: 0, tc: 27, ffp: 67, status: 'Melimpah', updated_at: new Date().toISOString() },
      AB: { wb: 0, prc: 0, tc: 14, ffp: 34, status: 'Terbatas', updated_at: new Date().toISOString() }
    },
    settings: {
      hotline1: '0823-9421-6046',
      hotline2: '0898-4693-026',
      location_text: 'JL. PERINTIS KEMERDEKAAN KM 11, KEC. TAMALANREA, KOTA MAKASSAR'
    },
    announcements: [
      { id: 'd1', title: 'Jadwal Donor Gedung UPTD', body: 'Senin–Minggu, 08.00–20.00 WITA. Jl. Perintis Kemerdekaan KM 11, Tamalanrea, Makassar.', tag: 'Jadwal', is_active: true, created_at: new Date().toISOString() },
      { id: 'd2', title: 'Syarat Donor Darah', body: 'Usia 17–60 tahun, BB minimal 45 kg, tensi normal, Hb ≥ 12,5 g/dL, jarak donor terakhir ≥ 2 bulan.', tag: 'Info', is_active: true, created_at: new Date().toISOString() }
    ],
    admins: [],
    ownerPassword: 'admin123',
    requests: [],
    events: [],
    history: { A: [58, 60, 61, 64], B: [49, 52, 50, 53], O: [88, 90, 92, 94], AB: [45, 46, 47, 48] }
  };

  const state = {
    stock: {},
    settings: {},
    announcements: [],
    events: [],
    history: {},
    user: null,       // { id, email, role }
    demo: !SUPABASE_READY
  };

  /* ------------------------------------------------------------------
     UTIL
     ------------------------------------------------------------------ */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg, type) {
    const wrap = $('#toastWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type === 'err' ? 'err' : 'ok');
    el.innerHTML = `<i class="fa-solid ${type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i><span>${esc(msg)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 350); }, 3200);
  }

  function waDigits(raw) {
    let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
    if (d.startsWith('0')) d = '62' + d.slice(1);
    return d;
  }

  function fmtWita(iso) {
    try {
      const d = new Date(iso);
      const tanggal = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar'
      }).format(d);
      const jam = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar'
      }).format(d).replace(':', '.');
      return `${tanggal}, ${jam} WITA`;
    } catch (e) { return ''; }
  }

  function countUp(el, target) {
    if (!el) return;
    const start = parseInt(el.dataset.val || '0', 10) || 0;
    el.dataset.val = String(target);
    if (start === target) { el.textContent = target; return; }
    const dur = 650, t0 = performance.now();
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function statusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'aman' || s === 'melimpah') return 'aman';
    if (s === 'waspada') return 'waspada';
    return 'kritis';
  }
  function statusIcon(status) {
    const c = statusClass(status);
    return c === 'aman' ? 'fa-circle-check' : c === 'waspada' ? 'fa-triangle-exclamation' : 'fa-clock';
  }

  /* ------------------------------------------------------------------
     LAPISAN DATA (Supabase atau demo lokal)
     ------------------------------------------------------------------ */
  function demoGet() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(DEMO_KEY)); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = structuredClone(DEMO_DEFAULT);
    if (!d.ownerPassword) d.ownerPassword = DEMO_DEFAULT.ownerPassword;
    if (!Array.isArray(d.admins)) d.admins = [];
    if (!Array.isArray(d.requests)) d.requests = [];
    if (!Array.isArray(d.events)) d.events = [];
    if (!d.history || typeof d.history !== 'object') d.history = structuredClone(DEMO_DEFAULT.history);
    return d;
  }
  function demoSet(d) { localStorage.setItem(DEMO_KEY, JSON.stringify(d)); }

  async function fetchAll() {
    if (state.demo) {
      const d = demoGet();
      state.stock = d.stock;
      state.settings = d.settings;
      state.announcements = d.announcements.filter(a => a.is_active);
      state.events = (d.events || []).filter(e => e.event_date >= new Date().toISOString().slice(0, 10))
        .sort((a, b) => a.event_date.localeCompare(b.event_date));
      state.history = d.history || {};
      return;
    }
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const today = new Date().toISOString().slice(0, 10);
    const [stockRes, setRes, annRes, evRes, hisRes] = await Promise.all([
      sb.from('blood_stock').select('*'),
      sb.from('settings').select('*'),
      sb.from('announcements').select('*').eq('is_active', true).eq('is_frozen', false).order('created_at', { ascending: false }),
      sb.from('donor_events').select('*').eq('is_active', true).eq('is_frozen', false).gte('event_date', today).order('event_date', { ascending: true }),
      sb.from('stock_history').select('*').gte('recorded_at', weekAgo).order('recorded_at', { ascending: true })
    ]);
    state.stock = {};
    (stockRes.data || []).forEach(r => { state.stock[r.golongan] = r; });
    state.settings = {};
    (setRes.data || []).forEach(r => { state.settings[r.key] = r.value; });
    state.announcements = annRes.data || [];
    state.events = evRes.data || [];
    state.history = {};
    (hisRes.data || []).forEach(r => {
      (state.history[r.golongan] = state.history[r.golongan] || []).push(r.total);
    });
  }

  function latestUpdate() {
    let latest = null;
    Object.values(state.stock).forEach(r => {
      if (r.updated_at && (!latest || new Date(r.updated_at) > new Date(latest))) latest = r.updated_at;
    });
    return latest;
  }

  function subscribeRealtime() {
    if (state.demo) return;
    sb.channel('stok-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_stock' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donor_events' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_requests' }, () => { if (state.user) renderRequestList(); })
      .subscribe();
  }

  let refreshTimer = null;
  function refresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => { await fetchAll(); renderAll(); }, 250);
  }

  /* ------------------------------------------------------------------
     RENDER UI PUBLIK
     ------------------------------------------------------------------ */
  function renderAll() {
    renderLiveBadge();
    renderCards();
    renderTable();
    renderStats();
    renderAnnouncements();
    renderCriticalBanner();
    renderEvents();
    renderTrends();
    renderContact();
  }

  function renderLiveBadge() {
    const el = $('#liveTime');
    if (el) el.textContent = latestUpdate() ? fmtWita(latestUpdate()) : '—';
  }

  /* Render kartu: struktur dibangun SEKALI, lalu nilai diperbarui di tempat
     supaya tidak ada animasi ulang / getar setiap ada data realtime masuk. */
  let cardsBuilt = false;
  const prevTotals = {};

  function renderCards() {
    const grid = $('#bloodGrid');
    if (!grid) return;
    if (!cardsBuilt) {
      grid.innerHTML = GOLS.map((gol, i) => {
        const comps = COMPS.map(c => `
          <div class="component-item" data-comp="${c.key}">
            <div class="component-meta">
              <span class="comp-name">${c.label} <i class="fa-regular fa-circle-question comp-desc-icon" title="${c.desc}"></i></span>
              <span class="comp-count">0 Kantong</span>
            </div>
            <div class="comp-bar-bg"><div class="comp-bar-fill zero" style="width:0%"></div></div>
          </div>`).join('');
        return `
          <article class="blood-card" data-gol="${gol}" style="animation-delay:${i * 0.08}s">
            <div class="card-header">
              <div class="blood-badge">${gol}</div>
              <span class="stock-status-pill status-aman"><i class="fa-solid fa-circle-check"></i> Aman</span>
            </div>
            <div class="total-stock-display"><div class="total-val">0 <span>Kantong</span></div></div>
            <div class="component-list">${comps}</div>
          </article>`;
      }).join('');
      cardsBuilt = true;
    }

    GOLS.forEach(gol => {
      const d = state.stock[gol] || { wb: 0, prc: 0, tc: 0, ffp: 0, status: 'Aman' };
      const total = d.wb + d.prc + d.tc + d.ffp;
      const card = $(`.blood-card[data-gol="${gol}"]`);
      if (!card) return;

      const el = card.querySelector('.total-val');
      const prev = prevTotals[gol];
      prevTotals[gol] = total;
      if (prev === undefined) {
        tweenNum(el, 0, total);                 // animasi hanya saat pertama muat
      } else if (prev !== total) {
        tweenNum(el, prev, total);              // angka berubah: transisi halus
      } else {
        el.innerHTML = `${total} <span>Kantong</span>`;
      }

      const pill = card.querySelector('.stock-status-pill');
      pill.className = `stock-status-pill status-${statusClass(d.status)}`;
      pill.innerHTML = `<i class="fa-solid ${statusIcon(d.status)}"></i> ${esc(d.status)}`;

      COMPS.forEach(c => {
        const v = d[c.key] || 0;
        const item = card.querySelector(`.component-item[data-comp="${c.key}"]`);
        item.querySelector('.comp-count').textContent = `${v} Kantong`;
        const bar = item.querySelector('.comp-bar-fill');
        bar.style.width = Math.min(100, v) + '%';
        bar.classList.toggle('zero', v === 0);
      });
    });
    applyFilter();
  }

  function tweenNum(el, from, to) {
    const span = ' <span>Kantong</span>';
    if (from === to) { el.innerHTML = to + span; return; }
    const dur = 900, t0 = performance.now();
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.innerHTML = Math.round(from + (to - from) * eased) + span;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  function renderTable() {
    const tbody = $('#stockTableBody');
    if (!tbody) return;
    tbody.innerHTML = GOLS.map(gol => {
      const d = state.stock[gol] || { wb: 0, prc: 0, tc: 0, ffp: 0 };
      const total = d.wb + d.prc + d.tc + d.ffp;
      return `<tr>
        <td class="pill-td-gol">${gol}</td>
        <td class="pill-td ${d.wb === 0 ? 'zero' : ''}">${d.wb}</td>
        <td class="pill-td ${d.prc === 0 ? 'zero' : ''}">${d.prc}</td>
        <td class="pill-td ${d.tc === 0 ? 'zero' : ''}">${d.tc}</td>
        <td class="pill-td ${d.ffp === 0 ? 'zero' : ''}">${d.ffp}</td>
        <td class="pill-td-total">${total}</td>
      </tr>`;
    }).join('');
  }

  function renderStats() {
    let grand = 0, top = { gol: '–', n: -1 }, low = { gol: '–', n: Infinity };
    GOLS.forEach(gol => {
      const d = state.stock[gol] || { wb: 0, prc: 0, tc: 0, ffp: 0 };
      const t = d.wb + d.prc + d.tc + d.ffp;
      grand += t;
      if (t > top.n) top = { gol, n: t };
      if (t < low.n) low = { gol, n: t };
    });
    countUp($('#statTotalStock'), grand);
    const tg = $('#statTopGroup'); if (tg) tg.textContent = 'Gol ' + top.gol;
    const tl = $('#statTopGroupLabel'); if (tl) tl.textContent = `Tertinggi (${top.n} Kantong)`;
    const cg = $('#statCriticalGroup'); if (cg) cg.textContent = 'Gol ' + low.gol;
    const cl = $('#statCriticalLabel'); if (cl) cl.textContent = `Terendah (${low.n} Kantong)`;
  }

  function renderAnnouncements() {
    const track = $('#announceTrack');
    if (!track) return;
    if (!state.announcements.length) {
      track.innerHTML = `<div class="announce-card"><span class="announce-tag">Info</span>
        <div class="announce-title">Belum ada pengumuman</div>
        <div class="announce-body">Info resmi dari UPTD akan tampil di sini.</div></div>`;
      return;
    }
    track.innerHTML = state.announcements.map((a, i) => `
      <div class="announce-card" style="animation-delay:${i * 0.07}s">
        <span class="announce-tag">${esc(a.tag || 'Info')}</span>
        <div class="announce-title">${esc(a.title)}</div>
        <div class="announce-body">${esc(a.body)}</div>
        <div class="announce-date"><i class="fa-regular fa-calendar"></i> ${fmtWita(a.created_at)}</div>
      </div>`).join('');
  }

  function renderContact() {
    const s = state.settings;
    const h1 = s.hotline1 || '', h2 = s.hotline2 || '';
    const wa1 = $('#footerWa1'), wa2 = $('#footerWa2');
    if (wa1) wa1.href = 'https://wa.me/' + waDigits(h1);
    if (wa2) wa2.href = 'https://wa.me/' + waDigits(h2);
    const t1 = $('#footerWa1Text'); if (t1) t1.textContent = h1 + ' (Hotline WA 1)';
    const t2 = $('#footerWa2Text'); if (t2) t2.textContent = h2 + ' (Hotline WA 2)';
    const donor = $('#donorWaLink');
    if (donor) donor.href = 'https://wa.me/' + waDigits(h1) +
      '?text=' + encodeURIComponent('Halo Petugas UPTD Transfusi Darah Sulsel, saya ingin mendaftar donor darah.');
    const loc = $('#locationText');
    if (loc && s.location_text) loc.textContent = s.location_text;
  }

  /* ------------------------------------------------------------------
     FILTER & PENCARIAN
     ------------------------------------------------------------------ */
  let activeFilter = 'ALL';
  function applyFilter() {
    const q = ($('#searchInput') ? $('#searchInput').value : '').toUpperCase().trim();
    $$('.blood-card').forEach(card => {
      const gol = card.dataset.gol;
      const matchFilter = activeFilter === 'ALL' || gol === activeFilter;
      const matchSearch = !q || gol.includes(q) || card.textContent.toUpperCase().includes(q);
      card.style.display = (matchFilter && matchSearch) ? '' : 'none';
    });
  }

  /* ------------------------------------------------------------------
     MODAL
     ------------------------------------------------------------------ */
  function openModal(id) { const m = $(id); if (m) m.classList.add('active'); }
  function closeModal(el) { el.classList.remove('active'); }

  window.openEmergencyModal = () => openModal('#emergencyModal');
  window.openDonorModal = () => openModal('#donorModal');

  /* ------------------------------------------------------------------
     LOGIN (trigger: logo Sulsel)
     ------------------------------------------------------------------ */
  function triggerLogoClick() {
    if (state.user) { openAdminPanel(); return; }
    openModal('#loginModal');
    setTimeout(() => { const e = $('#loginEmail'); if (e) e.focus(); }, 380);
  }

  async function handleLogin(ev) {
    ev.preventDefault();
    const email = $('#loginEmail').value.trim().toLowerCase();
    const pass = $('#loginPassword').value;
    const btn = $('#loginSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memeriksa…';

    try {
      if (state.demo) {
        // MODE DEMO: login lokal (data hanya tersimpan di HP ini)
        const d = demoGet();
        const isOwner = email === 'cecemeri48@gmail.com' && pass === (d.ownerPassword || 'admin123');
        const adm = (d.admins || []).find(a => a.email === email && a.password === pass);
        if (!isOwner && !adm) throw new Error('Email atau kata sandi salah.');
        state.user = { id: 'demo', email, role: isOwner ? 'superadmin' : 'admin' };
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw new Error(error.message.includes('Invalid login') ? 'Email atau kata sandi salah.' : error.message);
        const role = await fetchRole(data.user.id);
        if (!role) {
          await sb.auth.signOut();
          throw new Error('Akun ini tidak memiliki akses petugas.');
        }
        state.user = { id: data.user.id, email, role };
      }
      closeModal($('#loginModal'));
      $('#loginForm').reset();
      toast('Berhasil masuk. Selamat bertugas!');
      openAdminPanel();
    } catch (err) {
      const overlay = $('#loginModal');
      overlay.classList.add('shake');
      setTimeout(() => overlay.classList.remove('shake'), 450);
      toast(err.message || 'Login gagal.', 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk';
    }
  }

  async function fetchRole(uid) {
    const { data } = await sb.from('user_roles').select('role').eq('user_id', uid).maybeSingle();
    return data ? data.role : null;
  }

  async function restoreSession() {
    if (state.demo) return;
    const { data } = await sb.auth.getSession();
    if (data && data.session && data.session.user) {
      const role = await fetchRole(data.session.user.id);
      if (role) state.user = { id: data.session.user.id, email: data.session.user.email, role };
    }
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') state.user = null;
    });
  }

  window.handleLogout = async function () {
    if (!state.demo) await sb.auth.signOut();
    state.user = null;
    closeModal($('#adminPanelModal'));
    toast('Anda telah keluar dari panel petugas.');
  };

  /* ------------------------------------------------------------------
     PANEL PETUGAS
     ------------------------------------------------------------------ */
  function openAdminPanel() {
    if (!state.user) { openModal('#loginModal'); return; }
    $('#userEmailBadge').textContent = state.user.email;

    // Tab kelola petugas hanya untuk pemilik akun utama — tanpa label peran apa pun.
    $('#tabBtnAdmins').style.display = state.user.role === 'superadmin' ? '' : 'none';

    buildStockForm();
    fillSettingsForm();
    renderInfoList();
    if (state.user.role === 'superadmin') renderAdminList();
    switchTab('stock');
    openModal('#adminPanelModal');
  }

  function switchTab(name) {
    ['stock', 'requests', 'events', 'info', 'admins', 'account'].forEach(t => {
      const btn = $('#tabBtn' + t[0].toUpperCase() + t.slice(1));
      const pane = $('#adminTab' + t[0].toUpperCase() + t.slice(1));
      if (btn) btn.classList.toggle('active', t === name);
      if (pane) pane.style.display = t === name ? '' : 'none';
    });
    if (name === 'admins' && state.user && state.user.role === 'superadmin') renderAdminList();
    if (name === 'info') renderInfoList();
    if (name === 'requests') renderRequestList();
    if (name === 'events') renderEventList();
  }

  function buildStockForm() {
    const grid = $('#adminStockGrid');
    grid.innerHTML = GOLS.map(gol => {
      const d = state.stock[gol] || { wb: 0, prc: 0, tc: 0, ffp: 0, status: 'Aman' };
      const opts = ['Melimpah', 'Aman', 'Waspada', 'Terbatas']
        .map(s => `<option value="${s}" ${d.status === s ? 'selected' : ''}>${s}</option>`).join('');
      return `
        <div class="admin-stock-card">
          <h4 class="admin-gol-title"><span class="table-gol">${gol}</span> Golongan ${gol}</h4>
          <div class="form-row-2">
            <div class="form-group"><label>WB</label><input type="number" min="0" id="input_${gol}_wb" value="${d.wb}" required></div>
            <div class="form-group"><label>PRC</label><input type="number" min="0" id="input_${gol}_prc" value="${d.prc}" required></div>
            <div class="form-group"><label>TC</label><input type="number" min="0" id="input_${gol}_tc" value="${d.tc}" required></div>
            <div class="form-group"><label>FFP</label><input type="number" min="0" id="input_${gol}_ffp" value="${d.ffp}" required></div>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Status</label>
            <select id="input_${gol}_status">${opts}</select>
          </div>
        </div>`;
    }).join('');
  }

  function fillSettingsForm() {
    const s = state.settings;
    $('#inputHotline1').value = s.hotline1 || '';
    $('#inputHotline2').value = s.hotline2 || '';
    $('#inputLocationText').value = s.location_text || '';
  }

  async function handleSaveStock(ev) {
    ev.preventDefault();
    const btn = $('#saveStockBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan…';
    try {
      const rows = GOLS.map(gol => ({
        golongan: gol,
        wb: Math.max(0, parseInt($('#input_' + gol + '_wb').value, 10) || 0),
        prc: Math.max(0, parseInt($('#input_' + gol + '_prc').value, 10) || 0),
        tc: Math.max(0, parseInt($('#input_' + gol + '_tc').value, 10) || 0),
        ffp: Math.max(0, parseInt($('#input_' + gol + '_ffp').value, 10) || 0),
        status: $('#input_' + gol + '_status').value,
        updated_at: new Date().toISOString()
      }));

      if (state.demo) {
        const d = demoGet();
        rows.forEach(r => {
          d.stock[r.golongan] = { wb: r.wb, prc: r.prc, tc: r.tc, ffp: r.ffp, status: r.status, updated_at: r.updated_at };
          if (!d.history) d.history = {};
          (d.history[r.golongan] = d.history[r.golongan] || []).push(r.wb + r.prc + r.tc + r.ffp);
          if (d.history[r.golongan].length > 30) d.history[r.golongan].shift();
        });
        demoSet(d);
      } else {
        const payload = rows.map(r => ({ ...r, updated_by: state.user.id }));
        const { error } = await sb.from('blood_stock').upsert(payload, { onConflict: 'golongan' });
        if (error) throw new Error(error.message);
        // Catat riwayat untuk grafik tren (gagal pun tidak apa-apa)
        try {
          await sb.from('stock_history').insert(rows.map(r => ({ golongan: r.golongan, total: r.wb + r.prc + r.tc + r.ffp })));
        } catch (e) { /* abaikan */ }
      }
      await refresh();
      toast('Stok darah berhasil diperbarui.');
      buildStockForm();
    } catch (err) {
      toast('Gagal menyimpan: ' + err.message, 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Stok Darah';
    }
  }

  async function handleSaveSettings(ev) {
    ev.preventDefault();
    const entries = [
      { key: 'hotline1', value: $('#inputHotline1').value.trim() },
      { key: 'hotline2', value: $('#inputHotline2').value.trim() },
      { key: 'location_text', value: $('#inputLocationText').value.trim() }
    ];
    try {
      if (state.demo) {
        const d = demoGet();
        entries.forEach(e => { d.settings[e.key] = e.value; });
        demoSet(d);
      } else {
        const { error } = await sb.from('settings').upsert(entries, { onConflict: 'key' });
        if (error) throw new Error(error.message);
      }
      await refresh();
      toast('Nomor WA & info berhasil disimpan.');
    } catch (err) {
      toast('Gagal menyimpan: ' + err.message, 'err');
    }
  }

  async function handleAddAnnouncement(ev) {
    ev.preventDefault();
    const title = $('#inputInfoTitle').value.trim();
    const body = $('#inputInfoBody').value.trim();
    const tag = $('#inputInfoTag').value.trim() || 'Info';
    try {
      if (state.demo) {
        const d = demoGet();
        d.announcements.unshift({ id: 'd' + Date.now(), title, body, tag, is_active: true, created_at: new Date().toISOString() });
        demoSet(d);
      } else {
        const { error } = await sb.from('announcements').insert({ title, body, tag, created_by: state.user.id });
        if (error) throw new Error(error.message);
      }
      $('#announcementForm').reset();
      $('#inputInfoTag').value = 'Info';
      await refresh();
      renderInfoList();
      toast('Info berhasil diterbitkan.');
    } catch (err) {
      toast('Gagal menerbitkan: ' + err.message, 'err');
    }
  }

  async function renderInfoList() {
    const box = $('#infoListContainer');
    if (!box) return;
    let items = [];
    if (state.demo) {
      items = demoGet().announcements;
    } else {
      const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: false });
      items = data || [];
    }
    if (!items.length) {
      box.innerHTML = '<p class="muted-p">Belum ada info yang diterbitkan.</p>';
      return;
    }
    box.innerHTML = items.map(a => `
      <div class="admin-item">
        <div class="admin-item-email">
          <i class="fa-solid fa-bullhorn" style="color:var(--primary-red);"></i> ${esc(a.title)}
          <small>${esc(a.tag || 'Info')} · ${a.is_active ? 'Tampil' : 'Disembunyikan'} · ${fmtWita(a.created_at)}</small>
        </div>
        <button class="btn-delete-admin" data-del-info="${a.id}"><i class="fa-solid fa-trash-can"></i> Hapus</button>
      </div>`).join('');

    $$('[data-del-info]', box).forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Hapus info ini?')) return;
        try {
          if (state.demo) {
            const d = demoGet();
            d.announcements = d.announcements.filter(x => x.id !== btn.dataset.delInfo);
            demoSet(d);
          } else {
            const { error } = await sb.from('announcements').delete().eq('id', btn.dataset.delInfo);
            if (error) throw new Error(error.message);
          }
          await refresh();
          renderInfoList();
          toast('Info dihapus.');
        } catch (err) { toast('Gagal menghapus: ' + err.message, 'err'); }
      });
    });
  }

  /* ------------------------------------------------------------------
     KELOLA PETUGAS (khusus pemilik akun utama)
     ------------------------------------------------------------------ */
  async function renderAdminList() {
    const box = $('#adminListContainer');
    if (!box) return;
    box.innerHTML = '<p class="muted-p">Memuat…</p>';
    let admins = [];
    if (state.demo) {
      admins = demoGet().admins.map(a => ({ user_id: a.email, email: a.email, created_at: a.created_at }));
    } else {
      const { data, error } = await sb.rpc('list_admins');
      if (error) { box.innerHTML = '<p class="muted-p">Gagal memuat daftar petugas.</p>'; return; }
      admins = data || [];
    }
    if (!admins.length) {
      box.innerHTML = '<p class="muted-p">Belum ada petugas input terdaftar.</p>';
      return;
    }
    box.innerHTML = admins.map(a => `
      <div class="admin-item">
        <div class="admin-item-email">
          <i class="fa-solid fa-user-check" style="color:var(--primary-green);"></i> ${esc(a.email)}
          <small>Terdaftar: ${fmtWita(a.created_at)}</small>
        </div>
        <button class="btn-delete-admin" data-del-admin="${a.user_id}" data-email="${esc(a.email)}">
          <i class="fa-solid fa-trash-can"></i> Hapus
        </button>
      </div>`).join('');

    $$('[data-del-admin]', box).forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Hapus akses petugas ' + btn.dataset.email + '?')) return;
        try {
          if (state.demo) {
            const d = demoGet();
            d.admins = d.admins.filter(x => x.email !== btn.dataset.email);
            demoSet(d);
          } else {
            const { data, error } = await sb.rpc('delete_admin_user', { p_user_id: btn.dataset.delAdmin });
            if (error) throw new Error(error.message);
            if (data && data.ok === false) throw new Error(data.error || 'Gagal menghapus.');
          }
          renderAdminList();
          toast('Petugas dihapus.');
        } catch (err) { toast('Gagal menghapus: ' + err.message, 'err'); }
      });
    });
  }

  async function handleAddAdmin(ev) {
    ev.preventDefault();
    const email = $('#inputNewAdminEmail').value.trim().toLowerCase();
    const pass = $('#inputNewAdminPassword').value;
    const btn = $('#addAdminBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menambahkan…';
    try {
      if (state.demo) {
        const d = demoGet();
        if (d.admins.some(a => a.email === email)) throw new Error('Email sudah terdaftar.');
        d.admins.push({ email, password: pass, created_at: new Date().toISOString() });
        demoSet(d);
      } else {
        const { data, error } = await sb.rpc('create_admin_user', { p_email: email, p_password: pass });
        if (error) throw new Error(error.message);
        if (data && data.ok === false) throw new Error(data.error || 'Gagal menambah petugas.');
      }
      $('#addAdminForm').reset();
      renderAdminList();
      toast('Petugas ' + email + ' berhasil ditambahkan.');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-plus"></i> Tambahkan Petugas';
    }
  }

  /* ------------------------------------------------------------------
     FITUR: BANNER KRITIS, JADWAL KELILING, GRAFIK TREN, BAGIKAN, ARSIP
     ------------------------------------------------------------------ */
  const GOL_COLORS = { A: '#E5484D', B: '#3E63DD', O: '#30A46C', AB: '#8E4EC6' };

  function renderCriticalBanner() {
    const b = $('#criticalBanner');
    if (!b) return;
    const weak = GOLS.filter(g => {
      const s = (state.stock[g] || {}).status;
      return s === 'Terbatas' || s === 'Waspada';
    });
    if (!weak.length) { b.style.display = 'none'; return; }
    $('#criticalTitle').textContent = 'Stok golongan ' + weak.join(' & ') + ' menipis!';
    $('#criticalSub').textContent = 'UPTD sangat membutuhkan pendonor. Setetes darah Anda sangat berarti.';
    b.style.display = '';
  }

  function fmtEventDate(isoDate) {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar'
      }).format(new Date(isoDate + 'T00:00:00+08:00'));
    } catch (e) { return isoDate; }
  }

  function renderEvents() {
    const sec = $('#eventsSection'), track = $('#eventsTrack');
    if (!sec || !track) return;
    if (!state.events.length) { sec.style.display = 'none'; return; }
    sec.style.display = '';
    track.innerHTML = state.events.map((e, i) => `
      <div class="event-card" style="animation-delay:${i * 0.07}s">
        <span class="event-date-badge"><i class="fa-solid fa-calendar-day"></i> ${esc(fmtEventDate(e.event_date))}</span>
        <div class="event-title">${esc(e.title)}</div>
        <div class="event-meta">
          <i class="fa-solid fa-location-dot"></i> ${esc(e.location)}<br>
          ${e.start_time ? `<i class="fa-solid fa-clock"></i> ${esc(e.start_time)}${e.end_time ? ' - ' + esc(e.end_time) : ''}<br>` : ''}
          ${e.note ? `<i class="fa-solid fa-circle-info"></i> ${esc(e.note)}` : ''}
        </div>
      </div>`).join('');
  }

  function sparklineSvg(values, color) {
    if (!values || values.length < 2) return '';
    const w = 100, h = 40, pad = 3;
    const numVals = values.filter(function(v) { return typeof v === 'number' && !isNaN(v); });
    if (numVals.length < 2) return '';
    const min = Math.min.apply(null, numVals), max = Math.max.apply(null, numVals);
    const span = max - min || 1;
    const pts = values.map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return [x, y];
    });
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ` L ${pts[pts.length - 1][0].toFixed(1)} ${h} L ${pts[0][0].toFixed(1)} ${h} Z`;
    const last = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
      `<path d="${area}" fill="${color}" opacity="0.14"></path>` +
      `<path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>` +
      `<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" fill="${color}"></circle></svg>`;
  }

  function renderTrends() {
    const sec = $('#trendSection'), grid = $('#trendGrid');
    if (!sec || !grid) return;
    grid.innerHTML = GOLS.map(gol => {
      const vals = (state.history[gol] || []).slice(-7);
      const now = vals.length ? vals[vals.length - 1] : 0;
      const svg = sparklineSvg(vals, GOL_COLORS[gol]);
      return `<div class="trend-card">
        <div class="trend-head">
          <span class="trend-gol" style="color:${GOL_COLORS[gol]}">Gol ${gol}</span>
          <span class="trend-val">${now} kantong</span>
        </div>
        ${svg || '<div class="trend-empty">Grafik muncul setelah ≥2 kali update stok.</div>'}
      </div>`;
    }).join('');
    const anyData = GOLS.some(g => (state.history[g] || []).length >= 2);
    sec.style.display = anyData ? '' : 'none';
  }

  async function handleShare() {
    const lines = GOLS.map(g => {
      const d = state.stock[g] || { wb: 0, prc: 0, tc: 0, ffp: 0, status: '-' };
      const t = d.wb + d.prc + d.tc + d.ffp;
      return `• Gol ${g}: ${t} kantong (${d.status})`;
    });
    const text = '🩸 Stok Darah UPTD Dinkes Sulsel (real-time):\n' + lines.join('\n') +
      '\n\nCek selengkapnya & ajukan permintaan darurat:';
    const url = location.origin + location.pathname;
    if (navigator.share) {
      try { await navigator.share({ title: document.title, text, url }); } catch (e) { /* dibatalkan */ }
    } else {
      try {
        await navigator.clipboard.writeText(text + ' ' + url);
        toast('Ringkasan stok tersalin — tinggal tempel di WA / FB.');
      } catch (e) { toast('Browser tidak mendukung bagikan otomatis.', 'err'); }
    }
  }

  async function renderRequestList() {
    const box = $('#requestListContainer');
    if (!box || !state.user) return;
    box.innerHTML = '<p class="muted-p">Memuat…</p>';
    let items = [];
    if (state.demo) {
      items = demoGet().requests || [];
    } else {
      const { data, error } = await sb.from('blood_requests').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) { box.innerHTML = '<p class="muted-p">Gagal memuat. Pastikan schema.sql versi terbaru sudah dijalankan di Supabase.</p>'; return; }
      items = data || [];
    }
    if (!items.length) { box.innerHTML = '<p class="muted-p">Belum ada permintaan masuk.</p>'; return; }
    box.innerHTML = items.map(r => `
      <div class="admin-item">
        <div class="admin-item-email">
          <i class="fa-solid fa-truck-medical" style="color:var(--primary-red);"></i>
          Gol ${esc(r.golongan)} · ${esc(r.komponen)} · ${r.jumlah} kantong
          <small>${esc(r.patient_name)} — ${esc(r.hospital)} · ${esc(r.phone)}<br>${fmtWita(r.created_at)}</small>
        </div>
        <button class="btn-delete-admin" data-del-req="${r.id}"><i class="fa-solid fa-trash-can"></i></button>
      </div>`).join('');
    $$('[data-del-req]', box).forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Hapus permintaan ini?')) return;
      try {
        if (state.demo) {
          const d = demoGet();
          d.requests = (d.requests || []).filter(x => x.id !== btn.dataset.delReq);
          demoSet(d);
        } else {
          const { error } = await sb.from('blood_requests').delete().eq('id', btn.dataset.delReq);
          if (error) throw new Error(error.message);
        }
        renderRequestList();
        toast('Permintaan dihapus.');
      } catch (err) { toast('Gagal: ' + err.message, 'err'); }
    }));
  }

  async function renderEventList() {
    const box = $('#eventListContainer');
    if (!box || !state.user) return;
    let items = [];
    if (state.demo) {
      items = demoGet().events || [];
    } else {
      const { data, error } = await sb.from('donor_events').select('*').order('event_date', { ascending: true });
      if (error) { box.innerHTML = '<p class="muted-p">Gagal memuat. Pastikan schema.sql versi terbaru sudah dijalankan.</p>'; return; }
      items = data || [];
    }
    if (!items.length) { box.innerHTML = '<p class="muted-p">Belum ada jadwal. Tambahkan di atas.</p>'; return; }
    box.innerHTML = items.map(e => `
      <div class="admin-item">
        <div class="admin-item-email">
          <i class="fa-solid fa-bus" style="color:#30A46C;"></i> ${esc(e.title)}
          <small>${esc(fmtEventDate(e.event_date))}${e.start_time ? ' · ' + esc(e.start_time) : ''}<br>${esc(e.location)}</small>
        </div>
        <button class="btn-delete-admin" data-del-event="${e.id}"><i class="fa-solid fa-trash-can"></i></button>
      </div>`).join('');
    $$('[data-del-event]', box).forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Hapus jadwal ini?')) return;
      try {
        if (state.demo) {
          const d = demoGet();
          d.events = (d.events || []).filter(x => x.id !== btn.dataset.delEvent);
          demoSet(d);
        } else {
          const { error } = await sb.from('donor_events').delete().eq('id', btn.dataset.delEvent);
          if (error) throw new Error(error.message);
        }
        await refresh();
        renderEventList();
        toast('Jadwal dihapus.');
      } catch (err) { toast('Gagal: ' + err.message, 'err'); }
    }));
  }

  async function handleAddEvent(ev) {
    ev.preventDefault();
    const btn = $('#addEventBtn');
    btn.disabled = true;
    const data = {
      title: $('#inputEventTitle').value.trim(),
      location: $('#inputEventLocation').value.trim(),
      event_date: $('#inputEventDate').value,
      start_time: $('#inputEventTime').value.trim() || null,
      // Parsing "09.00 - 13.00 WITA" → end_time terpisah dari start_time
      end_time: (() => {
        const raw = $('#inputEventTime').value.trim();
        if (!raw) return null;
        const m = raw.match(/^([^-]+)\s*[-–—]\s*(.+)$/);
        return m ? m[2].trim() : null;
      })(),
      note: $('#inputEventNote').value.trim() || null
    };
    try {
      if (state.demo) {
        const d = demoGet();
        if (!Array.isArray(d.events)) d.events = [];
        d.events.push({ id: 'e' + Date.now(), ...data, created_at: new Date().toISOString() });
        demoSet(d);
      } else {
        const { error } = await sb.from('donor_events').insert(data);
        if (error) throw new Error(error.message);
      }
      $('#eventForm').reset();
      await refresh();
      renderEventList();
      toast('Jadwal donor keliling ditambahkan.');
    } catch (err) {
      toast('Gagal menambah jadwal: ' + err.message, 'err');
    } finally {
      btn.disabled = false;
    }
  }

  /* ------------------------------------------------------------------
     UBAH KATA SANDI (semua petugas yang sedang login)
     ------------------------------------------------------------------ */
  async function handleChangePassword(ev) {
    ev.preventDefault();
    const p1 = $('#inputNewPassword').value;
    const p2 = $('#inputNewPassword2').value;
    const btn = $('#savePasswordBtn');
    if (p1.length < 6) { toast('Kata sandi minimal 6 karakter.', 'err'); return; }
    if (p1 !== p2) { toast('Konfirmasi kata sandi tidak sama.', 'err'); return; }
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan…';
    try {
      if (state.demo) {
        const d = demoGet();
        if (state.user.role === 'superadmin') {
          d.ownerPassword = p1;
        } else {
          const adm = d.admins.find(a => a.email === state.user.email);
          if (adm) adm.password = p1;
        }
        demoSet(d);
      } else {
        const { error } = await sb.auth.updateUser({ password: p1 });
        if (error) throw new Error(error.message);
      }
      $('#passwordForm').reset();
      toast('Kata sandi berhasil diubah. Gunakan yang baru saat login berikutnya.');
    } catch (err) {
      toast('Gagal mengubah kata sandi: ' + err.message, 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-key"></i> Simpan Kata Sandi Baru';
    }
  }

  /* ------------------------------------------------------------------
     WHATSAPP DARURAT
     ------------------------------------------------------------------ */
  async function sendWhatsAppRequest(ev) {
    ev.preventDefault();
    // Arsipkan permintaan ke database supaya petugas punya riwayat (WA tetap dibuka walau gagal)
    try {
      const reqData = {
        patient_name: $('#patientName').value.trim(),
        hospital: $('#hospitalName').value.trim(),
        golongan: $('#bloodGroupSelect').value,
        komponen: $('#componentSelect').value,
        jumlah: parseInt($('#totalBags').value, 10) || 1,
        phone: $('#contactPhone').value.trim()
      };
      if (state.demo) {
        const d = demoGet();
        if (!Array.isArray(d.requests)) d.requests = [];
        d.requests.unshift({ id: 'r' + Date.now(), ...reqData, created_at: new Date().toISOString() });
        demoSet(d);
      } else {
        await sb.from('blood_requests').insert(reqData);
      }
    } catch (e) { /* abaikan, lanjut ke WA */ }
    const msg =
      'Halo Petugas UPT Transfusi Darah Dinkes Sulsel,\n\n' +
      'Saya ingin mengajukan Permintaan Darah Darurat:\n' +
      '• Nama Pasien: ' + $('#patientName').value.trim() + '\n' +
      '• RS/Klinik: ' + $('#hospitalName').value.trim() + '\n' +
      '• Golongan: ' + $('#bloodGroupSelect').value + '\n' +
      '• Komponen: ' + $('#componentSelect').value + '\n' +
      '• Jumlah: ' + $('#totalBags').value + ' Kantong\n' +
      '• No. HP PJ: ' + $('#contactPhone').value.trim() + '\n\n' +
      'Mohon info ketersediaan stok & prosedur pengambilan. Terima kasih.';
    const wa = waDigits(state.settings.hotline1 || '0823-9421-6046');
    window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(msg), '_blank');
    closeModal($('#emergencyModal'));
  }

  /* ------------------------------------------------------------------
     TEMA, PWA, REVEAL, NAV
     ------------------------------------------------------------------ */
  function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
    $('#themeToggleBtn').addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeIcon(next);
    });
  }
  function updateThemeIcon(theme) {
    const btn = $('#themeToggleBtn');
    if (btn) btn.innerHTML = theme === 'dark'
      ? '<i class="fa-solid fa-sun" style="color:#FCE055;"></i>'
      : '<i class="fa-solid fa-moon"></i>';
  }

  function initReveal() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    $$('.reveal').forEach(el => io.observe(el));
  }

  function initBottomNav() {
    $$('[data-nav]').forEach(item => {
      item.addEventListener('click', () => {
        $$('.bottom-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  function registerSW() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  /* ------------------------------------------------------------------
     INISIALISASI
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initReveal();
    initBottomNav();
    registerSW();

    // Trigger login = logo Sulsel
    $('#logoTrigger').addEventListener('click', triggerLogoClick);

    // Filter chips & pencarian
    $$('#filterGroup .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#filterGroup .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.gol;
        applyFilter();
      });
    });
    $('#searchInput').addEventListener('input', applyFilter);

    // Form handlers
    $('#loginForm').addEventListener('submit', handleLogin);
    $('#emergencyForm').addEventListener('submit', sendWhatsAppRequest);
    $('#stockUpdateForm').addEventListener('submit', handleSaveStock);
    $('#settingsUpdateForm').addEventListener('submit', handleSaveSettings);
    $('#announcementForm').addEventListener('submit', handleAddAnnouncement);
    $('#addAdminForm').addEventListener('submit', handleAddAdmin);
    $('#passwordForm').addEventListener('submit', handleChangePassword);
    $('#eventForm').addEventListener('submit', handleAddEvent);
    const shareBtn = $('#shareBtn');
    if (shareBtn) shareBtn.addEventListener('click', handleShare);

    // Tab panel
    $$('#panelTabs .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Tutup modal via tombol × / klik overlay / ESC
    $$('.btn-close-modal[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay')));
    });
    $$('.modal-overlay').forEach(ov => {
      ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov); });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') $$('.modal-overlay.active').forEach(closeModal);
    });

    // Muat data & pasang realtime
    await restoreSession();
    await fetchAll();
    renderAll();
    subscribeRealtime();

    if (state.demo) {
      console.info('[Stok Darah Sulsel] Mode demo aktif — isi js/config.js agar data live.');
      // Peringatan TERLIHAT. Tanpa ini petugas bisa mengubah stok / ganti sandi
      // dan mengira tersimpan, padahal cuma masuk localStorage perangkat itu.
      const bar = document.createElement('div');
      bar.id = 'demoModeBanner';
      bar.textContent = '⚠️ MODE DEMO — tidak terhubung ke server. Perubahan stok & kata sandi TIDAK tersimpan.';
      bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#b91c1c;color:#fff;' +
        'font:600 13px/1.45 system-ui,-apple-system,sans-serif;padding:10px 14px;text-align:center;' +
        'box-shadow:0 -2px 10px rgba(0,0,0,.35)';
      document.body.appendChild(bar);
    }
  });
})();
