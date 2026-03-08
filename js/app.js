// ── CONSTANTS ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const YEARS = [
  { id: 'all',       label: 'All Years',  color: '#E8A020' },
  { id: 'reception', label: 'Reception',  color: '#E8700A' },
  { id: 'year1',     label: 'Year 1',     color: '#1A8A40' },
  { id: 'year2',     label: 'Year 2',     color: '#1A5FAA' },
  { id: 'year3',     label: 'Year 3',     color: '#7A1AAA' },
  { id: 'year4',     label: 'Year 4',     color: '#AA6A1A' },
  { id: 'year5',     label: 'Year 5',     color: '#1A9A8A' },
  { id: 'year6',     label: 'Year 6',     color: '#AA2A2A' },
];

const SUPABASE_URL = window.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const SUPABASE_EVENT_COLUMNS = 'id,title,date,time,year_group,notes';

// ── STATE ───────────────────────────────────────────────────────────────────────

let currentDate   = new Date();
let currentView   = 'month';
let selectedYears = new Set(['all']);
let searchQuery   = '';
let currentEventId = null;
let events        = [];
let supabaseClient = null;

// ── SUPABASE ────────────────────────────────────────────────────────────────────

function toUIEvent(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time || 'All Day',
    yearGroup: row.year_group || 'all',
    notes: row.notes || ''
  };
}

function buildDbPayload({ title, date, time, yearGroup, notes }) {
  return {
    title,
    date,
    time: time || 'All Day',
    year_group: yearGroup || 'all',
    notes: notes || ''
  };
}

