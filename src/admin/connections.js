// Connections — hidden, owner-only window.
// Opened from the owner's name in the top bar (or Ctrl/Cmd + Shift + K).
// Generate agency API keys (BDT), switch the whole website off/on, see live
// health and errors, set up webhook alerts and read the agency activity log.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const when = (d) => (d ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(d)) : '—');
const ago = (d) => { if (!d) return 'never'; const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; };
const dur = (s) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };

export function mountConnections({ api, flash }) {
  let el = null, data = null, tab = 'overview', fresh = null, freshHook = null, timer = 0;

  async function load() {
    data = await api('/api/admin/agency');
    render();
  }
  async function open() {
    if (!el) {
      el = document.createElement('div'); el.className = 'cx'; el.hidden = true;
      el.addEventListener('click', onClick); el.addEventListener('change', onChange);
      document.body.appendChild(el);
    }
    el.hidden = false; document.documentElement.classList.add('cx-open');
    el.innerHTML = '<div class="cx__scrim" data-x></div><div class="cx__win"><p class="cx__loading">Loading…</p></div>';
    try { await load(); } catch (e) { flash(e.message, true); close(); return; }
    clearInterval(timer); timer = setInterval(() => { if (!el.hidden && !fresh) load().catch(() => {}); }, 15000);
  }
  function close() { if (el) el.hidden = true; fresh = null; freshHook = null; clearInterval(timer); document.documentElement.classList.remove('cx-open'); }
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); el && !el.hidden ? close() : open(); }
    if (e.key === 'Escape' && el && !el.hidden) close();
  });

  const TABS = [['overview', 'Overview'], ['site', 'Website switch'], ['keys', 'API keys'], ['errors', 'Errors'], ['webhook', 'Alerts to BDT'], ['activity', 'Activity'], ['docs', 'API reference']];

  function render() {
    const st = data.status, site = data.site;
    const crit = st.alerts.filter((a) => a.level === 'critical').length, warn = st.alerts.filter((a) => a.level === 'warning').length;
    el.innerHTML = `<div class="cx__scrim" data-x></div>
    <section class="cx__win" role="dialog" aria-modal="true" aria-label="Connections">
      <header class="cx__head">
        <div><p class="cx__eyebrow">Owner only · hidden</p><h2>Connections</h2></div>
        <span class="cx__pill ${site.online ? 'is-on' : 'is-off'}"><i></i>Website ${site.online ? 'ONLINE' : 'OFFLINE'}</span>
        <span class="cx__pill ${crit ? 'is-off' : warn ? 'is-warn' : 'is-on'}"><i></i>${crit ? `${crit} critical` : warn ? `${warn} warning${warn > 1 ? 's' : ''}` : 'All systems normal'}</span>
        <button class="cx__x" data-x aria-label="Close">×</button>
      </header>
      <nav class="cx__tabs">${TABS.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'is-on' : ''}">${l}${k === 'errors' && st.errors.unresolved ? `<b>${st.errors.unresolved}</b>` : ''}</button>`).join('')}</nav>
      <div class="cx__body">${({ overview, site: siteTab, keys: keysTab, errors: errorsTab, webhook: hookTab, activity, docs })[tab]()}</div>
    </section>`;
  }

  /* ── tabs ── */
  function overview() {
    const st = data.status, h = st.health, t = st.traffic, o = st.orders.today;
    return `
      ${st.alerts.length ? `<ul class="cx-alerts">${st.alerts.map((a) => `<li class="is-${a.level}"><b>${a.level}</b>${esc(a.message)}</li>`).join('')}</ul>` : '<p class="cx-ok">✓ No problems detected. The website, ordering and database are working.</p>'}
      <div class="cx-grid">
        <div><span>Website</span><b>${data.site.online ? 'Online' : 'Offline'}</b><small>Ordering ${st.site.ordering.paused ? 'paused' : st.site.ordering.openNow ? 'open' : 'closed (hours)'}</small></div>
        <div><span>Database</span><b class="${h.database.ok ? '' : 'bad'}">${h.database.ok ? `${h.database.latencyMs} ms` : 'DOWN'}</b><small>${h.storage === 'postgres' ? 'Supabase' : 'Local file'}</small></div>
        <div><span>Uptime</span><b>${dur(h.uptimeSec)}</b><small>Version ${esc(h.version)} · Node ${esc(h.node)}</small></div>
        <div><span>Memory</span><b>${h.memoryMB.rss} MB</b><small>Load ${h.load.join(' / ')}</small></div>
        <div><span>Requests (1h)</span><b>${t.last1h.requests}</b><small>${t.last1h.errorRate}% failed · p95 ${t.last1h.p95ms} ms</small></div>
        <div><span>Errors (1h / 24h)</span><b class="${st.errors.lastHour ? 'bad' : ''}">${st.errors.lastHour} / ${st.errors.last24h}</b><small>${st.errors.unresolved} unresolved</small></div>
        <div><span>Orders today</span><b>${o.orders}</b><small>$${o.ordered.toFixed(2)} · ${o.pickedUp} picked up</small></div>
        <div><span>Right now</span><b>${o.newWaiting + o.preparing} active</b><small>${o.readyForPickup} ready · ${st.orders.late.length} late</small></div>
        <div><span>Live</span><b>${st.live.customersBuildingOrders} building</b><small>${st.live.staffDashboardsOpen} dashboards · ${st.live.customersTracking} tracking</small></div>
      </div>
      <p class="cx-small">Refreshes every 15 seconds. BDT sees exactly this through <code>GET /status</code>.</p>`;
  }
  function siteTab() {
    const s = data.site;
    return `
      <div class="cx-power ${s.online ? 'is-on' : 'is-off'}">
        <div><h3>Website power</h3><p>${s.online ? 'The website is live for customers.' : 'The website is OFF. Customers see a “We’ll be right back” page. Your dashboard and the agency API still work.'}</p></div>
        <button class="cx-switch" data-site="${s.online ? 'off' : 'on'}" role="switch" aria-checked="${s.online}" aria-label="Website power"><span></span></button>
      </div>
      <label class="cx-field">Message customers see while the website is off
        <textarea id="cxOffMsg" rows="2" maxlength="240" placeholder="Our website is taking a short break. The cafe is still serving — come see us!">${esc(s.offlineMessage)}</textarea></label>
      <button class="ad-btn ad-btn--ghost ad-btn--sm" data-act="save-offmsg">Save message</button>
      <p class="cx-small">BDT can flip this switch too: <code>POST /site {"online":false}</code></p>`;
  }
  function keysTab() {
    const active = data.keys.filter((k) => !k.revokedAt), revoked = data.keys.filter((k) => k.revokedAt);
    return `
      ${fresh ? `<div class="cx-fresh">
        <h3>Your new API key — copy it now</h3>
        <p>This is the only time it will be shown. Anyone with this key can ${fresh.access === 'full' ? '<b>see everything and control the website</b>' : 'see everything (read-only)'}.</p>
        <div class="cx-copy"><code id="cxKey">${esc(fresh.key)}</code><button class="ad-btn ad-btn--sm" data-copy="cxKey">Copy key</button></div>
        <p class="cx-small">Connection details for BDT (paste this whole block into BDT):</p>
        <div class="cx-copy"><pre id="cxCard">${esc(JSON.stringify({ name: 'Joy-Full Java + Juice', baseUrl: data.baseUrl, apiKey: fresh.key, auth: 'Authorization: Bearer <apiKey>', access: fresh.access, status: `${data.baseUrl}/status`, events: `${data.baseUrl}/events` }, null, 2))}</pre><button class="ad-btn ad-btn--sm" data-copy="cxCard">Copy all</button></div>
        <button class="ad-btn ad-btn--ghost ad-btn--sm" data-act="done-key">I’ve saved it</button>
      </div>` : `
      <form class="cx-gen" id="cxGen">
        <label class="cx-field">Name<input name="name" value="BDT" maxlength="40" /></label>
        <label class="cx-field">Access<select name="access"><option value="full">Full control — monitor + control the site</option><option value="read">Read-only — monitor only</option></select></label>
        <button class="ad-btn ad-btn--red">Generate API key</button>
      </form>`}
      <h3 class="cx-h">Active keys</h3>
      ${active.length ? `<table class="cx-table"><thead><tr><th>Name</th><th>Key</th><th>Access</th><th>Created</th><th>Last used</th><th></th></tr></thead><tbody>
        ${active.map((k) => `<tr><td><b>${esc(k.name)}</b></td><td><code>${esc(k.prefix)}…</code></td><td>${k.access === 'full' ? 'Full control' : 'Read-only'}</td><td>${when(k.createdAt)}<small>by ${esc(k.createdBy)}</small></td><td>${ago(k.lastUsedAt)}${k.lastUsedIp ? `<small>${esc(k.lastUsedIp)}</small>` : ''}</td><td><button class="ad-link cx-danger" data-revoke="${k.id}">Revoke</button></td></tr>`).join('')}
      </tbody></table>` : '<p class="cx-small">No active keys. Generate one to connect BDT.</p>'}
      ${revoked.length ? `<details class="cx-det"><summary>${revoked.length} revoked key${revoked.length > 1 ? 's' : ''}</summary><ul>${revoked.map((k) => `<li><code>${esc(k.prefix)}…</code> ${esc(k.name)} — revoked ${when(k.revokedAt)} by ${esc(k.revokedBy || '')}</li>`).join('')}</ul></details>` : ''}
      <p class="cx-small">Base URL: <code>${esc(data.baseUrl)}</code> · Send the key as <code>Authorization: Bearer &lt;key&gt;</code>. Keys are stored scrambled (hashed) — even the database can’t reveal them.</p>`;
  }
  function errorsTab() {
    const list = data.errors;
    return `
      <div class="cx-bar"><span>${list.filter((e) => !e.resolved).length} unresolved · server errors, crashes and visitors’ browser errors</span>${list.some((e) => !e.resolved) ? '<button class="ad-btn ad-btn--ghost ad-btn--sm" data-act="resolve-all">Mark all resolved</button>' : ''}</div>
      ${list.length ? `<ul class="cx-errs">${list.map((e) => `<li class="${e.resolved ? 'is-done' : ''} lv-${e.level}">
        <div class="cx-errs__h"><span class="cx-tag">${esc(e.source)}</span><span class="cx-tag lv">${esc(e.level)}</span><b>${esc(e.message)}</b>${e.count > 1 ? `<em>×${e.count}</em>` : ''}</div>
        <small>${when(e.at)}${e.count > 1 ? ` → last ${ago(e.lastAt)}` : ''}${e.route ? ` · ${esc(e.route)}` : ''}${e.page ? ` · page ${esc(e.page)}` : ''}${e.userAgent ? ` · ${esc(e.userAgent.slice(0, 70))}` : ''}</small>
        ${e.stack ? `<details><summary>Details</summary><pre>${esc(e.stack)}</pre></details>` : ''}
        ${e.resolved ? '' : `<button class="ad-link" data-resolve="${e.id}">Resolve</button>`}
      </li>`).join('')}</ul>` : '<p class="cx-ok">✓ No errors recorded.</p>'}`;
  }
  function hookTab() {
    const h = data.webhook;
    const ev = [['error', 'Errors & crashes'], ['site', 'Website switched on/off'], ['db', 'Database down/up'], ['order.new', 'New orders'], ['settings', 'Settings changed by the agency']];
    return `
      <p>Instead of BDT asking for updates, the website can <b>push</b> alerts to BDT the moment something happens.</p>
      ${freshHook ? `<div class="cx-fresh"><h3>Signing secret — copy it now</h3><p>BDT uses this to verify alerts really came from this website (<code>X-Joyfull-Signature: sha256=HMAC(secret, body)</code>).</p><div class="cx-copy"><code id="cxSec">${esc(freshHook)}</code><button class="ad-btn ad-btn--sm" data-copy="cxSec">Copy</button></div></div>` : ''}
      <label class="cx-field">BDT webhook URL<input id="cxHookUrl" placeholder="https://bdt…/api/webhooks/joyfull" value="${esc(h.url)}" /></label>
      <fieldset class="cx-evs"><legend>Send these events</legend>${ev.map(([k, l]) => `<label><input type="checkbox" data-ev="${k}" ${h.events.includes(k) ? 'checked' : ''}/> ${l}</label>`).join('')}</fieldset>
      <label class="cx-toggle"><input type="checkbox" id="cxHookOn" ${h.active ? 'checked' : ''}/> Alerts on</label>
      <div class="cx-acts"><button class="ad-btn ad-btn--red ad-btn--sm" data-act="save-hook">Save</button><button class="ad-btn ad-btn--ghost ad-btn--sm" data-act="test-hook">Send test alert</button><button class="ad-btn ad-btn--ghost ad-btn--sm" data-act="rotate-hook">New signing secret</button></div>
      <p class="cx-small">Secret: <code>${esc(h.secret || 'not set')}</code>${h.lastStatus ? ` · Last delivery ${ago(h.lastStatus.at)}: ${h.lastStatus.ok ? `✓ ${h.lastStatus.code}` : `✗ ${esc(h.lastStatus.error || h.lastStatus.code)}`}` : ''}</p>`;
  }
  function activity() {
    const a = data.audit;
    return a.length ? `<table class="cx-table"><thead><tr><th>When</th><th>Key</th><th>Action</th><th>Result</th><th>From</th></tr></thead><tbody>${a.map((x) => `<tr><td>${when(x.at)}</td><td>${esc(x.keyName || '—')}</td><td><code>${esc(x.method)} ${esc(x.path)}</code>${x.body && Object.keys(x.body).length ? `<small>${esc(JSON.stringify(x.body).slice(0, 120))}</small>` : ''}</td><td>${esc(x.result)}</td><td>${esc(x.ip || '')}</td></tr>`).join('')}</tbody></table>`
      : '<p class="cx-small">No agency activity yet. Every control action taken with an API key will be listed here.</p>';
  }
  function docs() {
    return `
      <p>Base URL <code>${esc(data.baseUrl)}</code> · Header <code>Authorization: Bearer jjj_live_…</code> · JSON in, JSON out · 600 requests/min per key.</p>
      <div class="cx-copy"><pre id="cxCurl">curl -H "Authorization: Bearer YOUR_KEY" ${esc(data.baseUrl)}/status

