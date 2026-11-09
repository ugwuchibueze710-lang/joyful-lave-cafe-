// Connections — hidden, owner-only window (click your name → Connections, or Ctrl/Cmd + Shift + K).
// Connect this website to BDT with a bdtc1_ connection key, switch the website off/on,
// see live health and issues, and message BDT with photos, audio and video.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const when = (d) => (d ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(d)) : '—');
const ago = (d) => { if (!d) return 'never'; const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; };
const kindOf = (f) => (f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'image');
const LIMIT = { image: 10, audio: 20, video: 50 };

export function mountConnections({ api, flash }) {
  let el = null, d = null, tab = 'overview', fresh = null, timer = 0, files = [];

  async function load() { d = await api('/api/admin/bdt'); render(); }
  async function open() {
    if (!el) { el = document.createElement('div'); el.className = 'cx'; el.hidden = true; el.addEventListener('click', onClick); el.addEventListener('change', onChange); el.addEventListener('submit', onSubmit); document.body.appendChild(el); }
    el.hidden = false; document.documentElement.classList.add('cx-open');
    el.innerHTML = '<div class="cx__scrim" data-x></div><div class="cx__win"><p class="cx__loading">Loading…</p></div>';
    try { await load(); } catch (e) { flash(e.message, true); close(); return; }
    clearInterval(timer); timer = setInterval(() => { if (!el.hidden && !fresh && tab !== 'messages') load().catch(() => {}); }, 15000);
  }
  function close() { if (el) el.hidden = true; fresh = null; clearInterval(timer); document.documentElement.classList.remove('cx-open'); }
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); el && !el.hidden ? close() : open(); }
    if (e.key === 'Escape' && el && !el.hidden) close();
  });

  const TABS = [['overview', 'Overview'], ['bdt', 'Connect to BDT'], ['power', 'Website switch'], ['issues', 'Issues'], ['messages', 'Messages'], ['visitors', 'Visitors'], ['activity', 'Activity']];
  function render() {
    const sm = d.summary, unread = d.messages.filter((m) => m.dir === 'in' && m.unread).length, open_ = d.issues.filter((e) => !e.resolved && e.source !== 'control').length;
    el.innerHTML = `<div class="cx__scrim" data-x></div>
    <section class="cx__win" role="dialog" aria-modal="true" aria-label="Connections">
      <header class="cx__head">
        <div><p class="cx__eyebrow">Owner only · hidden</p><h2>Connections</h2></div>
        <span class="cx__pill ${d.link ? 'is-on' : 'is-warn'}"><i></i>BDT ${d.link ? 'CONNECTED' : 'NOT CONNECTED'}</span>
        <span class="cx__pill ${d.power.on && !d.maintenance.on ? 'is-on' : 'is-off'}"><i></i>Website ${!d.power.on ? 'OFF' : d.maintenance.on ? 'BACK-SOON' : 'ONLINE'}</span>
        <span class="cx__pill ${sm.status === 'ok' ? 'is-on' : sm.status === 'degraded' ? 'is-warn' : 'is-off'}"><i></i>${sm.status.toUpperCase()}</span>
        <button class="cx__x" data-x aria-label="Close">×</button>
      </header>
      <nav class="cx__tabs">${TABS.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'is-on' : ''}">${l}${k === 'issues' && open_ ? `<b>${open_}</b>` : ''}${k === 'messages' && unread ? `<b>${unread}</b>` : ''}</button>`).join('')}</nav>
      <div class="cx__body">${{ overview, bdt, power, issues, messages, visitors, activity }[tab]()}</div>
    </section>`;
  }

  function overview() {
    const sm = d.summary, m = sm.metrics, b = sm.business, t = d.traffic;
    const failing = sm.checks.filter((c) => !c.ok);
    return `
      ${failing.length ? `<ul class="cx-alerts">${failing.map((c) => `<li class="is-${c.name === 'database' || c.name === 'supabase configured' ? 'critical' : 'warning'}"><b>check</b>${esc(c.name)} — not OK</li>`).join('')}</ul>` : '<p class="cx-ok">✓ All checks passing: database, Supabase, owner password, online ordering, staff dashboard.</p>'}
      <div class="cx-grid">
        <div><span>Status</span><b class="${sm.status === 'ok' ? '' : 'bad'}">${sm.status.toUpperCase()}</b><small>Version ${esc(sm.version)} · up ${sm.runtime.uptimeMin} min</small></div>
        <div><span>Database</span><b class="${sm.checks[0].ok ? '' : 'bad'}">${sm.checks[0].ok ? `${sm.checks[0].ms ?? 0} ms` : 'DOWN'}</b><small>${sm.checks[1].ok ? 'Supabase' : 'Local file (not saved!)'}</small></div>
        <div><span>Requests (1h)</span><b>${m.requests}</b><small>${(m.errorRate * 100).toFixed(2)}% failed · p95 ${m.p95Ms} ms</small></div>
        <div><span>Visitors (1h)</span><b>${t.visitors}</b><small>${t.liveNow} live now · ${t.pageviews} page views</small></div>
        <div><span>Orders today</span><b>${b.orders.today}</b><small>$${(b.revenueCents.today / 100).toFixed(2)} · ${b.orders.week} this week</small></div>
        <div><span>Memory</span><b>${sm.runtime.memoryMb} MB</b><small>Node ${esc(sm.runtime.node)}</small></div>
      </div>
      <div class="cx-grid cx-grid--sm">${b.custom.map((c) => `<div><span>${esc(c.label)}</span><b>${esc(c.value)}</b>${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</div>`).join('')}</div>
      <p class="cx-small">This is exactly what BDT reads every few minutes (<code>GET /summary</code>). Refreshes every 15 seconds.</p>`;
  }
  function bdt() {
    const active = d.keys.filter((k) => !k.revokedAt), l = d.link;
    return `
      <div class="cx-steps"><b>How to connect:</b> 1) Generate a connection key here → 2) In BDT Admin open <b>Websites → Add a website → Connect with API key</b> → 3) paste the key. That's it: BDT and this site connect both ways.</div>
      ${l ? `<div class="cx-linked"><h3>✓ Connected to BDT</h3><p>BDT <code>${esc(l.url)}</code> · site id <code>${esc(l.siteId)}</code></p><p class="cx-small">Connected ${when(l.connectedAt)} · BDT last checked in ${ago(l.lastPullAt)}${l.lastPullPath ? ` (${esc(l.lastPullPath.replace('/api/it/bdt', ''))})` : ''}</p></div>` : ''}
      ${fresh ? `<div class="cx-fresh">
        <h3>Your BDT connection key — copy it now</h3>
        <p>It's shown only once. Paste it into BDT Admin → Websites → Add a website → <b>Connect with API key</b>.</p>
        <div class="cx-copy"><code id="cxKey">${esc(fresh.code)}</code><button class="ad-btn ad-btn--sm" data-copy="cxKey">Copy key</button></div>
        <button class="ad-btn ad-btn--ghost ad-btn--sm" data-act="done-key">I’ve copied it</button>
      </div>` : `<div class="cx-gen1"><div><h3>${active.length ? 'Replace the connection key' : 'Generate a connection key'}</h3><p class="cx-small">${active.length ? 'Making a new key revokes the old one — BDT will need the new key pasted.' : 'Starts with bdtc1_ — the format BDT expects.'}</p></div><button class="ad-btn ad-btn--red" data-act="gen-key">Generate BDT connection key</button></div>`}
      <h3 class="cx-h">Keys</h3>
      ${d.keys.length ? `<table class="cx-table"><thead><tr><th>Key</th><th>Created</th><th>Last used by BDT</th><th>Status</th><th></th></tr></thead><tbody>
        ${d.keys.map((k) => `<tr><td><code>${esc(k.prefix)}…</code></td><td>${when(k.createdAt)}<small>by ${esc(k.createdBy)}</small></td><td>${ago(k.lastUsedAt)}</td><td>${k.revokedAt ? `<span class="cx-tag">revoked</span><small>${when(k.revokedAt)}</small>` : '<span class="cx-tag cx-tag--ok">active</span>'}</td><td>${k.revokedAt ? '' : `<button class="ad-link cx-danger" data-revoke="${k.id}">Revoke</button>`}</td></tr>`).join('')}
      </tbody></table>` : '<p class="cx-small">No keys yet.</p>'}
      <p class="cx-small">Protocol address: <code>${esc(d.protocolUrl)}</code> · BDT Site Protocol v1 · keys are stored scrambled (hashed) and can be revoked any time.</p>`;
  }
  function power() {
    const p = d.power, m = d.maintenance;
    return `
      <div class="cx-power ${p.on ? 'is-on' : 'is-off'}">
        <div><h3>Website power</h3><p>${p.on ? 'The website is live for customers.' : `The website is OFF${p.since ? ` since ${when(p.since)}` : ''}. Customers see “This website is currently unavailable”. Your dashboard and BDT still work.`}</p></div>
        <button class="cx-switch" data-power="${p.on ? 'off' : 'on'}" role="switch" aria-checked="${p.on}" aria-label="Website power"><span></span></button>
      </div>
      <label class="cx-field">Message while the website is off<textarea id="cxOffMsg" rows="2" maxlength="300" placeholder="Our website is taking a short break. The cafe is still serving — come see us!">${esc(p.message || '')}</textarea></label>
      <div class="cx-power cx-power--soft ${m.on ? 'is-off' : 'is-idle'}">
        <div><h3>Back-soon mode</h3><p>${m.on ? `ON${m.since ? ` since ${when(m.since)}` : ''} — visitors see “We’ll be right back”.` : 'A friendly “we’ll be right back” page while you make changes.'}</p></div>
        <button class="ad-btn ${m.on ? '' : 'ad-btn--lemon'}" data-maint="${m.on ? 'off' : 'on'}">${m.on ? 'Turn back-soon off' : 'Turn back-soon on'}</button>
      </div>
      <label class="cx-field">Back-soon message<input id="cxMaintMsg" maxlength="300" value="${esc(m.message || '')}" placeholder="We're updating the menu. Back in a few minutes!" /></label>
      <p class="cx-small">BDT's power switch and Control tab flip these same switches.</p>`;
  }
  function issues() {
    const list = d.issues.filter((e) => e.source !== 'control');
    return `
      <div class="cx-bar"><span>${list.filter((e) => !e.resolved).length} open · server errors, crashes, database problems and errors in customers’ browsers — all sent to BDT live</span>${list.some((e) => !e.resolved) ? '<button class="ad-btn ad-btn--ghost ad-btn--sm" data-act="resolve-all">Mark all resolved</button>' : ''}</div>
      ${list.length ? `<ul class="cx-errs">${list.map((e) => `<li class="${e.resolved ? 'is-done' : ''} lv-${e.level}">
        <div class="cx-errs__h"><span class="cx-tag">${esc(e.source)}</span><span class="cx-tag">${esc(e.level)}</span><b>${esc(e.message)}</b>${e.count > 1 ? `<em>×${e.count}</em>` : ''}</div>
        <small>${when(e.at)}${e.count > 1 ? ` → last ${ago(e.lastAt)}` : ''}${e.route ? ` · ${esc(e.route)}` : ''}${e.page ? ` · page ${esc(e.page)}` : ''}</small>
        ${e.stack ? `<details><summary>Details</summary><pre>${esc(e.stack)}</pre></details>` : ''}
        ${e.resolved ? '' : `<button class="ad-link" data-resolve="${e.id}">Resolve</button>`}
      </li>`).join('')}</ul>` : '<p class="cx-ok">✓ No issues recorded.</p>'}`;
  }
  function messages() {
    const list = d.messages;
    return `
      <form class="cx-compose" id="cxMsg">
        <h3>Message BDT</h3>
        <p class="cx-small">Lands in BDT Admin → Messages → From websites. Add photos, voice notes or videos (up to 10 files: photos 10 MB, audio 20 MB, video 50 MB).</p>
        <input name="subject" maxlength="160" placeholder="Subject (optional)" />
        <textarea name="body" rows="3" maxlength="5000" placeholder="Write your message…"></textarea>
        <div class="cx-files">${files.map((f, i) => `<span class="cx-file">${f.type.startsWith('image/') ? `<img src="${URL.createObjectURL(f)}" alt="" />` : `<i>${kindOf(f) === 'video' ? '🎬' : '🎤'}</i>`}<em>${esc(f.name)}</em><button type="button" data-rmfile="${i}" aria-label="Remove">×</button></span>`).join('')}
          <label class="cx-addfile">+ Add photos / audio / video<input type="file" id="cxFiles" multiple accept="image/*,audio/*,video/*" hidden /></label></div>
        <button class="ad-btn ad-btn--red" ${d.link ? '' : 'disabled'}>${d.link ? 'Send to BDT' : 'Connect to BDT first'}</button>
      </form>
      <h3 class="cx-h">Conversation</h3>
      ${list.length ? `<ul class="cx-thread">${list.map((m) => `<li class="is-${m.dir}${m.unread ? ' is-unread' : ''}">
        <div class="cx-thread__h"><b>${m.dir === 'in' ? esc(m.from || 'BDT') : `You (${esc(m.from)})`}</b><small>${when(m.sentAt)}</small></div>
        ${m.subject ? `<p class="cx-thread__s">${esc(m.subject)}</p>` : ''}${m.body ? `<p>${esc(m.body)}</p>` : ''}
        ${m.attachments?.length ? `<p class="cx-small">${m.attachments.map((a) => `📎 ${esc(a.filename || a.kind)}${m.dir === 'out' ? (a.uploaded ? ' ✓' : ' (not uploaded)') : ''}`).join(' · ')}</p>` : ''}
        ${m.dir === 'in' ? `<button class="ad-link" data-reply="${esc(m.id)}">Reply</button>` : ''}
      </li>`).join('')}</ul>` : '<p class="cx-small">No messages yet.</p>'}`;
  }
  function visitors() {
    const t = d.traffic, t24 = d.traffic24h;
    const rows = (arr, a, b) => arr.length ? `<table class="cx-table"><tbody>${arr.map((x) => `<tr><td>${esc(x[a])}</td><td style="text-align:right">${x[b]}</td></tr>`).join('')}</tbody></table>` : '<p class="cx-small">None yet.</p>';
    return `
      <div class="cx-grid"><div><span>Live now</span><b>${t.liveNow}</b><small>on the site in the last 2½ min</small></div><div><span>Last hour</span><b>${t.visitors}</b><small>${t.pageviews} page views</small></div><div><span>Last 24 hours</span><b>${t24.visitors}</b><small>${t24.pageviews} page views</small></div></div>
      <div class="cx-cols"><div><h3>Top pages (24h)</h3>${rows(t24.topPages, 'path', 'views')}</div><div><h3>Came from (24h)</h3>${rows(t24.referrers, 'source', 'visits')}</div>
      <div><h3>Devices (24h)</h3>${rows(Object.entries(t24.devices).map(([k, v]) => ({ k, v })), 'k', 'v')}</div></div>
      <p class="cx-small">Every visit is also sent to BDT Admin → Visitors (no IP addresses, admin pages left out).</p>`;
  }
  function activity() {
    return d.audit.length ? `<table class="cx-table"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Result</th></tr></thead><tbody>${d.audit.map((x) => `<tr><td>${when(x.at)}</td><td>${esc(x.who)}</td><td>${esc(x.action)}${x.args && Object.keys(x.args).length ? `<small>${esc(JSON.stringify(x.args).slice(0, 140))}</small>` : ''}</td><td>${esc(x.result || '')}</td></tr>`).join('')}</tbody></table>`
      : '<p class="cx-small">Nothing yet. Every connect, command BDT runs (power, back-soon, prices, sold out…) and key change is listed here.</p>';
  }

  /* ── actions ── */
  let replyTo = null;
  async function onClick(e) {
    const t = e.target;
    if (t.closest('[data-x]')) return close();
    const tb = t.closest('[data-tab]');
    if (tb) { tab = tb.dataset.tab; render(); if (tab === 'messages' && d.messages.some((m) => m.unread)) api('/api/admin/bdt/messages/read', {}).catch(() => {}); return; }
    const cp = t.closest('[data-copy]');
    if (cp) { const txt = document.getElementById(cp.dataset.copy).textContent; try { await navigator.clipboard.writeText(txt); flash('Copied — now paste it into BDT'); } catch { flash('Select the key and copy it manually', true); } return; }
    const rm = t.closest('[data-rmfile]'); if (rm) { files.splice(Number(rm.dataset.rmfile), 1); return render(); }
    const rp = t.closest('[data-reply]'); if (rp) { replyTo = rp.dataset.reply; el.querySelector('#cxMsg textarea').focus(); flash('Replying to BDT’s message'); return; }
    try {
      const pw = t.closest('[data-power]');
      if (pw) {
        const off = pw.dataset.power === 'off';
        if (off && !confirm('Turn the whole website OFF? Customers won’t be able to see the menu or order until it’s back on.')) return;
        await api('/api/admin/bdt/power', { on: !off, message: el.querySelector('#cxOffMsg')?.value }); flash(off ? 'Website is OFF' : 'Website is back ONLINE'); return load();
      }
      const mt = t.closest('[data-maint]');
      if (mt) { await api('/api/admin/bdt/maintenance', { on: mt.dataset.maint === 'on', message: el.querySelector('#cxMaintMsg')?.value }); flash(mt.dataset.maint === 'on' ? 'Back-soon mode is on' : 'Back-soon mode is off'); return load(); }
      const act = t.closest('[data-act]')?.dataset.act;
      if (act === 'gen-key') { if (d.keys.some((k) => !k.revokedAt) && !confirm('Make a new key? The current key stops working and BDT will need the new one.')) return; fresh = await api('/api/admin/bdt/keys', { name: 'BDT' }); d = await api('/api/admin/bdt'); return render(); }
      if (act === 'done-key') { fresh = null; return load(); }
      if (act === 'resolve-all') { await api('/api/admin/bdt/issues/resolve', { ids: 'all' }); return load(); }
      const rv = t.closest('[data-revoke]'); if (rv) { if (!confirm('Revoke this key? BDT loses access immediately.')) return; await api(`/api/admin/bdt/keys/${rv.dataset.revoke}/revoke`, {}); flash('Key revoked'); return load(); }
      const rs = t.closest('[data-resolve]'); if (rs) { await api('/api/admin/bdt/issues/resolve', { ids: [rs.dataset.resolve] }); return load(); }
    } catch (err) { flash(err.message, true); }
  }
  function onChange(e) {
    if (e.target.id !== 'cxFiles') return;
    for (const f of e.target.files) {
      if (files.length >= 10) { flash('Up to 10 files per message', true); break; }
      if (f.size > LIMIT[kindOf(f)] * 1048576) { flash(`${f.name} is too big (max ${LIMIT[kindOf(f)]} MB for ${kindOf(f)})`, true); continue; }
      files.push(f);
    }
    const form = el.querySelector('#cxMsg'), keep = { subject: form.subject.value, body: form.body.value };
    render(); const f2 = el.querySelector('#cxMsg'); f2.subject.value = keep.subject; f2.body.value = keep.body;
  }
  async function onSubmit(e) {
    if (e.target.id !== 'cxMsg') return;
    e.preventDefault();
    const form = e.target, btn = form.querySelector('button.ad-btn'), body = form.body.value.trim(), subject = form.subject.value.trim();
    if (!body && !files.length) return flash('Write a message or add a file', true);
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await api('/api/admin/bdt/messages', { subject, body, inReplyTo: replyTo, attachments: files.map((f) => ({ kind: kindOf(f), filename: f.name })) });
      let failed = 0;
      for (let i = 0; i < files.length; i++) {
        const up = r.upload.find((u) => u.ref === `f${i + 1}`); if (!up) continue;
        btn.textContent = `Uploading ${i + 1} of ${files.length}…`;
        const res = await fetch(`/api/admin/bdt/messages/${r.id}/files/f${i + 1}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'X-Joyfull': '1', 'X-Upload-Url': up.url }, body: files[i] });
        if (!res.ok) failed++;
      }
      files = []; replyTo = null;
      flash(failed ? `Sent, but ${failed} file(s) failed to upload` : 'Sent to BDT ✓', !!failed);
      await load();
    } catch (err) { flash(err.message, true); btn.disabled = false; btn.textContent = 'Send to BDT'; }
  }
  return { open, close };
}