function initSupabase() {
  if (!window.supabase?.createClient) {
    throw new Error('Supabase SDK not loaded.');
  }

  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    throw new Error('Supabase credentials not configured.');
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function loadEventsFromSupabase() {
  const { data, error } = await supabaseClient
    .from('events')
    .select(SUPABASE_EVENT_COLUMNS)
    .order('date', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;
  events = (data || []).map(toUIEvent);
}

async function requireAuthSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    window.location.href = 'auth.html';
    return false;
  }

  const userId = data.session.user?.id;
  if (!userId) {
    await supabaseClient.auth.signOut();
    window.location.href = 'auth.html';
    return false;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('status, role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('Profile verification failed:', profileError);
    await supabaseClient.auth.signOut();
    localStorage.setItem('auth_notice', 'Could not verify your account status. Please log in again.');
    window.location.href = 'auth.html';
    return false;
  }

  if (!profile) {
    await supabaseClient.auth.signOut();
    localStorage.setItem('auth_notice', 'Your profile is not set up yet. Contact the administrator.');
    window.location.href = 'auth.html';
    return false;
  }

  const status = (profile?.status || '').toLowerCase();
  if (status === 'pending') {
    await supabaseClient.auth.signOut();
    localStorage.setItem('auth_notice', 'Your account is awaiting approval from the administrator.');
    window.location.href = 'auth.html';
    return false;
  }

  if (status !== 'approved') {
    await supabaseClient.auth.signOut();
    localStorage.setItem('auth_notice', 'Your account is not approved yet. Contact the administrator.');
    window.location.href = 'auth.html';
    return false;
  }

  return true;
}

function ensureSupabaseReady() {
  if (supabaseClient) return true;
  showToast('Supabase is not configured yet.');
  return false;
}

// ── FILTERS ─────────────────────────────────────────────────────────────────────

function renderFilters() {
  // Mobile horizontal chip bar
  const bar = document.getElementById('filterBar');
  bar.innerHTML = '';
  YEARS.forEach(y => {
    const chip = document.createElement('div');
    chip.className = 'filter-chip' + (selectedYears.has(y.id) ? ' active' : '');
    chip.innerHTML = `
      <span style="width:8px;height:8px;border-radius:50%;background:${y.color};flex-shrink:0;display:inline-block;"></span>
      ${y.label}
    `;
    chip.onclick = () => toggleYear(y.id);
    bar.appendChild(chip);
  });

  // Desktop sidebar list
  const sidebar = document.getElementById('sidebarYearList');
  sidebar.innerHTML = '';
  YEARS.forEach(y => {
    const count = y.id === 'all'
      ? events.length
      : events.filter(e => e.yearGroup === y.id || e.yearGroup === 'all').length;

    const item = document.createElement('div');
    item.className = 'year-chip' + (selectedYears.has(y.id) ? ' active' : '');
    item.innerHTML = `
      <span class="year-dot" style="background:${y.color};"></span>
      <span>${y.label}</span>
      <span class="year-count">${count}</span>
    `;
    item.onclick = () => toggleYear(y.id);
    sidebar.appendChild(item);
  });
}

function toggleYear(id) {
  if (id === 'all') {
    selectedYears = new Set(['all']);
  } else {
    selectedYears.delete('all');
    if (selectedYears.has(id)) {
      selectedYears.delete(id);
      if (!selectedYears.size) selectedYears.add('all');
    } else {
      selectedYears.add(id);
    }
  }
  renderAll();
}

function getFiltered() {
  return events
    .filter(e => {
      const yearMatch = selectedYears.has('all') || selectedYears.has(e.yearGroup) || e.yearGroup === 'all';
      const searchMatch = !searchQuery
        || e.title.toLowerCase().includes(searchQuery)
        || (e.notes || '').toLowerCase().includes(searchQuery);
      return yearMatch && searchMatch;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── MONTH CALENDAR ──────────────────────────────────────────────────────────────

function renderCalendar() {
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  document.getElementById('monthLabel').textContent = `${MONTHS[m]} ${y}`;

  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today       = new Date(); today.setHours(0, 0, 0, 0);
  const filtered    = getFiltered();

  const body  = document.getElementById('monthBody');
  body.innerHTML = '';
  const total = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < total; i++) {
    const dayNum = i - firstDay + 1;
    const cell   = document.createElement('div');
    cell.className = 'cal-cell';

    const cellDate = new Date(y, m, dayNum); cellDate.setHours(0, 0, 0, 0);
    if (dayNum < 1 || dayNum > daysInMonth) cell.classList.add('other-month');
    if (cellDate.getTime() === today.getTime()) cell.classList.add('today');

    const safeDay = Math.max(1, Math.min(dayNum, daysInMonth));
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    const dayEvents = filtered.filter(e => e.date === dateStr);

    // Date number
    const dateEl = document.createElement('div');
    dateEl.className = 'cal-date';
    dateEl.textContent = (dayNum > 0 && dayNum <= daysInMonth) ? dayNum : '';
    cell.appendChild(dateEl);

    // Event pills (max 2)
    dayEvents.slice(0, 2).forEach(ev => {
      const pill = document.createElement('span');
      pill.className = `event-pill pill-${ev.yearGroup}`;
      pill.textContent = ev.title;
      pill.onclick = e => { e.stopPropagation(); openEventModal(ev.id); };
      cell.appendChild(pill);
    });

    // Overflow indicator
    if (dayEvents.length > 2) {
      const more = document.createElement('div');
      more.className = 'more-events';
      more.textContent = `+${dayEvents.length - 2} more`;
      cell.appendChild(more);
    }

    body.appendChild(cell);
  }
}

function prevMonth() { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); }
function nextMonth() { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); }
function goToday()   { currentDate = new Date(); renderCalendar(); }

// ── LIST VIEW ───────────────────────────────────────────────────────────────────

function renderList() {
  const filtered  = getFiltered();
  const container = document.getElementById('eventsList');
  container.innerHTML = '';

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No events yet</h3>
        <p>Tap "+ Add Event" to add events manually or paste a school email for AI extraction.</p>
        <button class="cta-btn" onclick="openAddModal()">+ Add Event</button>
      </div>`;
    return;
  }

  let lastMonth = '';
  filtered.forEach(ev => {
    const d  = new Date(ev.date + 'T12:00:00');
    const mk = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

    if (mk !== lastMonth) {
      const label = document.createElement('div');
      label.className = 'event-group-label';
      label.textContent = mk;
      container.appendChild(label);
      lastMonth = mk;
    }

    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-date-block">
        <div class="event-date-day">${d.getDate()}</div>
        <div class="event-date-mon">${MONTHS[d.getMonth()].slice(0, 3)}</div>
      </div>
      <div class="event-info">
        <h4>${ev.title}</h4>
        <div class="event-meta">🕐 ${ev.time}</div>
      </div>
      <div class="event-year-badge y-${ev.yearGroup}">${yearLabel(ev.yearGroup)}</div>
    `;
    card.onclick = () => openEventModal(ev.id);
    container.appendChild(card);
  });
}