curl -X POST -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \\
  -d '{"online":false,"message":"Back at 2pm"}' ${esc(data.baseUrl)}/site</pre><button class="ad-btn ad-btn--sm" data-copy="cxCurl">Copy</button></div>
      <table class="cx-table cx-docs"><thead><tr><th>Method</th><th>Endpoint</th><th>Key</th><th>What it does</th></tr></thead><tbody>
      ${data.endpoints.map((e) => `<tr><td><span class="cx-m cx-m--${e.method.toLowerCase()}">${e.method}</span></td><td><code>${esc(e.path)}</code></td><td>${e.access === 'control' ? 'Full' : 'Any'}</td><td>${esc(e.description)}</td></tr>`).join('')}
      </tbody></table>`;
  }

  /* ── actions ── */
  async function onClick(e) {
    const t = e.target;
    if (t.closest('[data-x]')) return close();
    const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; fresh = tab === 'keys' ? fresh : null; return render(); }
    const cp = t.closest('[data-copy]');
    if (cp) { const txt = document.getElementById(cp.dataset.copy).textContent; try { await navigator.clipboard.writeText(txt); flash('Copied'); } catch { flash('Select the text and copy it manually', true); } return; }
    try {
      const sw = t.closest('[data-site]');
      if (sw) {
        const off = sw.dataset.site === 'off';
        if (off && !confirm('Turn the whole website OFF? Customers will not be able to see the menu or order until you turn it back on.')) return;
        data.site = await api('/api/admin/agency/site', { online: !off, message: document.getElementById('cxOffMsg')?.value });
        flash(off ? 'Website is OFF' : 'Website is back ONLINE'); return load();
      }
      const act = t.closest('[data-act]')?.dataset.act;
      if (act === 'save-offmsg') { data.site = await api('/api/admin/agency/site', { message: document.getElementById('cxOffMsg').value }); flash('Saved'); return render(); }
      if (act === 'done-key') { fresh = null; return load(); }
      if (act === 'resolve-all') { await api('/api/admin/agency/errors/resolve', { ids: 'all' }); return load(); }
      if (act === 'save-hook' || act === 'rotate-hook') {
        const r = await api('/api/admin/agency/webhook', { url: document.getElementById('cxHookUrl').value, active: document.getElementById('cxHookOn').checked, events: [...el.querySelectorAll('[data-ev]:checked')].map((x) => x.dataset.ev), rotateSecret: act === 'rotate-hook' });
        freshHook = r.secretShownOnce ? r.secret : null; flash('Saved'); return load();
      }
      if (act === 'test-hook') { const r = await api('/api/admin/agency/webhook/test', {}); flash(r.ok ? `Test delivered (${r.code})` : `BDT answered ${r.code}`, !r.ok); return load(); }
      const rv = t.closest('[data-revoke]');
      if (rv) { if (!confirm('Revoke this key? Anything using it (like BDT) loses access immediately.')) return; await api(`/api/admin/agency/keys/${rv.dataset.revoke}/revoke`, {}); flash('Key revoked'); return load(); }
      const rs = t.closest('[data-resolve]'); if (rs) { await api('/api/admin/agency/errors/resolve', { ids: [rs.dataset.resolve] }); return load(); }
    } catch (err) { flash(err.message, true); }
  }
  function onChange() {}
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'cxGen') return;
    e.preventDefault();
    try { const fd = Object.fromEntries(new FormData(e.target)); fresh = await api('/api/admin/agency/keys', fd); data = await api('/api/admin/agency'); render(); }
    catch (err) { flash(err.message, true); }
  });

  return { open, close };
}
