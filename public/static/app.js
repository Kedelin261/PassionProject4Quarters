/* ============================================================
   4 QUARTERS — Full Frontend Application
   ============================================================ */

// ─── State ────────────────────────────────────────────────────
const State = {
  token: localStorage.getItem('4q_token') || null,
  user: JSON.parse(localStorage.getItem('4q_user') || 'null'),
  activeCycle: JSON.parse(localStorage.getItem('4q_cycle') || 'null'),
  currentPage: 'dashboard',
  habits: [],
  cycles: [],
  goals: [],
  blocks: [],
  messages: [],
  calendarDate: new Date().toISOString().split('T')[0],
};

// ─── API ──────────────────────────────────────────────────────
const API_BASE = '/api';

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (State.token) opts.headers['Authorization'] = `Bearer ${State.token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || `HTTP ${res.status}`;
    console.error(`[API] ${method} ${path} FAILED:`, msg, data);
    throw new Error(msg);
  }
  return data;
}

// ─── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ─── Modal ─────────────────────────────────────────────────────
function showModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.add('flex');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-overlay').classList.remove('flex');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── Auth ──────────────────────────────────────────────────────
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('register-form').classList.toggle('hidden', isLogin);
  document.getElementById('tab-login').className = `flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${isLogin ? 'bg-primary text-white' : 'text-gray-400'}`;
  document.getElementById('tab-register').className = `flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${!isLogin ? 'bg-primary text-white' : 'text-gray-400'}`;
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner spin"></i> Signing in...';
  try {
    const data = await api('POST', '/auth/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    setAuthState(data.token, data.user);
    initApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-btn');
  const errEl = document.getElementById('reg-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner spin"></i> Creating account...';
  try {
    const data = await api('POST', '/auth/register', {
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value
    });
    setAuthState(data.token, data.user);
    initApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-rocket"></i> Start Your Journey';
  }
}

function setAuthState(token, user) {
  State.token = token;
  State.user = user;
  localStorage.setItem('4q_token', token);
  localStorage.setItem('4q_user', JSON.stringify(user));
}

async function handleLogout() {
  try { await api('POST', '/auth/logout'); } catch (_) {}
  State.token = null;
  State.user = null;
  State.activeCycle = null;
  localStorage.clear();
  location.reload();
}

// ─── Navigation ────────────────────────────────────────────────
function navigate(page, skipRender = false) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById(`page-${page}`);
  if (section) section.classList.remove('hidden');

  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', cycle: '12-Week Cycle', goals: 'Goals Hierarchy',
    pyramid: 'Pyramid View', habits: 'Habit Tracker', calendar: 'Time Blocking',
    scores: 'Scores', accountability: 'Accountability', standup: 'Daily Standup', ai: 'AI Coach'
  };
  document.getElementById('page-title').textContent = titles[page] || page;
  State.currentPage = page;

  if (!skipRender) renderPage(page);
}

async function renderPage(page) {
  switch (page) {
    case 'dashboard': await renderDashboard(); break;
    case 'cycle': await renderCyclePage(); break;
    case 'goals': await renderGoalsPage(); break;
    case 'pyramid': await renderPyramidPage(); break;
    case 'habits': await renderHabitsPage(); break;
    case 'calendar': await renderCalendarPage(); break;
    case 'scores': await renderScoresPage(); break;
    case 'accountability': await renderAccountabilityPage(); break;
    case 'standup': await renderStandupPage(); break;
    case 'ai': renderAIPage(); break;
  }
}

// ─── App Init ──────────────────────────────────────────────────
async function initApp() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('main-app').classList.add('flex');

  document.getElementById('user-name-display').textContent = State.user?.name || '';
  document.getElementById('header-user').textContent = State.user?.email || '';

  // Load cycles first
  try {
    const data = await api('GET', '/cycles');
    State.cycles = data.cycles || [];
    if (State.cycles.length > 0 && !State.activeCycle) {
      State.activeCycle = State.cycles[0];
      localStorage.setItem('4q_cycle', JSON.stringify(State.activeCycle));
    }
  } catch (e) { console.error('Failed to load cycles:', e); }

  navigate('dashboard');

  // Show onboarding for new users
  if (State.user && !State.user.onboarding_completed) {
    setTimeout(() => showOnboarding(), 800);
  }

  // Score badge
  updateScoreBadge();
}

async function updateScoreBadge() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const data = await api('GET', `/scores/daily?date=${today}`);
    const badge = document.getElementById('today-score-badge');
    badge.classList.remove('hidden');
    badge.innerHTML = `<span class="grade-${data.grade} px-2 py-0.5 rounded font-bold text-xs">${data.grade}</span> <span>${Math.round(data.total_score)}%</span>`;
  } catch (_) {}
}

// ─── DASHBOARD ─────────────────────────────────────────────────
async function renderDashboard() {
  const el = document.getElementById('dashboard-content');
  el.innerHTML = '<div class="text-gray-400 text-sm">Loading dashboard...</div>';

  try {
    const today = new Date().toISOString().split('T')[0];
    const [scoreData, habitsData, cyclesData] = await Promise.allSettled([
      api('GET', `/scores/daily?date=${today}`),
      api('GET', `/habits/grid?start=${today}&end=${today}`),
      api('GET', '/cycles')
    ]);

    const score = scoreData.status === 'fulfilled' ? scoreData.value : { total_score: 0, grade: 'F', goals_score: 0, habits_score: 0 };
    const habits = habitsData.status === 'fulfilled' ? habitsData.value : { habits: [], logs: {} };
    const cycles = cyclesData.status === 'fulfilled' ? cyclesData.value : { cycles: [] };

    State.cycles = cycles.cycles || [];
    if (State.cycles.length > 0 && !State.activeCycle) {
      State.activeCycle = State.cycles[0];
      localStorage.setItem('4q_cycle', JSON.stringify(State.activeCycle));
    }

    const habitList = habits.habits || [];
    const logMap = habits.logs || {};
    const completedToday = habitList.filter(h => logMap[h.id]?.[today] === true).length;

    // Days remaining in cycle
    let daysLeft = 84, cycleProgress = 0;
    if (State.activeCycle) {
      const start = new Date(State.activeCycle.start_date);
      const end = new Date(State.activeCycle.end_date);
      const now = new Date();
      const total = (end - start) / 86400000;
      const elapsed = (now - start) / 86400000;
      daysLeft = Math.max(0, Math.ceil(total - elapsed));
      cycleProgress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    }

    const gradeColor = { A: '#10B981', B: '#3B82F6', C: '#F59E0B', D: '#F97316', F: '#EF4444' };

    el.innerHTML = `
      <div class="fade-in">
        <div class="mb-6">
          <h1 class="text-2xl font-bold">Good ${getGreeting()}, ${State.user?.name?.split(' ')[0] || 'Athlete'} 👊</h1>
          <p class="text-gray-400 text-sm mt-1">${formatDate(today)} · ${State.activeCycle ? `<span class="text-primary-light">${State.activeCycle.title}</span>` : '<span class="text-accent">No active cycle — <a href="#" onclick="navigate(\'cycle\')" class="underline">create one</a></span>'}</p>
        </div>

        <!-- Stat Row -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="stat-card">
            <div class="text-xs text-gray-400 mb-1">Today's Score</div>
            <div class="stat-value" style="color:${gradeColor[score.grade] || '#EF4444'}">${Math.round(score.total_score)}%</div>
            <div class="mt-1"><span class="text-xs px-2 py-0.5 rounded font-bold grade-${score.grade}">${score.grade}</span></div>
          </div>
          <div class="stat-card">
            <div class="text-xs text-gray-400 mb-1">Habits Done</div>
            <div class="stat-value text-success">${completedToday}/${habitList.length}</div>
            <div class="text-xs text-gray-400 mt-1">Today</div>
          </div>
          <div class="stat-card">
            <div class="text-xs text-gray-400 mb-1">Cycle Progress</div>
            <div class="stat-value text-primary">${Math.round(cycleProgress)}%</div>
            <div class="text-xs text-gray-400 mt-1">${daysLeft} days left</div>
          </div>
          <div class="stat-card">
            <div class="text-xs text-gray-400 mb-1">Active Cycle</div>
            <div class="text-sm font-bold text-white mt-1 truncate">${State.activeCycle?.title || '—'}</div>
            <div class="text-xs text-gray-400 mt-1">${State.cycles.length} cycle(s)</div>
          </div>
        </div>

        <!-- Score breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div class="card">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-semibold">Today's Breakdown</h3>
              <button onclick="navigate('scores')" class="text-xs text-primary hover:underline">Full Report →</button>
            </div>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">Goals (60%)</span>
                  <span class="font-semibold">${Math.round(score.goals_score)}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${score.goals_score}%;background:linear-gradient(90deg,#4F46E5,#818CF8)"></div></div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">Habits (40%)</span>
                  <span class="font-semibold">${Math.round(score.habits_score)}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${score.habits_score}%;background:linear-gradient(90deg,#10B981,#6EE7B7)"></div></div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">Overall</span>
                  <span class="font-semibold" style="color:${gradeColor[score.grade]}">${Math.round(score.total_score)}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${score.total_score}%;background:linear-gradient(90deg,${gradeColor[score.grade]},${gradeColor[score.grade]}80)"></div></div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-semibold">Today's Habits</h3>
              <button onclick="navigate('habits')" class="text-xs text-primary hover:underline">Track All →</button>
            </div>
            ${habitList.length === 0 ? `
              <div class="text-center py-4">
                <i class="fas fa-plus-circle text-gray-600 text-2xl mb-2"></i>
                <p class="text-gray-400 text-sm">No habits yet</p>
                <button onclick="navigate('habits')" class="btn btn-primary btn-sm mt-3">Add Habits</button>
              </div>
            ` : habitList.slice(0, 6).map(h => {
              const done = logMap[h.id]?.[today] === true;
              return `
                <div class="flex items-center gap-3 py-2 border-b border-dark-border last:border-0">
                  <div class="checkbox-custom ${done ? 'checked' : ''}" onclick="quickToggleHabit(${h.id}, '${today}', ${done})">
                    ${done ? '<i class="fas fa-check text-xs"></i>' : ''}
                  </div>
                  <span class="text-sm ${done ? 'line-through text-gray-500' : ''}">${h.title}</span>
                  <span class="ml-auto text-xs px-2 py-0.5 rounded ${h.type === 'execute' ? 'bg-primary/20 text-primary-light' : 'bg-danger/20 text-danger'}">${h.type}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card">
          <h3 class="font-semibold mb-4">Quick Actions</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onclick="navigate('cycle')" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark hover:bg-dark-border transition text-center">
              <i class="fas fa-circle-notch text-primary text-xl"></i>
              <span class="text-xs text-gray-300">New Cycle</span>
            </button>
            <button onclick="navigate('goals')" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark hover:bg-dark-border transition text-center">
              <i class="fas fa-bullseye text-accent text-xl"></i>
              <span class="text-xs text-gray-300">Set Goals</span>
            </button>
            <button onclick="navigate('calendar')" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark hover:bg-dark-border transition text-center">
              <i class="fas fa-calendar-alt text-success text-xl"></i>
              <span class="text-xs text-gray-300">Block Time</span>
            </button>
            <button onclick="navigate('ai')" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark hover:bg-dark-border transition text-center">
              <i class="fas fa-brain text-purple-400 text-xl"></i>
              <span class="text-xs text-gray-300">AI Coach</span>
            </button>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="text-danger">Dashboard error: ${e.message}</div>`;
  }
}

async function quickToggleHabit(habitId, date, currentDone) {
  try {
    await api('POST', '/habits/log', { habit_id: habitId, log_date: date, completed: !currentDone });
    await renderDashboard();
    updateScoreBadge();
  } catch (e) { toast(e.message, 'error'); }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── CYCLE PAGE ────────────────────────────────────────────────
async function renderCyclePage() {
  const el = document.getElementById('cycle-content');
  el.innerHTML = '<div class="text-gray-400 text-sm">Loading cycles...</div>';

  try {
    const data = await api('GET', '/cycles');
    State.cycles = data.cycles || [];

    el.innerHTML = `
      <div class="fade-in">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold">12-Week Cycles</h2>
            <p class="text-sm text-gray-400 mt-1">Each cycle = 84 days of focused execution</p>
          </div>
          <button onclick="showCreateCycleModal()" class="btn btn-primary">
            <i class="fas fa-plus"></i> New Cycle
          </button>
        </div>

        ${State.cycles.length === 0 ? `
          <div class="card text-center py-12">
            <i class="fas fa-circle-notch text-primary text-4xl mb-4"></i>
            <h3 class="text-lg font-semibold mb-2">No cycles yet</h3>
            <p class="text-gray-400 text-sm mb-4">Create your first 12-week cycle to start your execution journey</p>
            <button onclick="showCreateCycleModal()" class="btn btn-primary">
              <i class="fas fa-plus"></i> Create First Cycle
            </button>
          </div>
        ` : State.cycles.map(cycle => {
          const start = new Date(cycle.start_date + 'T12:00:00');
          const end = new Date(cycle.end_date + 'T12:00:00');
          const now = new Date();
          const total = (end - start) / 86400000;
          const elapsed = Math.max(0, (now - start) / 86400000);
          const progress = Math.min(100, Math.round((elapsed / total) * 100));
          const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
          const isActive = State.activeCycle?.id === cycle.id;

          return `
            <div class="card mb-4 ${isActive ? 'border-primary/50' : ''}">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    ${isActive ? '<span class="text-xs bg-primary/20 text-primary-light px-2 py-0.5 rounded-full font-semibold">ACTIVE</span>' : ''}
                    <span class="text-xs px-2 py-0.5 rounded-full ${cycle.status === 'active' ? 'bg-success/20 text-success' : 'bg-gray-700 text-gray-400'}">${cycle.status}</span>
                  </div>
                  <h3 class="text-lg font-bold mb-1">${cycle.title}</h3>
                  ${cycle.vision ? `<p class="text-sm text-gray-400 mb-2 italic">"${cycle.vision}"</p>` : ''}
                  ${cycle.emotional_connection ? `<p class="text-xs text-accent mb-3">Why: ${cycle.emotional_connection}</p>` : ''}
                  
                  <div class="flex gap-4 text-xs text-gray-400 mb-3">
                    <span><i class="fas fa-calendar-day mr-1"></i>${start.toLocaleDateString()}</span>
                    <span>→</span>
                    <span>${end.toLocaleDateString()}</span>
                    <span class="text-primary-light font-semibold">${daysLeft} days left</span>
                  </div>

                  <div class="progress-bar mb-1">
                    <div class="progress-fill" style="width:${progress}%"></div>
                  </div>
                  <div class="text-xs text-gray-400">${progress}% of cycle complete</div>
                </div>

                <div class="flex flex-col gap-2 flex-shrink-0">
                  ${!isActive ? `<button onclick="setActiveCycle(${cycle.id})" class="btn btn-secondary btn-sm">Set Active</button>` : ''}
                  <button onclick="showEditCycleModal(${cycle.id})" class="btn btn-secondary btn-sm"><i class="fas fa-edit"></i></button>
                  <button onclick="deleteCycle(${cycle.id})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i></button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
  }
}

function showCreateCycleModal() {
  console.log('[UI] Create Cycle button clicked');
  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 84);
  const end = endDate.toISOString().split('T')[0];

  showModal(`
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-bold">Create 12-Week Cycle</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form onsubmit="handleCreateCycle(event)" class="space-y-4">
        <div>
          <label class="form-label">Cycle Title *</label>
          <input id="new-cycle-title" class="form-input" placeholder="e.g. Q1 2025 — Rise" required>
        </div>
        <div>
          <label class="form-label">Vision Statement</label>
          <textarea id="new-cycle-vision" class="form-input" rows="2" placeholder="Where do you see yourself in 12 weeks?"></textarea>
        </div>
        <div>
          <label class="form-label">Emotional Connection (Your WHY)</label>
          <textarea id="new-cycle-why" class="form-input" rows="2" placeholder="Why does this cycle matter deeply to you?"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Start Date *</label>
            <input id="new-cycle-start" type="date" class="form-input" value="${today}" required>
          </div>
          <div>
            <label class="form-label">End Date *</label>
            <input id="new-cycle-end" type="date" class="form-input" value="${end}" required>
          </div>
        </div>
        <div id="cycle-form-error" class="text-danger text-sm hidden"></div>
        <div class="flex gap-3 pt-2">
          <button type="submit" id="create-cycle-btn" class="btn btn-primary flex-1">
            <i class="fas fa-plus"></i> Create Cycle
          </button>
          <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `);
}

async function handleCreateCycle(e) {
  e.preventDefault();
  const btn = document.getElementById('create-cycle-btn');
  const errEl = document.getElementById('cycle-form-error');
  errEl.classList.add('hidden');

  const payload = {
    title: document.getElementById('new-cycle-title').value.trim(),
    vision: document.getElementById('new-cycle-vision').value.trim(),
    emotional_connection: document.getElementById('new-cycle-why').value.trim(),
    start_date: document.getElementById('new-cycle-start').value,
    end_date: document.getElementById('new-cycle-end').value
  };

  console.log('[CREATE CYCLE] click triggered');
  console.log('[CREATE CYCLE] payload:', payload);

  if (!payload.title || !payload.start_date || !payload.end_date) {
    errEl.textContent = 'Title, start date, and end date are required';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner spin"></i> Creating...';

  try {
    const data = await api('POST', '/cycles', payload);
    console.log('[CREATE CYCLE] API response:', data);

    if (!data.cycle) throw new Error('No cycle returned from API');

    State.cycles.unshift(data.cycle);
    State.activeCycle = data.cycle;
    localStorage.setItem('4q_cycle', JSON.stringify(data.cycle));

    closeModal();
    toast('Cycle created successfully!', 'success');
    console.log('[CREATE CYCLE] UI updated - cycle id:', data.cycle.id);
    await renderCyclePage();
    updateScoreBadge();
  } catch (err) {
    console.error('[CREATE CYCLE] FAILED:', err.message);
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Create Cycle';
  }
}

async function setActiveCycle(id) {
  const cycle = State.cycles.find(c => c.id === id);
  if (cycle) {
    State.activeCycle = cycle;
    localStorage.setItem('4q_cycle', JSON.stringify(cycle));
    toast(`"${cycle.title}" set as active cycle`, 'success');
    await renderCyclePage();
  }
}

async function showEditCycleModal(id) {
  const cycle = State.cycles.find(c => c.id === id);
  if (!cycle) return;

  showModal(`
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-bold">Edit Cycle</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form onsubmit="handleEditCycle(event, ${id})" class="space-y-4">
        <div>
          <label class="form-label">Title</label>
          <input id="edit-cycle-title" class="form-input" value="${escHtml(cycle.title)}" required>
        </div>
        <div>
          <label class="form-label">Vision</label>
          <textarea id="edit-cycle-vision" class="form-input" rows="2">${escHtml(cycle.vision || '')}</textarea>
        </div>
        <div>
          <label class="form-label">Emotional Connection</label>
          <textarea id="edit-cycle-why" class="form-input" rows="2">${escHtml(cycle.emotional_connection || '')}</textarea>
        </div>
        <div class="flex gap-3">
          <button type="submit" class="btn btn-primary flex-1">Save Changes</button>
          <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `);
}

async function handleEditCycle(e, id) {
  e.preventDefault();
  try {
    const data = await api('PATCH', `/cycles/${id}`, {
      title: document.getElementById('edit-cycle-title').value,
      vision: document.getElementById('edit-cycle-vision').value,
      emotional_connection: document.getElementById('edit-cycle-why').value
    });
    const idx = State.cycles.findIndex(c => c.id === id);
    if (idx >= 0) State.cycles[idx] = data.cycle;
    if (State.activeCycle?.id === id) {
      State.activeCycle = data.cycle;
      localStorage.setItem('4q_cycle', JSON.stringify(data.cycle));
    }
    closeModal();
    toast('Cycle updated!', 'success');
    await renderCyclePage();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteCycle(id) {
  if (!confirm('Delete this cycle and all its goals/habits? This cannot be undone.')) return;
  try {
    await api('DELETE', `/cycles/${id}`);
    State.cycles = State.cycles.filter(c => c.id !== id);
    if (State.activeCycle?.id === id) {
      State.activeCycle = State.cycles[0] || null;
      localStorage.setItem('4q_cycle', JSON.stringify(State.activeCycle));
    }
    toast('Cycle deleted', 'info');
    await renderCyclePage();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── GOALS PAGE ────────────────────────────────────────────────
async function renderGoalsPage() {
  const el = document.getElementById('goals-content');

  if (!State.activeCycle) {
    el.innerHTML = `
      <div class="card text-center py-12">
        <i class="fas fa-bullseye text-gray-600 text-4xl mb-4"></i>
        <h3 class="text-lg font-semibold mb-2">No Active Cycle</h3>
        <p class="text-gray-400 text-sm mb-4">Create a cycle first before setting goals</p>
        <button onclick="navigate('cycle')" class="btn btn-primary">Create Cycle</button>
      </div>
    `;
    return;
  }

  el.innerHTML = '<div class="text-gray-400 text-sm">Loading goals...</div>';

  try {
    const data = await api('GET', `/goals/tree?cycle_id=${State.activeCycle.id}`);
    const tree = data.tree || [];

    el.innerHTML = `
      <div class="fade-in">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold">Goals Hierarchy</h2>
            <p class="text-sm text-gray-400 mt-1">Cycle: <span class="text-primary-light">${escHtml(State.activeCycle.title)}</span></p>
          </div>
          <button onclick="showAddQuarterGoal()" class="btn btn-primary" ${tree.length >= 3 ? 'disabled title="Max 3 quarter goals"' : ''}>
            <i class="fas fa-plus"></i> Add 12-Week Goal
          </button>
        </div>

        ${tree.length === 0 ? `
          <div class="card text-center py-10">
            <i class="fas fa-bullseye text-primary text-3xl mb-3 opacity-40"></i>
            <p class="text-gray-400 mb-3">No goals yet. Add your first 12-week goal.</p>
            <button onclick="showAddQuarterGoal()" class="btn btn-primary btn-sm">Add First Goal</button>
          </div>
        ` : tree.map(qg => renderQuarterGoalNode(qg)).join('')}

        ${tree.length > 0 && tree.length < 3 ? `
          <button onclick="showAddQuarterGoal()" class="mt-4 w-full border-2 border-dashed border-dark-border rounded-xl py-4 text-gray-400 hover:border-primary hover:text-primary transition text-sm flex items-center justify-center gap-2">
            <i class="fas fa-plus-circle"></i> Add Another 12-Week Goal (${tree.length}/3)
          </button>
        ` : tree.length >= 3 ? `
          <div class="mt-3 text-xs text-accent text-center"><i class="fas fa-info-circle"></i> Maximum 3 quarter goals per cycle reached</div>
        ` : ''}
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
  }
}

function renderQuarterGoalNode(qg) {
  const monthlyHtml = (qg.monthly_goals || []).map(mg => renderMonthlyGoalNode(mg)).join('');
  return `
    <div class="card mb-4" id="qg-${qg.id}">
      <div class="flex items-start gap-3">
        <button onclick="toggleGoalNode('qg-body-${qg.id}')" class="text-gray-400 hover:text-white mt-1 flex-shrink-0">
          <i id="qg-chevron-${qg.id}" class="fas fa-chevron-right goal-chevron open text-xs"></i>
        </button>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs bg-primary/20 text-primary-light px-2 py-0.5 rounded font-semibold">12-WEEK GOAL</span>
            <span class="text-xs text-gray-400">${(qg.monthly_goals || []).length} monthly goals</span>
          </div>
          <div class="flex items-center gap-3">
            <h3 class="font-bold text-lg">${escHtml(qg.title)}</h3>
            <div class="flex gap-1 ml-auto">
              <button onclick="showAddMonthlyGoal(${qg.id})" class="btn btn-secondary btn-xs"><i class="fas fa-plus"></i> Monthly</button>
              <button onclick="showEditQuarterGoal(${qg.id}, '${escHtml(qg.title)}', '${escHtml(qg.description || '')}')" class="btn btn-secondary btn-xs"><i class="fas fa-edit"></i></button>
              <button onclick="deleteQuarterGoal(${qg.id})" class="btn btn-danger btn-xs"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          ${qg.description ? `<p class="text-sm text-gray-400 mt-1">${escHtml(qg.description)}</p>` : ''}
          <div class="mt-2 flex items-center gap-2">
            <div class="progress-bar flex-1"><div class="progress-fill" style="width:${qg.progress}%"></div></div>
            <span class="text-xs text-gray-400 flex-shrink-0">${Math.round(qg.progress)}%</span>
          </div>
        </div>
      </div>

      <div id="qg-body-${qg.id}" class="mt-4 ml-6 space-y-3">
        ${monthlyHtml || `
          <div class="text-center py-4 border border-dashed border-dark-border rounded-xl">
            <p class="text-xs text-gray-500 mb-2">No monthly goals yet</p>
            <button onclick="showAddMonthlyGoal(${qg.id})" class="btn btn-secondary btn-xs"><i class="fas fa-plus"></i> Add Month 1 Goal</button>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderMonthlyGoalNode(mg) {
  const weeklyHtml = (mg.weekly_goals || []).map(wg => renderWeeklyGoalNode(wg)).join('');
  return `
    <div class="bg-dark rounded-xl border border-dark-border p-4" id="mg-${mg.id}">
      <div class="flex items-start gap-3">
        <button onclick="toggleGoalNode('mg-body-${mg.id}')" class="text-gray-400 hover:text-white mt-0.5 flex-shrink-0">
          <i id="mg-chevron-${mg.id}" class="fas fa-chevron-right goal-chevron open text-xs"></i>
        </button>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded font-semibold">MONTH ${mg.month_number}</span>
            <span class="text-xs text-gray-400">${(mg.weekly_goals || []).length} weekly goals</span>
          </div>
          <div class="flex items-center gap-2">
            <h4 class="font-semibold">${escHtml(mg.title)}</h4>
            <div class="flex gap-1 ml-auto">
              <button onclick="showAddWeeklyGoal(${mg.id})" class="btn btn-secondary btn-xs"><i class="fas fa-plus"></i> Weekly</button>
              <button onclick="deleteMonthlyGoal(${mg.id})" class="btn btn-danger btn-xs"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
      </div>

      <div id="mg-body-${mg.id}" class="mt-3 ml-5 space-y-2">
        ${weeklyHtml || `
          <div class="text-center py-3 border border-dashed border-dark-border rounded-lg">
            <p class="text-xs text-gray-500 mb-2">No weekly goals yet</p>
            <button onclick="showAddWeeklyGoal(${mg.id})" class="btn btn-secondary btn-xs"><i class="fas fa-plus"></i> Add Week 1 Goal</button>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderWeeklyGoalNode(wg) {
  const habitsHtml = (wg.habits || []).map(h => `
    <div class="flex items-center gap-2 py-1 text-sm">
      <span class="w-1.5 h-1.5 rounded-full ${h.type === 'execute' ? 'bg-success' : 'bg-danger'} flex-shrink-0"></span>
      <span class="text-gray-300">${escHtml(h.title)}</span>
      <span class="text-xs text-gray-500 ml-auto">${h.type}</span>
    </div>
  `).join('');

  return `
    <div class="bg-dark-card rounded-lg border border-dark-border p-3" id="wg-${wg.id}">
      <div class="flex items-center gap-3">
        <div class="checkbox-custom ${wg.completed ? 'checked' : ''}" onclick="toggleWeeklyGoal(${wg.id}, ${wg.completed})">
          ${wg.completed ? '<i class="fas fa-check text-xs"></i>' : ''}
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">WK ${wg.week_number}</span>
            <span class="text-sm font-medium ${wg.completed ? 'line-through text-gray-500' : ''}">${escHtml(wg.title)}</span>
            <div class="flex gap-1 ml-auto">
              <button onclick="showAddHabit(${wg.id})" class="btn btn-secondary btn-xs"><i class="fas fa-plus"></i> Habit</button>
              <button onclick="deleteWeeklyGoal(${wg.id})" class="btn btn-danger btn-xs"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
      ${wg.habits?.length > 0 ? `<div class="mt-2 pl-10 border-t border-dark-border pt-2">${habitsHtml}</div>` : ''}
    </div>
  `;
}

function toggleGoalNode(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('hidden');
  const nodeId = id.replace('qg-body-', 'qg-chevron-').replace('mg-body-', 'mg-chevron-');
  const chevron = document.getElementById(nodeId);
  if (chevron) chevron.classList.toggle('open');
}

async function toggleWeeklyGoal(id, current) {
  try {
    await api('PATCH', `/goals/weekly/${id}`, { completed: !current });
    toast(!current ? 'Goal completed! 🎉' : 'Goal unchecked', !current ? 'success' : 'info');
    await renderGoalsPage();
    updateScoreBadge();
  } catch (e) { toast(e.message, 'error'); }
}

// Add goal modals
function showAddQuarterGoal() {
  showModal(`
    <div class="p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-lg font-bold">Add 12-Week Goal</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form onsubmit="handleAddQuarterGoal(event)" class="space-y-4">
        <div>
          <label class="form-label">Goal Title *</label>
          <input id="qg-title" class="form-input" placeholder="e.g. Launch my SaaS product" required autofocus>
        </div>
        <div>
          <label class="form-label">Description</label>
          <textarea id="qg-desc" class="form-input" rows="2" placeholder="Describe what success looks like..."></textarea>
        </div>
        <div id="qg-error" class="text-danger text-sm hidden"></div>
        <div class="flex gap-3">
          <button type="submit" class="btn btn-primary flex-1">Add Goal</button>
          <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `);
}

async function handleAddQuarterGoal(e) {
  e.preventDefault();
  const errEl = document.getElementById('qg-error');
  errEl.classList.add('hidden');
  try {
    await api('POST', '/goals/quarter', {
      cycle_id: State.activeCycle.id,
      title: document.getElementById('qg-title').value.trim(),
      description: document.getElementById('qg-desc').value.trim()
    });
    closeModal();
    toast('12-Week goal added!', 'success');
    await renderGoalsPage();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  }
}

function showEditQuarterGoal(id, title, desc) {
  showModal(`
    <div class="p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-lg font-bold">Edit 12-Week Goal</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form onsubmit="handleEditQuarterGoal(event, ${id})" class="space-y-4">
        <div><label class="form-label">Title</label><input id="eq-title" class="form-input" value="${title}" required></div>
        <div><label class="form-label">Description</label><textarea id="eq-desc" class="form-input" rows="2">${desc}</textarea></div>
        <div class="flex gap-3">
          <button type="submit" class="btn btn-primary flex-1">Save</button>
          <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `);
}

async function handleEditQuarterGoal(e, id) {
  e.preventDefault();
  try {
    await api('PATCH', `/goals/quarter/${id}`, {
      title: document.getElementById('eq-title').value,
      description: document.getElementById('eq-desc').value
    });
    closeModal();
    toast('Goal updated!', 'success');
    await renderGoalsPage();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteQuarterGoal(id) {
  if (!confirm('Delete this goal and all its sub-goals?')) return;
  try {
    await api('DELETE', `/goals/quarter/${id}`);
    toast('Goal deleted', 'info');
    await renderGoalsPage();
  } catch (e) { toast(e.message, 'error'); }
}

function showAddMonthlyGoal(qgId) {
  showModal(`
    <div class="p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-lg font-bold">Add Monthly Goal</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form onsubmit="handleAddMonthlyGoal(event, ${qgId})" class="space-y-4">
        <div><label class="form-label">Goal Title *</label><input id="mg-title" class="form-input" placeholder="e.g. Complete landing page" required autofocus></div>
        <div>
          <label class="form-label">Month Number *</label>
          <select id="mg-month" class="form-input">
            <option value="1">Month 1</option>
            <option value="2">Month 2</option>
            <option value="3">Month 3</option>
          </select>
        </div>
        <div id="mg-error" class="text-danger text-sm hidden"></div>
        <div class="flex gap-3">
          <button type="submit" class="btn btn-primary flex-1">Add</button>
          <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `);
}

async function handleAddMonthlyGoal(e, qgId) {
  e.preventDefault();
  const errEl = document.getElementById('mg-error');
  errEl.classList.add('hidden');
  try {
    await api('POST', '/goals/monthly', {
      quarter_goal_id: qgId,
      title: document.getElementById('mg-title').value.trim(),
      month_number: parseInt(document.getElementById('mg-month').value)
    });
    closeModal();
    toast('Monthly goal added!', 'success');
    await renderGoalsPage();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  }
}

async function deleteMonthlyGoal(id) {
  if (!confirm('Delete this monthly goal and its weekly goals?')) return;
  try {
    await api('DELETE', `/goals/monthly/${id}`);
    toast('Monthly goal deleted', 'info');
    await renderGoalsPage();
  } catch (e) { toast(e.message, 'error'); }
}

function showAddWeeklyGoal(mgId) {
  showModal(`
    <div class="p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-lg font-bold">Add Weekly Goal</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form onsubmit="handleAddWeeklyGoal(event, ${mgId})" class="space-y-4">
        <div><label class="form-label">Goal Title *</label><input id="wg-title" class="form-input" placeholder="e.g. Write 5 blog posts" required autofocus></div>
        <div>
          <label class="form-label">Week Number *</label>
          <select id="wg-week" class="form-input">
            ${Array.from({length:12}, (_,i) => `<option value="${i+1}">Week ${i+1}</option>`).join('')}
          </select>
        </div>
        <div id="wg-error" class="text-danger text-sm hidden"></div>
        <div class="flex gap-3">
          <button type="submit" class="btn btn-primary flex-1">Add</button>
          <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `);
}

async function handleAddWeeklyGoal(e, mgId) {
  e.preventDefault();
  const errEl = document.getElementById('wg-error');
  errEl.classList.add('hidden');
  try {
    await api('POST', '/goals/weekly', {
      monthly_goal_id: mgId,
      title: document.getElementById('wg-title').value.trim(),
      week_number: parseInt(document.getElementById('wg-week').value)
    });
    closeModal();
    toast('Weekly goal added!', 'success');
    await renderGoalsPage();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  }
}

async function deleteWeeklyGoal(id) {
  if (!confirm('Delete this weekly goal?')) return;
  try {
    await api('DELETE', `/goals/weekly/${id}`);
    toast('Weekly goal deleted', 'info');
    await renderGoalsPage();
  } catch (e) { toast(e.message, 'error'); }
}

function showAddHabit(weeklyGoalId = null) {
  showModal(`
    <div class="p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-lg font-bold">Add Habit</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form onsubmit="handleAddHabit(event, ${weeklyGoalId})" class="space-y-4">
        <div><label class="form-label">Habit Title *</label><input id="h-title" class="form-input" placeholder="e.g. Exercise 30 min" required autofocus></div>
        <div>
          <label class="form-label">Type</label>
          <select id="h-type" class="form-input">
            <option value="execute">Execute (do this)</option>
            <option value="avoid">Avoid (don't do this)</option>
          </select>
        </div>
        <div>
          <label class="form-label">Target Days</label>
          <div class="grid grid-cols-7 gap-1" id="target-days-picker">
            ${['S','M','T','W','T','F','S'].map((d,i) => `
              <label class="flex flex-col items-center gap-1 cursor-pointer">
                <input type="checkbox" value="${i+1}" checked class="hidden day-check">
                <div class="day-btn w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition bg-primary text-white" onclick="toggleDayBtn(this)">${d}</div>
              </label>
            `).join('')}
          </div>
        </div>
        <div id="h-error" class="text-danger text-sm hidden"></div>
        <div class="flex gap-3">
          <button type="submit" class="btn btn-primary flex-1">Add Habit</button>
          <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `);
}

function toggleDayBtn(btn) {
  btn.classList.toggle('bg-primary');
  btn.classList.toggle('text-white');
  btn.classList.toggle('bg-dark-border');
  btn.classList.toggle('text-gray-400');
}

async function handleAddHabit(e, weeklyGoalId) {
  e.preventDefault();
  const errEl = document.getElementById('h-error');
  errEl.classList.add('hidden');
  try {
    const activeDays = Array.from(document.querySelectorAll('.day-btn.bg-primary')).map(btn => {
      const label = btn.closest('label');
      return label.querySelector('input').value;
    });
    if (activeDays.length === 0) { errEl.textContent = 'Select at least one day'; errEl.classList.remove('hidden'); return; }

    await api('POST', '/habits', {
      weekly_goal_id: weeklyGoalId,
      title: document.getElementById('h-title').value.trim(),
      type: document.getElementById('h-type').value,
      target_days: activeDays.join(',')
    });
    closeModal();
    toast('Habit added!', 'success');
    if (State.currentPage === 'habits') await renderHabitsPage();
    else if (State.currentPage === 'goals') await renderGoalsPage();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  }
}

// ─── PYRAMID VIEW ──────────────────────────────────────────────
async function renderPyramidPage() {
  const el = document.getElementById('pyramid-content');

  if (!State.activeCycle) {
    el.innerHTML = `<div class="card text-center py-12"><p class="text-gray-400">No active cycle. <a href="#" onclick="navigate('cycle')" class="text-primary underline">Create one</a></p></div>`;
    return;
  }

  el.innerHTML = '<div class="text-gray-400 text-sm">Loading pyramid...</div>';

  try {
    const [treeData, habitsData] = await Promise.all([
      api('GET', `/goals/tree?cycle_id=${State.activeCycle.id}`),
      api('GET', '/habits')
    ]);

    const tree = treeData.tree || [];
    const habits = habitsData.habits || [];

    // Count items
    const monthlyGoals = tree.flatMap(q => q.monthly_goals || []);
    const weeklyGoals = monthlyGoals.flatMap(m => m.weekly_goals || []);

    el.innerHTML = `
      <div class="fade-in max-w-2xl mx-auto">
        <div class="text-center mb-8">
          <h2 class="text-xl font-bold">Execution Pyramid</h2>
          <p class="text-sm text-gray-400 mt-1">Daily habits drive long-term outcomes</p>
        </div>

        <!-- Pyramid — TOP is Daily Habits, BOTTOM is Cycle -->
        <div class="space-y-1">

          <!-- Daily Habits (top, narrowest) -->
          <div class="pyramid-layer">
            <div class="pyramid-block w-48 bg-gradient-to-b from-purple-900/50 to-purple-800/30 border-purple-700/30" onclick="navigate('habits')">
              <div class="text-2xl font-black text-purple-300">${habits.length}</div>
              <div class="text-xs font-bold text-purple-300 uppercase tracking-wide">Daily Habits</div>
              <div class="text-xs text-purple-400 mt-1">Execution Layer</div>
            </div>
          </div>

          <!-- Weekly Goals -->
          <div class="pyramid-layer">
            <div class="pyramid-block w-72 bg-gradient-to-b from-blue-900/50 to-blue-800/30 border-blue-700/30" onclick="navigate('goals')">
              <div class="text-2xl font-black text-blue-300">${weeklyGoals.length}</div>
              <div class="text-xs font-bold text-blue-300 uppercase tracking-wide">Weekly Goals</div>
              <div class="text-xs text-blue-400 mt-1">${weeklyGoals.filter(w => w.completed).length} completed</div>
            </div>
          </div>

          <!-- Monthly Goals -->
          <div class="pyramid-layer">
            <div class="pyramid-block w-96 bg-gradient-to-b from-green-900/50 to-green-800/30 border-green-700/30" onclick="navigate('goals')">
              <div class="text-2xl font-black text-green-300">${monthlyGoals.length}</div>
              <div class="text-xs font-bold text-green-300 uppercase tracking-wide">Monthly Goals</div>
              <div class="text-xs text-green-400 mt-1">3-month milestones</div>
            </div>
          </div>

          <!-- 12-Week Goals -->
          <div class="pyramid-layer">
            <div class="pyramid-block bg-gradient-to-b from-yellow-900/50 to-yellow-800/30 border-yellow-700/30" style="width: 28rem" onclick="navigate('goals')">
              <div class="text-2xl font-black text-yellow-300">${tree.length}/3</div>
              <div class="text-xs font-bold text-yellow-300 uppercase tracking-wide">12-Week Goals</div>
              <div class="text-xs text-yellow-400 mt-1">Quarterly objectives</div>
            </div>
          </div>

          <!-- 12-Week Cycle (bottom, widest) -->
          <div class="pyramid-layer">
            <div class="pyramid-block w-full max-w-xl bg-gradient-to-b from-primary/30 to-primary/10 border-primary/30" onclick="navigate('cycle')">
              <div class="text-2xl font-black text-primary">${escHtml(State.activeCycle.title)}</div>
              <div class="text-xs font-bold text-primary-light uppercase tracking-wide mt-1">12-Week Cycle Foundation</div>
              ${State.activeCycle.vision ? `<div class="text-xs text-gray-400 mt-1 italic">"${escHtml(State.activeCycle.vision)}"</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Arrow annotations -->
        <div class="mt-6 flex items-center gap-2 text-xs text-gray-500 justify-center">
          <i class="fas fa-arrow-up text-primary"></i>
          <span>Daily habits fuel weekly goals → monthly milestones → 12-week goals → cycle vision</span>
        </div>

        <!-- Goal breakdown cards -->
        ${tree.length > 0 ? `
          <div class="mt-8 space-y-4">
            <h3 class="font-semibold text-sm text-gray-300 uppercase tracking-wide">Goal Breakdown</h3>
            ${tree.map(qg => `
              <div class="card-sm">
                <div class="flex justify-between items-center mb-2">
                  <span class="font-semibold text-sm">${escHtml(qg.title)}</span>
                  <span class="text-xs text-gray-400">${Math.round(qg.progress)}%</span>
                </div>
                <div class="progress-bar mb-2"><div class="progress-fill" style="width:${qg.progress}%"></div></div>
                <div class="flex gap-3 text-xs text-gray-500">
                  <span>${(qg.monthly_goals || []).length} monthly</span>
                  <span>${(qg.monthly_goals || []).flatMap(m => m.weekly_goals || []).length} weekly</span>
                  <span>${(qg.monthly_goals || []).flatMap(m => m.weekly_goals || []).flatMap(w => w.habits || []).length} habits</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
  }
}

// ─── HABIT TRACKER ─────────────────────────────────────────────
async function renderHabitsPage() {
  const el = document.getElementById('habits-content');
  el.innerHTML = '<div class="text-gray-400 text-sm">Loading habits...</div>';

  try {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    const data = await api('GET', `/habits/grid?start=${weekStart}&end=${weekEnd}`);
    State.habits = data.habits || [];
    const logMap = data.logs || {};

    // Generate date columns for this week
    const dates = [];
    let d = new Date(weekStart + 'T12:00:00');
    const endD = new Date(weekEnd + 'T12:00:00');
    while (d <= endD) {
      dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    el.innerHTML = `
      <div class="fade-in">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold">Habit Tracker</h2>
            <p class="text-sm text-gray-400 mt-1">Week of ${formatDate(weekStart)}</p>
          </div>
          <button onclick="showAddHabit()" class="btn btn-primary"><i class="fas fa-plus"></i> Add Habit</button>
        </div>

        ${State.habits.length === 0 ? `
          <div class="card text-center py-12">
            <i class="fas fa-check-double text-gray-600 text-4xl mb-4"></i>
            <h3 class="text-lg font-semibold mb-2">No habits yet</h3>
            <p class="text-gray-400 text-sm mb-4">Add habits to track your daily execution</p>
            <button onclick="showAddHabit()" class="btn btn-primary">Add First Habit</button>
          </div>
        ` : `
          <div class="card">
            <div class="habit-grid-container">
              <table class="habit-grid w-full">
                <thead>
                  <tr>
                    <th class="text-left pl-0 pb-2 w-48">Habit</th>
                    <th class="text-center pb-2 w-16">Type</th>
                    ${dates.map(d => {
                      const isToday = d === today;
                      const dayIdx = new Date(d + 'T12:00:00').getDay();
                      return `<th class="${isToday ? 'text-primary font-bold' : ''}" style="width:36px">${dayNames[dayIdx]}<br><span class="text-gray-500" style="font-size:9px">${d.slice(5)}</span></th>`;
                    }).join('')}
                    <th class="text-center pb-2">Score</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${State.habits.map(h => {
                    const targetDays = (h.target_days || '1,2,3,4,5,6,7').split(',').map(Number);
                    let completed = 0, applicable = 0;
                    const cells = dates.map(d => {
                      const dayIdx = new Date(d + 'T12:00:00').getDay() + 1;
                      if (!targetDays.includes(dayIdx)) {
                        return `<td><div class="habit-cell" style="opacity:0.2;cursor:default">—</div></td>`;
                      }
                      applicable++;
                      const done = logMap[h.id]?.[d] === true;
                      const isSuccess = (h.type === 'execute' && done) || (h.type === 'avoid' && !done && d <= today);
                      if (d <= today) {
                        if (h.type === 'execute' && done) completed++;
                        if (h.type === 'avoid' && !done) completed++;
                      }
                      const cellClass = d > today ? '' : (h.type === 'execute' ? (done ? 'done-execute' : 'failed') : (!done ? 'done-avoid' : 'failed'));
                      return `<td><div class="habit-cell ${cellClass}" onclick="toggleHabitLog(${h.id}, '${d}', ${done})">${done ? (h.type === 'execute' ? '✓' : '✗') : (d <= today ? (h.type === 'execute' ? '' : '✓') : '')}</div></td>`;
                    }).join('');
                    const score = applicable > 0 ? Math.round((completed / Math.min(applicable, dates.filter(d => d <= today).length || 1)) * 100) : 0;
                    return `
                      <tr>
                        <td class="py-1 pr-3"><span class="text-sm font-medium">${escHtml(h.title)}</span></td>
                        <td class="text-center"><span class="text-xs px-1.5 py-0.5 rounded ${h.type === 'execute' ? 'bg-primary/20 text-primary-light' : 'bg-danger/20 text-danger'}">${h.type === 'execute' ? 'DO' : 'AVOID'}</span></td>
                        ${cells}
                        <td class="text-center text-xs font-bold ${score >= 80 ? 'text-success' : score >= 60 ? 'text-accent' : 'text-danger'}">${score}%</td>
                        <td class="pl-2">
                          <button onclick="deleteHabit(${h.id})" class="text-gray-600 hover:text-danger transition text-xs"><i class="fas fa-trash"></i></button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-4 flex gap-4 text-xs text-gray-500">
            <div class="flex items-center gap-1"><div class="w-4 h-4 rounded habit-cell done-execute"></div> Completed</div>
            <div class="flex items-center gap-1"><div class="w-4 h-4 rounded habit-cell failed"></div> Missed</div>
            <div class="flex items-center gap-1"><div class="w-4 h-4 rounded border border-dark-border bg-dark opacity-40"></div> Future / N/A</div>
          </div>
        `}
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
  }
}

async function toggleHabitLog(habitId, date, currentDone) {
  try {
    await api('POST', '/habits/log', { habit_id: habitId, log_date: date, completed: !currentDone });
    await renderHabitsPage();
    updateScoreBadge();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteHabit(id) {
  if (!confirm('Delete this habit?')) return;
  try {
    await api('DELETE', `/habits/${id}`);
    toast('Habit deleted', 'info');
    await renderHabitsPage();
  } catch (e) { toast(e.message, 'error'); }
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getWeekEnd() {
  const d = new Date(getWeekStart() + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}

// ─── TIME BLOCKING ─────────────────────────────────────────────
async function renderCalendarPage() {
  const el = document.getElementById('calendar-content');
  el.innerHTML = '<div class="text-gray-400 text-sm">Loading calendar...</div>';

  try {
    const date = State.calendarDate;
    const data = await api('GET', `/time-blocks?date=${date}`);
    const blocks = data.blocks || [];

    // Build 24h grid
    const hours = Array.from({ length: 24 }, (_, i) => i);

    el.innerHTML = `
      <div class="fade-in">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold">Time Blocking</h2>
            <p class="text-sm text-gray-400 mt-1">${formatDate(date)}</p>
          </div>
          <div class="flex items-center gap-3">
            <input type="date" value="${date}" onchange="changeCalendarDate(this.value)" class="form-input text-sm" style="width:auto">
            <button onclick="showAddTimeBlock()" class="btn btn-primary"><i class="fas fa-plus"></i> Add Block</button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Calendar grid -->
          <div class="lg:col-span-2 card p-0 overflow-hidden">
            <div class="time-grid relative" style="min-height:1152px">
              ${hours.map(h => {
                const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`;
                return `
                  <div class="time-slot" style="top:${h*48}px;position:absolute;width:100%">
                    <div class="time-label">${label}</div>
                    <div class="time-area" onclick="showAddTimeBlockAt('${h.toString().padStart(2,'0')}:00')"></div>
                  </div>
                `;
              }).join('')}
              <!-- Render blocks -->
              ${blocks.map(b => {
                const [sh, sm] = b.start_time.split(':').map(Number);
                const [eh, em] = b.end_time.split(':').map(Number);
                const top = sh * 48 + sm * 0.8;
                const height = Math.max(24, (eh * 48 + em * 0.8) - top);
                return `
                  <div class="time-block-event" 
                    style="top:${top}px;height:${height}px;background:${b.color}20;color:${b.color};border-color:${b.color}60;left:68px;right:8px"
                    onclick="showEditTimeBlock(${b.id}, '${escHtml(b.title)}', '${b.start_time}', '${b.end_time}', '${b.color}')">
                    <div class="font-semibold truncate">${escHtml(b.title)}</div>
                    <div style="font-size:10px;opacity:0.8">${b.start_time} – ${b.end_time}</div>
                  </div>
                `;
              }).join('')}
              <!-- Current time indicator -->
              <div id="time-line" class="absolute left-0 right-0 h-0.5 bg-danger z-10 pointer-events-none" style="top:${getCurrentTimePx()}px">
                <div class="w-2 h-2 rounded-full bg-danger -mt-0.5 -ml-1"></div>
              </div>
            </div>
          </div>

          <!-- Blocks list -->
          <div class="space-y-3">
            <div class="card-sm">
              <h3 class="font-semibold text-sm mb-3">Today's Blocks (${blocks.length})</h3>
              ${blocks.length === 0 ? '<p class="text-gray-400 text-xs">No blocks yet. Click on the calendar or use "Add Block"</p>' :
                blocks.map(b => `
                  <div class="flex items-center gap-3 py-2 border-b border-dark-border last:border-0">
                    <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${b.color}"></div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium truncate">${escHtml(b.title)}</div>
                      <div class="text-xs text-gray-400">${b.start_time} – ${b.end_time}</div>
                    </div>
                    <button onclick="deleteTimeBlock(${b.id})" class="text-gray-600 hover:text-danger text-xs flex-shrink-0"><i class="fas fa-trash"></i></button>
                  </div>
                `).join('')}
            </div>
            <div class="card-sm">
              <h3 class="font-semibold text-sm mb-2">Time Used</h3>
              ${(() => {
                const totalMin = blocks.reduce((s, b) => {
                  const [sh, sm] = b.start_time.split(':').map(Number);
                  const [eh, em] = b.end_time.split(':').map(Number);
                  return s + (eh * 60 + em) - (sh * 60 + sm);
                }, 0);
                const pct = Math.round((totalMin / 1440) * 100);
                return `
                  <div class="text-2xl font-bold">${Math.floor(totalMin/60)}h ${totalMin%60}m</div>
                  <div class="progress-bar mt-2"><div class="progress-fill" style="width:${pct}%"></div></div>
                  <div class="text-xs text-gray-400 mt-1">${pct}% of day blocked</div>
                `;
              })()}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
  }
}

function getCurrentTimePx() {
  const now = new Date();
  return now.getHours() * 48 + Math.floor(now.getMinutes() * 0.8);
}

function changeCalendarDate(date) {
  State.calendarDate = date;
  renderCalendarPage();
}

function showAddTimeBlock(prefillTime = '') {
  showModal(`
    <div class="p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-lg font-bold">Add Time Block</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form onsubmit="handleAddTimeBlock(event)" class="space-y-4">
        <div><label class="form-label">Title *</label><input id="tb-title" class="form-input" placeholder="e.g. Deep Work — Project X" required autofocus></div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Start Time *</label>
            <input id="tb-start" type="time" class="form-input" value="${prefillTime || '09:00'}" required>
          </div>
          <div>
            <label class="form-label">End Time *</label>
            <input id="tb-end" type="time" class="form-input" value="${prefillTime ? String(parseInt(prefillTime.split(':')[0])+1).padStart(2,'0') + ':00' : '10:00'}" required>
          </div>
        </div>
        <div>
          <label class="form-label">Color</label>
          <div class="flex gap-2">
            ${['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899'].map(c => `
              <div onclick="selectColor('${c}', this)" 
                class="color-swatch w-8 h-8 rounded-lg cursor-pointer border-2 transition ${c === '#4F46E5' ? 'border-white scale-110' : 'border-transparent'}" 
                style="background:${c}" data-color="${c}"></div>
            `).join('')}
          </div>
          <input type="hidden" id="tb-color" value="#4F46E5">
        </div>
        <div id="tb-error" class="text-danger text-sm hidden"></div>
        <div class="flex gap-3">
          <button type="submit" class="btn btn-primary flex-1">Add Block</button>
          <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `);
}

function showAddTimeBlockAt(time) {
  showAddTimeBlock(time);
}

function selectColor(color, el) {
  document.getElementById('tb-color').value = color;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('border-white', 'scale-110'));
  el.classList.add('border-white', 'scale-110');
}

async function handleAddTimeBlock(e) {
  e.preventDefault();
  const errEl = document.getElementById('tb-error');
  errEl.classList.add('hidden');
  try {
    await api('POST', '/time-blocks', {
      title: document.getElementById('tb-title').value.trim(),
      date: State.calendarDate,
      start_time: document.getElementById('tb-start').value,
      end_time: document.getElementById('tb-end').value,
      color: document.getElementById('tb-color').value
    });
    closeModal();
    toast('Time block added!', 'success');
    await renderCalendarPage();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  }
}

function showEditTimeBlock(id, title, start, end, color) {
  showModal(`
    <div class="p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-lg font-bold">Edit Time Block</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form onsubmit="handleEditTimeBlock(event, ${id})" class="space-y-4">
        <div><label class="form-label">Title</label><input id="etb-title" class="form-input" value="${title}" required></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="form-label">Start</label><input id="etb-start" type="time" class="form-input" value="${start}"></div>
          <div><label class="form-label">End</label><input id="etb-end" type="time" class="form-input" value="${end}"></div>
        </div>
        <div class="flex gap-3">
          <button type="submit" class="btn btn-primary flex-1">Save</button>
          <button type="button" onclick="deleteTimeBlock(${id})" class="btn btn-danger">Delete</button>
          <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `);
}

async function handleEditTimeBlock(e, id) {
  e.preventDefault();
  try {
    await api('PATCH', `/time-blocks/${id}`, {
      title: document.getElementById('etb-title').value,
      start_time: document.getElementById('etb-start').value,
      end_time: document.getElementById('etb-end').value
    });
    closeModal();
    toast('Block updated!', 'success');
    await renderCalendarPage();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteTimeBlock(id) {
  closeModal();
  try {
    await api('DELETE', `/time-blocks/${id}`);
    toast('Block deleted', 'info');
    await renderCalendarPage();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── SCORES ─────────────────────────────────────────────────────
async function renderScoresPage() {
  const el = document.getElementById('scores-content');
  el.innerHTML = '<div class="text-gray-400 text-sm">Loading scores...</div>';

  try {
    const today = new Date().toISOString().split('T')[0];
    const wStart = getWeekStart();
    const wEnd = getWeekEnd();

    const [daily, weekly, history] = await Promise.allSettled([
      api('GET', `/scores/daily?date=${today}`),
      api('GET', `/scores/weekly?week_start=${wStart}&week_end=${wEnd}`),
      api('GET', '/scores/history?days=30')
    ]);

    const d = daily.status === 'fulfilled' ? daily.value : { total_score: 0, goals_score: 0, habits_score: 0, grade: 'F' };
    const w = weekly.status === 'fulfilled' ? weekly.value : { total: 0, weekly_goals: 0, daily_avg: 0, habits_avg: 0, grade: 'F' };
    const hist = history.status === 'fulfilled' ? history.value.history : [];

    const gradeColor = { A: '#10B981', B: '#3B82F6', C: '#F59E0B', D: '#F97316', F: '#EF4444' };

    el.innerHTML = `
      <div class="fade-in">
        <h2 class="text-xl font-bold mb-6">Performance Scores</h2>

        <!-- Today + Week -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="card">
            <div class="flex justify-between items-start mb-4">
              <div>
                <div class="text-xs text-gray-400 uppercase tracking-wide">Today</div>
                <div class="text-xs text-gray-500">${formatDate(today)}</div>
              </div>
              <span class="text-4xl font-black px-3 py-1 rounded-xl grade-${d.grade}">${d.grade}</span>
            </div>
            <div class="text-4xl font-black mb-4" style="color:${gradeColor[d.grade]}">${Math.round(d.total_score)}%</div>
            <div class="space-y-3">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">Goals (60%)</span>
                  <span>${Math.round(d.goals_score)}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${d.goals_score}%"></div></div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">Habits (40%)</span>
                  <span>${Math.round(d.habits_score)}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${d.habits_score}%;background:linear-gradient(90deg,#10B981,#6EE7B7)"></div></div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="flex justify-between items-start mb-4">
              <div>
                <div class="text-xs text-gray-400 uppercase tracking-wide">This Week</div>
                <div class="text-xs text-gray-500">${wStart} – ${wEnd}</div>
              </div>
              <span class="text-4xl font-black px-3 py-1 rounded-xl grade-${w.grade}">${w.grade}</span>
            </div>
            <div class="text-4xl font-black mb-4" style="color:${gradeColor[w.grade]}">${Math.round(w.total)}%</div>
            <div class="space-y-3">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">Weekly Goals (40%)</span>
                  <span>${Math.round(w.weekly_goals)}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${w.weekly_goals}%"></div></div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">Daily Goals (30%)</span>
                  <span>${Math.round(w.daily_avg)}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${w.daily_avg}%"></div></div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">Habits (30%)</span>
                  <span>${Math.round(w.habits_avg)}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${w.habits_avg}%;background:linear-gradient(90deg,#10B981,#6EE7B7)"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Grade scale -->
        <div class="card mb-4">
          <h3 class="font-semibold text-sm mb-3">Grade Scale</h3>
          <div class="flex gap-3">
            ${[['A','90+','#10B981'],['B','80-89','#3B82F6'],['C','70-79','#F59E0B'],['D','60-69','#F97316'],['F','<60','#EF4444']].map(([g,r,c]) => `
              <div class="flex-1 text-center p-3 rounded-xl" style="background:${c}15;border:1px solid ${c}30">
                <div class="text-xl font-black" style="color:${c}">${g}</div>
                <div class="text-xs text-gray-400">${r}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- History -->
        ${hist.length > 0 ? `
          <div class="card">
            <h3 class="font-semibold mb-3">30-Day History</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-gray-400 text-xs">
                    <th class="pb-2">Date</th>
                    <th class="pb-2 text-center">Grade</th>
                    <th class="pb-2 text-center">Total</th>
                    <th class="pb-2 text-center">Goals</th>
                    <th class="pb-2 text-center">Habits</th>
                  </tr>
                </thead>
                <tbody>
                  ${hist.map(h => `
                    <tr class="border-t border-dark-border">
                      <td class="py-2 text-gray-300">${h.score_date}</td>
                      <td class="py-2 text-center"><span class="grade-${h.grade} px-2 py-0.5 rounded text-xs font-bold">${h.grade}</span></td>
                      <td class="py-2 text-center font-semibold" style="color:${gradeColor[h.grade]}">${Math.round(h.total_score)}%</td>
                      <td class="py-2 text-center text-gray-300">${Math.round(h.goals_score)}%</td>
                      <td class="py-2 text-center text-gray-300">${Math.round(h.habits_score)}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : `<div class="card text-center py-8 text-gray-400 text-sm">Score history will appear here as you track daily</div>`}
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
  }
}

// ─── ACCOUNTABILITY ────────────────────────────────────────────
async function renderAccountabilityPage() {
  const el = document.getElementById('accountability-content');
  el.innerHTML = '<div class="text-gray-400 text-sm">Loading...</div>';

  try {
    const [partnersData, leaderboardData] = await Promise.all([
      api('GET', '/accountability/partners'),
      api('GET', '/accountability/leaderboard')
    ]);

    const { sent, received } = partnersData;
    const { leaderboard } = leaderboardData;

    el.innerHTML = `
      <div class="fade-in">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">Accountability</h2>
          <button onclick="showInvitePartner()" class="btn btn-primary"><i class="fas fa-user-plus"></i> Invite Partner</button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <!-- Partners -->
          <div class="card">
            <h3 class="font-semibold mb-3">Your Partners</h3>
            ${(sent || []).filter(p => p.status === 'accepted').length === 0 && (received || []).filter(p => p.status === 'accepted').length === 0 ? `
              <div class="text-center py-6">
                <i class="fas fa-users text-gray-600 text-3xl mb-2"></i>
                <p class="text-gray-400 text-sm">No accountability partners yet</p>
                <p class="text-xs text-gray-500 mt-1">Invite someone to keep each other accountable</p>
              </div>
            ` : `
              <div class="space-y-2">
                ${(sent || []).filter(p => p.status === 'accepted').map(p => `
                  <div class="flex items-center gap-3 p-2 rounded-lg bg-dark">
                    <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">${p.partner_name[0]}</div>
                    <div><div class="text-sm font-medium">${escHtml(p.partner_name)}</div><div class="text-xs text-gray-400">${p.partner_email}</div></div>
                    <span class="ml-auto text-xs text-success">Partner</span>
                  </div>
                `).join('')}
                ${(received || []).filter(p => p.status === 'accepted').map(p => `
                  <div class="flex items-center gap-3 p-2 rounded-lg bg-dark">
                    <div class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">${p.sender_name[0]}</div>
                    <div><div class="text-sm font-medium">${escHtml(p.sender_name)}</div><div class="text-xs text-gray-400">${p.sender_email}</div></div>
                    <span class="ml-auto text-xs text-success">Partner</span>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Pending Invites -->
          <div class="card">
            <h3 class="font-semibold mb-3">Pending Invites</h3>
            ${[...(sent || []).filter(p => p.status === 'pending'), ...(received || []).filter(p => p.status === 'pending')].length === 0 ? `
              <p class="text-gray-400 text-sm">No pending invites</p>
            ` : `
              ${(sent || []).filter(p => p.status === 'pending').map(p => `
                <div class="flex items-center gap-3 p-2 rounded-lg bg-dark mb-2">
                  <div class="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center text-gray-400 text-sm">${p.partner_name[0]}</div>
                  <div class="flex-1">
                    <div class="text-sm">${escHtml(p.partner_name)}</div>
                    <div class="text-xs text-gray-400">Sent invite</div>
                  </div>
                  <span class="text-xs text-accent">Pending</span>
                </div>
              `).join('')}
              ${(received || []).filter(p => p.status === 'pending').map(p => `
                <div class="flex items-center gap-3 p-2 rounded-lg bg-dark mb-2">
                  <div class="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center text-gray-400 text-sm">${p.sender_name[0]}</div>
                  <div class="flex-1">
                    <div class="text-sm">${escHtml(p.sender_name)}</div>
                    <div class="text-xs text-gray-400">Wants to partner with you</div>
                  </div>
                  <div class="flex gap-2">
                    <button onclick="respondToInvite(${p.id}, 'accepted')" class="btn btn-primary btn-xs">Accept</button>
                    <button onclick="respondToInvite(${p.id}, 'declined')" class="btn btn-danger btn-xs">Decline</button>
                  </div>
                </div>
              `).join('')}
            `}
          </div>
        </div>

        <!-- Leaderboard -->
        <div class="card">
          <h3 class="font-semibold mb-4">Leaderboard</h3>
          ${leaderboard.length === 0 ? `<p class="text-gray-400 text-sm">Leaderboard will show you and your partners' scores</p>` : `
            <div class="space-y-2">
              ${leaderboard.map((entry, i) => `
                <div class="flex items-center gap-3 p-3 rounded-xl ${entry.is_me ? 'bg-primary/10 border border-primary/30' : 'bg-dark'}">
                  <div class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black ${i === 0 ? 'bg-accent text-dark' : i === 1 ? 'bg-gray-400 text-dark' : i === 2 ? 'bg-amber-700 text-white' : 'bg-dark-border text-gray-400'}">${i+1}</div>
                  <div class="flex-1">
                    <div class="text-sm font-semibold">${escHtml(entry.name)} ${entry.is_me ? '<span class="text-xs text-primary-light">(you)</span>' : ''}</div>
                    <div class="text-xs text-gray-400">${entry.days_tracked} days tracked</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-sm">${entry.avg_score}%</div>
                    <div class="text-xs text-gray-400">avg</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-sm text-accent">${entry.best_score}%</div>
                    <div class="text-xs text-gray-400">best</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
  }
}

function showInvitePartner() {
  showModal(`
    <div class="p-6">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-lg font-bold">Invite Accountability Partner</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <p class="text-sm text-gray-400 mb-4">Enter their email address. They must have a 4 Quarters account.</p>
      <form onsubmit="handleInvitePartner(event)" class="space-y-4">
        <div><label class="form-label">Partner Email</label><input id="partner-email" type="email" class="form-input" placeholder="partner@example.com" required autofocus></div>
        <div id="invite-error" class="text-danger text-sm hidden"></div>
        <div class="flex gap-3">
          <button type="submit" class="btn btn-primary flex-1"><i class="fas fa-paper-plane"></i> Send Invite</button>
          <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `);
}

async function handleInvitePartner(e) {
  e.preventDefault();
  const errEl = document.getElementById('invite-error');
  errEl.classList.add('hidden');
  try {
    const data = await api('POST', '/accountability/invite', { email: document.getElementById('partner-email').value });
    closeModal();
    toast(`Invite sent to ${data.partner.name}!`, 'success');
    await renderAccountabilityPage();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function respondToInvite(id, status) {
  try {
    await api('PATCH', `/accountability/${id}/respond`, { status });
    toast(status === 'accepted' ? 'Partner accepted! 🤝' : 'Invite declined', status === 'accepted' ? 'success' : 'info');
    await renderAccountabilityPage();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── STANDUP ───────────────────────────────────────────────────
async function renderStandupPage() {
  const el = document.getElementById('standup-content');
  el.innerHTML = '<div class="text-gray-400 text-sm">Loading standups...</div>';

  try {
    const today = new Date().toISOString().split('T')[0];
    const data = await api('GET', '/accountability/standups');
    const standups = data.standups || [];
    const todayStandup = standups.find(s => s.standup_date === today);

    el.innerHTML = `
      <div class="fade-in">
        <h2 class="text-xl font-bold mb-6">Daily Standup & Reflection</h2>

        <!-- Today's standup -->
        <div class="card mb-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold">Today — ${formatDate(today)}</h3>
            ${todayStandup ? '<span class="text-xs text-success bg-success/20 px-2 py-0.5 rounded-full">Completed</span>' : '<span class="text-xs text-accent bg-accent/20 px-2 py-0.5 rounded-full">Pending</span>'}
          </div>
          <form onsubmit="handleSubmitStandup(event)" class="space-y-4">
            <div>
              <label class="form-label"><i class="fas fa-check-circle text-success mr-1"></i> What did you accomplish yesterday?</label>
              <textarea id="standup-yesterday" class="form-input" rows="2" placeholder="List your wins from yesterday...">${escHtml(todayStandup?.yesterday || '')}</textarea>
            </div>
            <div>
              <label class="form-label"><i class="fas fa-arrow-right text-primary mr-1"></i> What will you do today?</label>
              <textarea id="standup-today" class="form-input" rows="2" placeholder="Your top 3 priorities for today...">${escHtml(todayStandup?.today || '')}</textarea>
            </div>
            <div>
              <label class="form-label"><i class="fas fa-exclamation-triangle text-accent mr-1"></i> Any blockers?</label>
              <textarea id="standup-blockers" class="form-input" rows="1" placeholder="What's in your way?">${escHtml(todayStandup?.blockers || '')}</textarea>
            </div>
            <div>
              <label class="form-label"><i class="fas fa-brain text-purple-400 mr-1"></i> End-of-day reflection (optional)</label>
              <textarea id="standup-reflection" class="form-input" rows="2" placeholder="What did you learn today? What would you do differently?">${escHtml(todayStandup?.reflection || '')}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> ${todayStandup ? 'Update' : 'Submit'} Standup
            </button>
          </form>
        </div>

        <!-- History -->
        ${standups.filter(s => s.standup_date !== today).length > 0 ? `
          <div class="card">
            <h3 class="font-semibold mb-4">Recent Standups</h3>
            <div class="space-y-3">
              ${standups.filter(s => s.standup_date !== today).slice(0, 7).map(s => `
                <div class="p-3 bg-dark rounded-xl border border-dark-border">
                  <div class="text-xs text-gray-400 mb-2 font-semibold">${formatDate(s.standup_date)}</div>
                  ${s.yesterday ? `<div class="text-sm mb-1"><span class="text-success text-xs">Yesterday: </span>${escHtml(s.yesterday)}</div>` : ''}
                  ${s.today ? `<div class="text-sm mb-1"><span class="text-primary-light text-xs">Today: </span>${escHtml(s.today)}</div>` : ''}
                  ${s.blockers ? `<div class="text-sm mb-1"><span class="text-accent text-xs">Blockers: </span>${escHtml(s.blockers)}</div>` : ''}
                  ${s.reflection ? `<div class="text-sm"><span class="text-purple-400 text-xs">Reflection: </span>${escHtml(s.reflection)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
  }
}

async function handleSubmitStandup(e) {
  e.preventDefault();
  try {
    await api('POST', '/accountability/standup', {
      standup_date: new Date().toISOString().split('T')[0],
      yesterday: document.getElementById('standup-yesterday').value,
      today: document.getElementById('standup-today').value,
      blockers: document.getElementById('standup-blockers').value,
      reflection: document.getElementById('standup-reflection').value
    });
    toast('Standup saved! 💪', 'success');
    await renderStandupPage();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── AI COACH ─────────────────────────────────────────────────
function renderAIPage() {
  const el = document.getElementById('ai-content');
  if (State.messages.length === 0) {
    State.messages = [{
      role: 'assistant',
      content: `Hey ${State.user?.name?.split(' ')[0] || 'there'}! 👊 I'm your 4 Quarters AI Coach — empathetic but firm, data-driven, and 100% focused on your execution.\n\nI can see your actual performance data and will give you real, personalized feedback — no fluff.\n\nWhat do you want to work on today? You can ask me about:\n• Your current scores and what to improve\n• Habit strategies\n• Goal clarity\n• Mindset and motivation\n• Weekly planning`
    }];
  }

  el.innerHTML = `
    <div class="fade-in max-w-2xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-purple-900/50 flex items-center justify-center">
          <i class="fas fa-brain text-purple-400 text-lg"></i>
        </div>
        <div>
          <h2 class="text-xl font-bold">AI Life Coach</h2>
          <p class="text-xs text-gray-400">Empathetic · Data-driven · Accountable</p>
        </div>
        <button onclick="clearChat()" class="ml-auto btn btn-secondary btn-sm"><i class="fas fa-trash"></i> Clear</button>
      </div>

      <!-- Suggested prompts -->
      <div class="flex flex-wrap gap-2 mb-4">
        ${[
          'How are my scores?',
          'Help me plan this week',
          'I\'m struggling with motivation',
          'Review my habit performance',
          'What should I focus on?'
        ].map(p => `<button onclick="sendAIMessage('${p}')" class="text-xs px-3 py-1.5 rounded-full border border-dark-border text-gray-400 hover:text-white hover:border-primary transition">${p}</button>`).join('')}
      </div>

      <!-- Chat area -->
      <div id="ai-chat" class="bg-dark-card border border-dark-border rounded-xl p-4 space-y-4 mb-4" style="min-height:400px;max-height:500px;overflow-y:auto">
        ${State.messages.map(renderAIMessage).join('')}
      </div>

      <!-- Input -->
      <div class="flex gap-3">
        <input id="ai-input" class="form-input flex-1" placeholder="Ask your coach anything..." 
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendAIChatMessage()}">
        <button onclick="sendAIChatMessage()" id="ai-send-btn" class="btn btn-primary">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;
}

function renderAIMessage(msg) {
  const isUser = msg.role === 'user';
  return `
    <div class="ai-message flex gap-3 ${isUser ? 'flex-row-reverse' : ''}">
      <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${isUser ? 'bg-primary/30 text-primary' : 'bg-purple-900/50 text-purple-300'}">
        ${isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-brain"></i>'}
      </div>
      <div class="max-w-sm rounded-xl p-3 text-sm ${isUser ? 'bg-primary/20 text-white' : 'bg-dark text-gray-200'}" style="white-space:pre-wrap;word-wrap:break-word">${escHtml(msg.content)}</div>
    </div>
  `;
}

function clearChat() {
  State.messages = [];
  renderAIPage();
}

async function sendAIMessage(msg) {
  document.getElementById('ai-input').value = msg;
  await sendAIChatMessage();
}

async function sendAIChatMessage() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  const btn = document.getElementById('ai-send-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner spin"></i>';

  State.messages.push({ role: 'user', content: msg });
  
  // Add typing indicator
  State.messages.push({ role: 'assistant', content: '...' });
  const chatEl = document.getElementById('ai-chat');
  chatEl.innerHTML = State.messages.map(renderAIMessage).join('');
  chatEl.scrollTop = chatEl.scrollHeight;

  try {
    const data = await api('POST', '/ai/coach', { message: msg, context_type: 'general' });
    State.messages.pop(); // Remove typing indicator
    State.messages.push({ role: 'assistant', content: data.response });
  } catch (e) {
    State.messages.pop();
    State.messages.push({ role: 'assistant', content: `I'm having trouble connecting right now. Let me give you a general insight: ${State.user?.name}, consistency is the ultimate performance metric. Keep showing up.` });
  }

  chatEl.innerHTML = State.messages.map(renderAIMessage).join('');
  chatEl.scrollTop = chatEl.scrollHeight;
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
}

// ─── ONBOARDING ────────────────────────────────────────────────
const onboardingSteps = [
  {
    title: 'Welcome to 4 Quarters',
    icon: 'fas fa-rocket',
    content: `<p class="text-xl font-bold italic text-primary mb-4">"Plans don't fail because it is a bad plan, plans fail when execution lacks."</p>
    <p class="text-gray-300 mb-3">4 Quarters is a visual execution system that combines the <strong class="text-white">12 Week Year</strong>, Scrum execution, habit tracking, time blocking, and AI coaching into one powerful system.</p>
    <p class="text-gray-400 text-sm">This guided tour will walk you through everything. Let's go. 💪</p>`
  },
  {
    title: 'Your Vision & The 12-Week Cycle',
    icon: 'fas fa-circle-notch',
    content: `<p class="text-gray-300 mb-3">Start by creating a <strong class="text-white">12-Week Cycle</strong> — 84 days of intense, focused execution. Think of it as your operating system for the next quarter.</p>
    <ul class="space-y-2 text-sm text-gray-400 mb-3">
      <li class="flex gap-2"><i class="fas fa-check text-primary mt-0.5"></i> Set a cycle title (e.g. "Q1 2025 — Rise")</li>
      <li class="flex gap-2"><i class="fas fa-check text-primary mt-0.5"></i> Write your vision — where do you see yourself in 12 weeks?</li>
      <li class="flex gap-2"><i class="fas fa-check text-primary mt-0.5"></i> Define your emotional connection — your deep WHY</li>
    </ul>
    <p class="text-xs text-gray-500">Navigate to "12-Week Cycle" in the sidebar to create yours.</p>`
  },
  {
    title: 'The Goal Hierarchy',
    icon: 'fas fa-bullseye',
    content: `<p class="text-gray-300 mb-3">Goals are <strong class="text-white">strictly linked</strong>. Nothing is orphaned.</p>
    <div class="space-y-2 text-sm mb-3">
      <div class="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
        <span class="font-bold text-primary">12-Week Goals</span><span class="text-gray-400 text-xs">(max 3 per cycle)</span>
      </div>
      <div class="ml-4 flex items-center gap-2 p-2 rounded-lg bg-accent/10">
        <span class="font-bold text-accent">Monthly Goals</span><span class="text-gray-400 text-xs">(under each 12-week goal)</span>
      </div>
      <div class="ml-8 flex items-center gap-2 p-2 rounded-lg bg-blue-900/30">
        <span class="font-bold text-blue-300">Weekly Goals</span><span class="text-gray-400 text-xs">(under each monthly goal)</span>
      </div>
      <div class="ml-12 flex items-center gap-2 p-2 rounded-lg bg-purple-900/30">
        <span class="font-bold text-purple-300">Habits</span><span class="text-gray-400 text-xs">(execution layer)</span>
      </div>
    </div>
    <p class="text-xs text-gray-500">Navigate to "Goals" to build your hierarchy.</p>`
  },
  {
    title: 'The Execution Pyramid',
    icon: 'fas fa-layer-group',
    content: `<p class="text-gray-300 mb-3">The <strong class="text-white">Pyramid View</strong> shows how your daily habits drive everything above them.</p>
    <div class="text-center space-y-1 my-4">
      <div class="mx-auto bg-purple-900/40 rounded-lg py-2 px-4 text-purple-300 text-xs font-bold" style="width:40%">DAILY HABITS</div>
      <div class="mx-auto bg-blue-900/40 rounded-lg py-2 text-blue-300 text-xs font-bold" style="width:55%">WEEKLY GOALS</div>
      <div class="mx-auto bg-green-900/40 rounded-lg py-2 text-green-300 text-xs font-bold" style="width:70%">MONTHLY GOALS</div>
      <div class="mx-auto bg-yellow-900/40 rounded-lg py-2 text-yellow-300 text-xs font-bold" style="width:85%">12-WEEK GOALS</div>
      <div class="mx-auto bg-primary/30 rounded-lg py-2 text-primary-light text-xs font-bold" style="width:100%">12-WEEK CYCLE FOUNDATION</div>
    </div>
    <p class="text-xs text-gray-500">Daily habits → weekly goals → monthly milestones → quarterly objectives</p>`
  },
  {
    title: 'Habit Tracker',
    icon: 'fas fa-check-double',
    content: `<p class="text-gray-300 mb-3">The <strong class="text-white">Excel-style habit tracker</strong> gives you a weekly grid view of all your habits.</p>
    <ul class="space-y-2 text-sm text-gray-400 mb-3">
      <li class="flex gap-2"><i class="fas fa-check text-success mt-0.5"></i> <strong class="text-white">Execute habits:</strong> things you want to DO (exercise, read, etc.)</li>
      <li class="flex gap-2"><i class="fas fa-check text-success mt-0.5"></i> <strong class="text-white">Avoid habits:</strong> things you want to AVOID (social media, sugar, etc.)</li>
      <li class="flex gap-2"><i class="fas fa-check text-success mt-0.5"></i> Click a cell to mark it done or missed</li>
      <li class="flex gap-2"><i class="fas fa-check text-success mt-0.5"></i> Your score auto-calculates daily</li>
    </ul>`
  },
  {
    title: 'Time Blocking',
    icon: 'fas fa-calendar-alt',
    content: `<p class="text-gray-300 mb-3">The <strong class="text-white">Time Blocking calendar</strong> is a full 24-hour day planner — Google Calendar-style.</p>
    <ul class="space-y-2 text-sm text-gray-400 mb-3">
      <li class="flex gap-2"><i class="fas fa-check text-success mt-0.5"></i> Block time for deep work, exercise, meetings</li>
      <li class="flex gap-2"><i class="fas fa-check text-success mt-0.5"></i> Link blocks to your goals or habits (optional)</li>
      <li class="flex gap-2"><i class="fas fa-check text-success mt-0.5"></i> Click on any hour to quickly add a block</li>
      <li class="flex gap-2"><i class="fas fa-check text-success mt-0.5"></i> All data persists — check any date</li>
    </ul>
    <p class="text-xs text-gray-500">What gets scheduled, gets done.</p>`
  },
  {
    title: 'Scoring System',
    icon: 'fas fa-chart-bar',
    content: `<p class="text-gray-300 mb-3">Your performance is scored daily and weekly using a weighted formula.</p>
    <div class="space-y-3 mb-3">
      <div class="p-3 bg-dark rounded-xl">
        <div class="font-semibold text-sm mb-2">Daily Score</div>
        <div class="flex gap-2 text-xs">
          <div class="flex-1 text-center p-2 bg-primary/20 rounded"><div class="font-bold text-primary">60%</div><div class="text-gray-400">Goals</div></div>
          <div class="flex-1 text-center p-2 bg-success/20 rounded"><div class="font-bold text-success">40%</div><div class="text-gray-400">Habits</div></div>
        </div>
      </div>
      <div class="p-3 bg-dark rounded-xl">
        <div class="font-semibold text-sm mb-2">Weekly Score</div>
        <div class="flex gap-2 text-xs">
          <div class="flex-1 text-center p-2 bg-primary/20 rounded"><div class="font-bold text-primary">40%</div><div class="text-gray-400">Weekly Goals</div></div>
          <div class="flex-1 text-center p-2 bg-blue-900/30 rounded"><div class="font-bold text-blue-300">30%</div><div class="text-gray-400">Daily Goals</div></div>
          <div class="flex-1 text-center p-2 bg-success/20 rounded"><div class="font-bold text-success">30%</div><div class="text-gray-400">Habits</div></div>
        </div>
      </div>
    </div>
    <div class="flex gap-2 text-xs">
      <span class="grade-A px-2 py-1 rounded">A: 90+</span>
      <span class="grade-B px-2 py-1 rounded">B: 80-89</span>
      <span class="grade-C px-2 py-1 rounded">C: 70-79</span>
      <span class="grade-D px-2 py-1 rounded">D: 60-69</span>
      <span class="grade-F px-2 py-1 rounded">F: &lt;60</span>
    </div>`
  },
  {
    title: 'Accountability & AI Coach',
    icon: 'fas fa-users',
    content: `<p class="text-gray-300 mb-3">Two accountability systems work together:</p>
    <div class="space-y-3 mb-4">
      <div class="p-3 bg-dark rounded-xl">
        <div class="flex items-center gap-2 mb-1"><i class="fas fa-users text-primary"></i><span class="font-semibold text-sm">Accountability Partners</span></div>
        <p class="text-xs text-gray-400">Invite friends or colleagues. See a shared leaderboard. Do daily standups together.</p>
      </div>
      <div class="p-3 bg-dark rounded-xl">
        <div class="flex items-center gap-2 mb-1"><i class="fas fa-brain text-purple-400"></i><span class="font-semibold text-sm">AI Life Coach</span></div>
        <p class="text-xs text-gray-400">If no partner, your AI coach references your real data and gives specific, actionable feedback. Always available.</p>
      </div>
    </div>
    <p class="text-xs text-gray-500">Use the Standup feature daily for structured reflection.</p>`
  },
  {
    title: "You're Ready. Now Execute.",
    icon: 'fas fa-fire',
    content: `<p class="text-gray-300 mb-4">You have everything you need. The system is built. Now it's up to you.</p>
    <div class="p-4 bg-primary/10 border border-primary/30 rounded-xl mb-4">
      <p class="text-primary-light font-semibold text-sm italic">"Plans don't fail because it is a bad plan, plans fail when execution lacks."</p>
    </div>
    <p class="text-sm text-gray-400 mb-3">Your first steps:</p>
    <ol class="space-y-1 text-sm text-gray-300">
      <li class="flex gap-2"><span class="text-primary font-bold">1.</span> Create your 12-week cycle</li>
      <li class="flex gap-2"><span class="text-primary font-bold">2.</span> Set your 3 quarter goals</li>
      <li class="flex gap-2"><span class="text-primary font-bold">3.</span> Add your top 5 habits</li>
      <li class="flex gap-2"><span class="text-primary font-bold">4.</span> Block tomorrow's time</li>
      <li class="flex gap-2"><span class="text-primary font-bold">5.</span> Check your score every day</li>
    </ol>`
  }
];

let currentOnboardingStep = 0;

function showOnboarding() {
  currentOnboardingStep = 0;
  renderOnboardingStep();
  document.getElementById('onboarding-modal').classList.remove('hidden');
  document.getElementById('onboarding-modal').classList.add('flex');
}

function renderOnboardingStep() {
  const step = onboardingSteps[currentOnboardingStep];
  const total = onboardingSteps.length;
  const isLast = currentOnboardingStep === total - 1;

  document.getElementById('onboarding-inner').innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs text-gray-400">${currentOnboardingStep + 1} / ${total}</div>
        <button onclick="closeOnboarding()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>

      <!-- Progress dots -->
      <div class="flex gap-1.5 justify-center mb-6">
        ${onboardingSteps.map((_, i) => `<div class="onboarding-dot ${i === currentOnboardingStep ? 'active' : ''} ${i < currentOnboardingStep ? 'bg-primary' : ''}"></div>`).join('')}
      </div>

      <!-- Icon -->
      <div class="text-center mb-5">
        <div class="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
          <i class="${step.icon} text-primary text-2xl"></i>
        </div>
        <h2 class="text-xl font-bold">${step.title}</h2>
      </div>

      <!-- Content -->
      <div class="mb-6">${step.content}</div>

      <!-- Navigation -->
      <div class="flex gap-3">
        ${currentOnboardingStep > 0 ? `<button onclick="prevOnboardingStep()" class="btn btn-secondary">← Back</button>` : ''}
        ${isLast ? `
          <button onclick="closeOnboarding(true)" class="btn btn-primary flex-1">
            <i class="fas fa-rocket"></i> Let's Go!
          </button>
        ` : `
          <button onclick="nextOnboardingStep()" class="btn btn-primary flex-1">
            Next → 
          </button>
        `}
      </div>
    </div>
  `;
}

function nextOnboardingStep() {
  if (currentOnboardingStep < onboardingSteps.length - 1) {
    currentOnboardingStep++;
    renderOnboardingStep();
  }
}

function prevOnboardingStep() {
  if (currentOnboardingStep > 0) {
    currentOnboardingStep--;
    renderOnboardingStep();
  }
}

async function closeOnboarding(markComplete = false) {
  document.getElementById('onboarding-modal').classList.add('hidden');
  document.getElementById('onboarding-modal').classList.remove('flex');
  if (markComplete && State.user && !State.user.onboarding_completed) {
    try {
      await api('PATCH', '/auth/onboarding');
      State.user.onboarding_completed = 1;
      localStorage.setItem('4q_user', JSON.stringify(State.user));
    } catch (_) {}
  }
}

// ─── Utility ──────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Bootstrap ────────────────────────────────────────────────
async function boot() {
  // Small delay for polish
  await new Promise(r => setTimeout(r, 600));

  if (State.token && State.user) {
    // Verify token is still valid
    try {
      const data = await api('GET', '/auth/me');
      State.user = data.user;
      localStorage.setItem('4q_user', JSON.stringify(data.user));
      document.getElementById('loading-screen').classList.add('hidden');
      initApp();
    } catch (_) {
      // Token invalid, go to auth
      State.token = null;
      State.user = null;
      localStorage.clear();
      document.getElementById('loading-screen').classList.add('hidden');
      document.getElementById('auth-screen').classList.remove('hidden');
      document.getElementById('auth-screen').classList.add('flex');
    }
  } else {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('auth-screen').classList.add('flex');
  }
}

boot();