// ── UPCOMING (sidebar) ──────────────────────────────────────────────────────────

function renderUpcoming() {
  const todayStr = new Date().toISOString().split('T')[0];
  const upcoming = getFiltered().filter(e => e.date >= todayStr).slice(0, 4);
  const container = document.getElementById('upcomingList');

  if (!upcoming.length) {
    container.innerHTML = '<span>No upcoming events</span>';
    return;
  }

  container.innerHTML = upcoming.map(ev => {
    const d = new Date(ev.date + 'T12:00:00');
    return `
      <div style="display:flex;gap:0.5rem;align-items:center;padding:0.28rem 0.4rem;border-radius:6px;cursor:pointer;"
           onclick="openEventModal(${ev.id})">
        <div style="text-align:center;background:var(--cream);border-radius:6px;padding:2px 5px;min-width:28px;">
          <div style="font-weight:700;font-size:0.82rem;">${d.getDate()}</div>
          <div style="color:var(--muted);font-size:0.58rem;">${MONTHS[d.getMonth()].slice(0, 3)}</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:500;font-size:0.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ev.title}</div>
          <div style="color:var(--muted);font-size:0.68rem;">${ev.time}</div>
        </div>
      </div>`;
  }).join('');
}

// ── VIEW SWITCHING ──────────────────────────────────────────────────────────────

function setView(view, tabBtn, navId) {
  currentView = view;

  // Toolbar tabs
  document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
  if (tabBtn) {
    tabBtn.classList.add('active');
  } else {
    document.querySelectorAll('.view-tab').forEach(t => {
      if (t.textContent.toLowerCase().startsWith(view === 'month' ? 'm' : 'l')) {
        t.classList.add('active');
      }
    });
  }

  // Bottom nav
  document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
  const navTarget = navId || (view === 'month' ? 'navMonth' : 'navList');
  document.getElementById(navTarget)?.classList.add('active');

  document.getElementById('monthView').style.display = view === 'month' ? '' : 'none';
  document.getElementById('listView').style.display  = view === 'list'  ? '' : 'none';

  if (view === 'month') renderCalendar();
  else renderList();
}

function handleSearch(value) {
  searchQuery = value.toLowerCase();
  renderCalendar();
  renderList();
}

// ── EVENT DETAIL MODAL ──────────────────────────────────────────────────────────

function openEventModal(id) {
  const ev = events.find(e => e.id === id);
  if (!ev) return;
  currentEventId = id;

  const d = new Date(ev.date + 'T12:00:00');
  document.getElementById('eventModalTitle').textContent = ev.title;
  document.getElementById('eventModalMeta').innerHTML = `
    <div class="meta-chip">📅 ${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</div>
    <div class="meta-chip">🕐 ${ev.time}</div>
    <div class="meta-chip event-year-badge y-${ev.yearGroup}">${yearLabel(ev.yearGroup)}</div>
  `;
  document.getElementById('eventModalNotes').textContent = ev.notes || 'No additional notes.';
  document.getElementById('eventModal').classList.add('open');
}

async function deleteCurrentEvent() {
  if (!ensureSupabaseReady()) return;
  if (currentEventId == null) return;
  const { error } = await supabaseClient.from('events').delete().eq('id', currentEventId);
  if (error) {
    showToast('Could not delete event. Please try again.');
    return;
  }

  events = events.filter(e => e.id !== currentEventId);
  currentEventId = null;
  closeModal('eventModal');
  renderAll();
  showToast('🗑️ Event deleted');
}

// ── ADD CHOICE MODAL ────────────────────────────────────────────────────────────

function openAddModal() {
  document.getElementById('addModal').classList.add('open');
}

// ── MANUAL EVENT MODAL ──────────────────────────────────────────────────────────

function openManualModal() {
  document.getElementById('man_title').value = '';
  document.getElementById('man_date').value  = '';
  document.getElementById('man_time').value  = '';
  document.getElementById('man_year').value  = 'all';
  document.getElementById('man_notes').value = '';
  document.getElementById('manualError').style.display = 'none';
  document.getElementById('manualModal').classList.add('open');
}

async function saveManualEvent() {
  if (!ensureSupabaseReady()) return;
  const title     = document.getElementById('man_title').value.trim();
  const date      = document.getElementById('man_date').value;
  const time      = document.getElementById('man_time').value.trim();
  const yearGroup = document.getElementById('man_year').value;
  const notes     = document.getElementById('man_notes').value.trim();
  const errEl     = document.getElementById('manualError');

  if (!title || !date) {
    errEl.textContent = 'Please enter at least a title and date.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  const payload = buildDbPayload({ title, date, time, yearGroup, notes });
  const { data, error } = await supabaseClient
    .from('events')
    .insert(payload)
    .select(SUPABASE_EVENT_COLUMNS)
    .single();

  if (error) {
    errEl.textContent = 'Could not save event. Please try again.';
    errEl.style.display = 'block';
    return;
  }

  events.push(toUIEvent(data));
  closeModal('manualModal');
  renderAll();
  showToast('✅ Event added');
}

// ── EMAIL PARSE MODAL ───────────────────────────────────────────────────────────

function openParseModal() {
  document.getElementById('parseModal').classList.add('open');
  document.getElementById('emailText').value    = '';
  document.getElementById('parseOutput').innerHTML = '';
}

async function parseEmail() {
  const text = document.getElementById('emailText').value.trim();
  if (!text) { showToast('Please paste some email content first'); return; }

  const output = document.getElementById('parseOutput');
  output.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Extracting events…</span></div>`;

  const prompt = `You are a school event parser. Extract ALL events from this email. Return a JSON array only, no other text. Each object must have:
- title: string
- date: YYYY-MM-DD (assume 2026 if no year given)
- time: e.g. "9:30 AM" or "All Day"
- yearGroup: one of "all","reception","year1","year2","year3","year4","year5","year6"
- notes: string

Email:
${text}`;

  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const raw  = data.content.map(i => i.text || '').join('');

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      if (!Array.isArray(parsed)) parsed = [parsed];
    } catch (e) {
      output.innerHTML = `<div class="error-msg" style="margin-top:0.75rem;">Couldn't parse the AI response. Please try again.</div>`;
      return;
    }

    if (!parsed.length) {
      output.innerHTML = `<div style="color:var(--muted);font-size:0.85rem;padding:1rem;text-align:center;">No events found in this email.</div>`;
      return;
    }

    // Build review/edit cards
    window._parsed = parsed;
    output.innerHTML = `
      <div class="parse-result">
        <div class="parse-result-label">✅ Found ${parsed.length} event${parsed.length > 1 ? 's' : ''} — review &amp; save</div>
        <div id="pec"></div>
        <button class="btn btn-primary btn-block" onclick="saveAllParsed()" style="margin-top:0.5rem;">💾 Save All Events</button>
      </div>`;

    const pec = document.getElementById('pec');
    parsed.forEach((ev, i) => {
      const div = document.createElement('div');
      div.className = 'parsed-event-card';
      div.innerHTML = `
        <div class="field-row">
          <div class="field-label">Title</div>
          <input class="field-input" id="pt_${i}" value="${(ev.title || '').replace(/"/g, '&quot;')}">
        </div>
        <div class="field-row-grid">
          <div class="field-row">
            <div class="field-label">Date</div>
            <input class="field-input" id="pd_${i}" type="date" value="${ev.date || ''}">
          </div>
          <div class="field-row">
            <div class="field-label">Time</div>
            <input class="field-input" id="pm_${i}" value="${(ev.time || '').replace(/"/g, '&quot;')}">
          </div>
        </div>
        <div class="field-row">
          <div class="field-label">Year Group</div>
          <select class="field-input" id="py_${i}">
            ${['all','reception','year1','year2','year3','year4','year5','year6']
              .map(y => `<option value="${y}"${ev.yearGroup === y ? ' selected' : ''}>${yearLabel(y)}</option>`)
              .join('')}
          </select>
        </div>
        <div class="field-row">
          <div class="field-label">Notes</div>
          <textarea class="field-input" id="pn_${i}" style="min-height:52px;">${ev.notes || ''}</textarea>
        </div>`;
      pec.appendChild(div);
    });

  } catch (err) {
    output.innerHTML = `<div class="error-msg" style="margin-top:0.75rem;">Connection error. Please try again.</div>`;
  }
}

async function saveAllParsed() {
  if (!ensureSupabaseReady()) return;
  const parsed = window._parsed || [];
  const payloads = [];

  parsed.forEach((_, i) => {
    const title     = document.getElementById(`pt_${i}`)?.value?.trim();
    const date      = document.getElementById(`pd_${i}`)?.value;
    const time      = document.getElementById(`pm_${i}`)?.value?.trim();
    const yearGroup = document.getElementById(`py_${i}`)?.value;
    const notes     = document.getElementById(`pn_${i}`)?.value?.trim();

    if (title && date) payloads.push(buildDbPayload({ title, date, time, yearGroup, notes }));
  });

  if (!payloads.length) {
    showToast('No valid events to save.');
    return;
  }

  const { data, error } = await supabaseClient
    .from('events')
    .insert(payloads)
    .select(SUPABASE_EVENT_COLUMNS);

  if (error) {
    showToast('Could not save parsed events. Please try again.');
    return;
  }

  events.push(...(data || []).map(toUIEvent));
  closeModal('parseModal');
  renderAll();
  showToast(`✅ ${payloads.length} event${payloads.length !== 1 ? 's' : ''} added`);
}

// ── SUBSCRIBE MODAL ─────────────────────────────────────────────────────────────

function openSubscribeModal() {
  document.getElementById('subscribeModal').classList.add('open');
  updateIcalUrl();
}

function updateIcalUrl() {
  const year = document.getElementById('subscribeYear').value;
  document.getElementById('icalUrl').textContent = `webcal://schoolstream.app/calendar/${year}.ics`;
}

function copyIcalUrl() {
  const url = document.getElementById('icalUrl').textContent;
  navigator.clipboard.writeText(url).then(() => {
    const el = document.getElementById('copyConfirm');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  });
}

function fakeOpenApp(name) {
  showToast(`📅 Opening ${name}…`);
}

// ── UTILITIES ───────────────────────────────────────────────────────────────────

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function closeIfBackdrop(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function yearLabel(id) {
  return {
    all: 'All Years', reception: 'Reception',
    year1: 'Year 1', year2: 'Year 2', year3: 'Year 3',
    year4: 'Year 4', year5: 'Year 5', year6: 'Year 6'
  }[id] || id;
}

function renderAll() {
  renderFilters();
  renderCalendar();
  renderList();
  renderUpcoming();
}

// ── INIT ────────────────────────────────────────────────────────────────────────
async function initApp() {
  try {
    initSupabase();
    const hasSession = await requireAuthSession();
    if (!hasSession) return;
    await loadEventsFromSupabase();
    renderAll();
  } catch (error) {
    console.error(error);
    renderAll();
    showToast('Supabase setup error. Add SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js.');
  }
}

initApp();
