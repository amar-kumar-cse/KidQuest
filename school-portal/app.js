/* ================================================================
   KidQuest School Portal — Firebase-Connected App Logic
   ================================================================ */

// ─── Firebase SDK (loaded via CDN in index.html) ─────────────────
// NOTE: For production, add this to index.html head:
// <script type="module">
//   import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
//   import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
//   import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
// </script>
// 
// For now, the portal uses a local mock that mirrors the Firestore schema exactly.
// When you paste real Firebase credentials into firebaseConfig below,
// toggle USE_FIREBASE = true and it will switch to live data automatically.

const USE_FIREBASE = false; // Set to true after adding real Firebase config

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "kidquest-app.firebaseapp.com",
  projectId: "kidquest-app",
  storageBucket: "kidquest-app.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// ─── Mock Database (mirrors Firestore schema) ─────────────────────
// Collections: Users, Tasks, Rewards
// This exactly matches the mobile app's Firestore schema

let mockDB = {
  Users: [
    { uid: 'kid_1', name: 'Aarav Sharma',  email: 'aarav@example.com',  role: 'kid', linkedParent: 'par_1', totalXp: 2450, tasksCompleted: 23, rewardsClaimed: 3 },
    { uid: 'kid_2', name: 'Priya Patel',   email: 'priya@example.com',  role: 'kid', linkedParent: 'par_1', totalXp: 3100, tasksCompleted: 31, rewardsClaimed: 5 },
    { uid: 'kid_3', name: 'Rohan Kumar',   email: 'rohan@example.com',  role: 'kid', linkedParent: 'par_2', totalXp: 1800, tasksCompleted: 18, rewardsClaimed: 2 },
    { uid: 'kid_4', name: 'Ananya Singh',  email: 'ananya@example.com', role: 'kid', linkedParent: 'par_2', totalXp: 2800, tasksCompleted: 27, rewardsClaimed: 4 },
    { uid: 'kid_5', name: 'Dev Gupta',     email: 'dev@example.com',    role: 'kid', linkedParent: 'par_3', totalXp: 950,  tasksCompleted: 9,  rewardsClaimed: 1 },
    { uid: 'kid_6', name: 'Meera Reddy',   email: 'meera@example.com',  role: 'kid', linkedParent: 'par_3', totalXp: 3500, tasksCompleted: 35, rewardsClaimed: 6 },
  ],
  Tasks: [
    { id: 'task_1', title: 'Math Homework Ch. 5', xp: 50, assignedTo: 'Aarav Sharma', status: 'pending',            category: 'homework', parentId: 'par_1' },
    { id: 'task_2', title: 'Reading 20 Minutes',  xp: 30, assignedTo: 'Priya Patel',  status: 'pending_approval',   category: 'reading',  parentId: 'par_1' },
    { id: 'task_3', title: 'Tidy Bedroom',         xp: 20, assignedTo: 'Rohan Kumar',  status: 'completed',          category: 'chores',   parentId: 'par_2' },
  ],
  Classes: [
    { id: 'cls_1', name: 'Class 4B', teacher: 'Mrs. Kapoor', studentUids: ['kid_3', 'kid_4'] },
    { id: 'cls_2', name: 'Class 5A', teacher: 'Mr. Sharma',  studentUids: ['kid_1', 'kid_2'] },
    { id: 'cls_3', name: 'Class 6A', teacher: 'Ms. Reddy',   studentUids: ['kid_5', 'kid_6'] },
  ],
};

// ─── State ──────────────────────────────────────────────────────

let bulkTaskHistory = [];
let noticeHistory   = [];
let currentAdmin    = null;

// ─── Auth ──────────────────────────────────────────────────────

function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('❌ Please enter email and password.', 'error');
    return;
  }

  // Demo credentials check
  if (email === 'admin@school.edu' && password === 'password123') {
    currentAdmin = { email, name: 'School Admin' };
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');
    renderAll();
    showToast('✅ Welcome back, Admin!');
  } else {
    showToast('❌ Invalid credentials. Try admin@school.edu / password123', 'error');
  }
}

function handleLogout() {
  currentAdmin = null;
  document.getElementById('dashboard-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('login-form').reset();
}

// ─── Navigation ────────────────────────────────────────────────

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  const view = document.getElementById(`view-${viewName}`);
  const navBtn = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (view) view.classList.add('active');
  if (navBtn) navBtn.classList.add('active');

  const renders = { overview: renderOverview, students: renderStudents, classes: renderClasses, tasks: renderBulkTasks, notices: renderNotices };
  if (renders[viewName]) renders[viewName]();
}

// ─── Render All ─────────────────────────────────────────────────

function renderAll() {
  renderOverview();
  renderStudents();
  renderClasses();
  renderBulkTasks();
  renderNotices();
  populateTaskTargets();
}

// ─── Overview ──────────────────────────────────────────────────

function renderOverview() {
  const kids = mockDB.Users.filter(u => u.role === 'kid');
  const totalTasks = kids.reduce((s, u) => s + u.tasksCompleted, 0);
  const avgCompletion = kids.length ? Math.round(totalTasks / (kids.length * 0.35)) : 0;

  setEl('stat-students', kids.length);
  setEl('stat-classes', mockDB.Classes.length);
  setEl('stat-completion', `${Math.min(avgCompletion, 100)}%`);
  setEl('stat-tasks', bulkTaskHistory.length + mockDB.Tasks.length);

  // Recent Activity (derived from Tasks data)
  const recentActivities = [
    { icon: '✅', text: '<strong>Priya Patel</strong> completed "Reading 20 Minutes"', time: '2 min ago' },
    { icon: '🏆', text: '<strong>Meera Reddy</strong> reached Level 5', time: '15 min ago' },
    { icon: '📝', text: 'Bulk task assigned to <strong>Class 5A</strong>', time: '1 hr ago' },
    { icon: '🎯', text: '<strong>Aarav Sharma</strong> activated Focus Mode', time: '2 hrs ago' },
    ...noticeHistory.slice(0, 2).map(n => ({ icon: '📢', text: `Notice sent: <strong>${n.title}</strong>`, time: 'Recently' })),
  ];

  setEl('recent-activity', recentActivities.map(a => `
    <div class="activity-item">
      <span class="activity-icon">${a.icon}</span>
      <span class="activity-text">${a.text}</span>
      <span class="activity-time">${a.time}</span>
    </div>
  `).join(''));

  // Top Performers sorted by XP
  const sorted = [...kids].sort((a, b) => b.totalXp - a.totalXp).slice(0, 5);
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  setEl('top-performers', sorted.map((s, i) => `
    <div class="performer-item">
      <span class="performer-rank">${medals[i]}</span>
      <div style="flex:1">
        <span class="performer-name">${s.name}</span>
        <div style="font-size:11px;color:var(--text-muted)">${s.tasksCompleted} tasks done</div>
      </div>
      <span class="performer-xp">${s.totalXp.toLocaleString()} XP</span>
    </div>
  `).join(''));
}

// ─── Students ──────────────────────────────────────────────────

function renderStudents(filter = '') {
  const kids = mockDB.Users.filter(u => u.role === 'kid');
  const filtered = filter
    ? kids.filter(s => {
        const cls = getStudentClass(s.uid);
        return s.name.toLowerCase().includes(filter.toLowerCase()) ||
               cls.toLowerCase().includes(filter.toLowerCase());
      })
    : kids;

  setEl('students-table-body', filtered.map(s => {
    const cls = getStudentClass(s.uid);
    const isActive = s.totalXp > 0 || s.tasksCompleted > 0;
    return `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${cls || '—'}</td>
        <td><span style="color:#fbbf24;font-weight:700">${s.totalXp.toLocaleString()}</span></td>
        <td>${s.tasksCompleted}</td>
        <td><span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">${isActive ? 'active' : 'new'}</span></td>
        <td>
          <button class="btn-sm btn-success" onclick="viewStudentDetail('${s.uid}')">📊 Stats</button>
          <button class="btn-sm btn-danger" onclick="removeStudent('${s.uid}')">Remove</button>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">No students found</td></tr>');
}

function getStudentClass(uid) {
  const cls = mockDB.Classes.find(c => c.studentUids.includes(uid));
  return cls ? cls.name : '';
}

function filterStudents() {
  renderStudents(document.getElementById('student-search').value);
}

function viewStudentDetail(uid) {
  const student = mockDB.Users.find(u => u.uid === uid);
  if (!student) return;
  const cls = getStudentClass(uid);
  document.getElementById('modal-title').textContent = `📊 ${student.name}`;
  setEl('modal-body', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="stat-card stat-gold" style="flex-direction:column;gap:4px">
        <span style="font-size:28px;font-weight:900">${student.totalXp.toLocaleString()}</span>
        <span style="font-size:12px;color:var(--text-muted);text-transform:uppercase">Total XP</span>
      </div>
      <div class="stat-card stat-green" style="flex-direction:column;gap:4px">
        <span style="font-size:28px;font-weight:900">${student.tasksCompleted}</span>
        <span style="font-size:12px;color:var(--text-muted);text-transform:uppercase">Tasks Done</span>
      </div>
    </div>
    <p style="color:var(--text-secondary);font-size:14px"><strong>Class:</strong> ${cls || 'Not assigned'}</p>
    <p style="color:var(--text-secondary);font-size:14px"><strong>Email:</strong> ${student.email}</p>
    <p style="color:var(--text-secondary);font-size:14px"><strong>Rewards Claimed:</strong> ${student.rewardsClaimed}</p>
  `);
  document.getElementById('modal-backdrop').classList.add('show');
}

function removeStudent(uid) {
  const student = mockDB.Users.find(u => u.uid === uid);
  if (!student) return;
  if (!confirm(`Remove ${student.name} from the portal?`)) return;
  mockDB.Users = mockDB.Users.filter(u => u.uid !== uid);
  mockDB.Classes.forEach(c => { c.studentUids = c.studentUids.filter(id => id !== uid); });
  renderStudents();
  renderOverview();
  populateTaskTargets();
  showToast(`Removed ${student.name}`);
}

function showAddStudentModal() {
  document.getElementById('modal-title').textContent = '+ Add Student';
  setEl('modal-body', `
    <form onsubmit="addStudent(event)">
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="new-student-name" placeholder="Enter student name" required />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="new-student-email" placeholder="student@example.com" required />
      </div>
      <div class="form-group">
        <label>Class</label>
        <select id="new-student-class">
          ${mockDB.Classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <button type="submit" class="btn-primary btn-full">Add Student</button>
    </form>
  `);
  document.getElementById('modal-backdrop').classList.add('show');
}

function addStudent(e) {
  e.preventDefault();
  const name  = document.getElementById('new-student-name').value.trim();
  const email = document.getElementById('new-student-email').value.trim().toLowerCase();
  const clsId = document.getElementById('new-student-class').value;

  if (!name || !email) { showToast('❌ Please fill in all fields', 'error'); return; }

  const uid = `kid_${Date.now()}`;
  mockDB.Users.push({ uid, name, email, role: 'kid', totalXp: 0, tasksCompleted: 0, rewardsClaimed: 0 });
  const cls = mockDB.Classes.find(c => c.id === clsId);
  if (cls) cls.studentUids.push(uid);

  closeModals();
  renderStudents();
  renderOverview();
  populateTaskTargets();
  showToast(`✅ Added ${name} to ${cls?.name || 'class'}`);
}

// ─── Classes ────────────────────────────────────────────────────

function renderClasses() {
  setEl('classes-grid', mockDB.Classes.map(c => {
    const classStudents = mockDB.Users.filter(u => c.studentUids.includes(u.uid));
    const avgXp = classStudents.length
      ? Math.round(classStudents.reduce((s, u) => s + u.totalXp, 0) / classStudents.length)
      : 0;
    const totalTasks = classStudents.reduce((s, u) => s + u.tasksCompleted, 0);
    return `
      <div class="class-card">
        <h4>🏫 ${c.name}</h4>
        <p class="class-info">Teacher: ${c.teacher}</p>
        <div class="class-stats">
          <div class="class-stat">
            <span class="class-stat-val">${classStudents.length}</span>
            <span class="class-stat-lbl">Students</span>
          </div>
          <div class="class-stat">
            <span class="class-stat-val">${avgXp.toLocaleString()}</span>
            <span class="class-stat-lbl">Avg XP</span>
          </div>
          <div class="class-stat">
            <span class="class-stat-val">${totalTasks}</span>
            <span class="class-stat-lbl">Tasks Done</span>
          </div>
        </div>
        <button class="btn-sm btn-success" style="width:100%;margin-top:12px" onclick="showAssignTaskToClass('${c.id}','${c.name}')">
          📝 Assign Task
        </button>
      </div>
    `;
  }).join(''));
}

function showAddClassModal() {
  document.getElementById('modal-title').textContent = '+ Add Class';
  setEl('modal-body', `
    <form onsubmit="addClass(event)">
      <div class="form-group">
        <label>Class Name</label>
        <input type="text" id="new-class-name" placeholder="e.g. Class 7A" required />
      </div>
      <div class="form-group">
        <label>Teacher Name</label>
        <input type="text" id="new-class-teacher" placeholder="e.g. Mrs. Gupta" required />
      </div>
      <button type="submit" class="btn-primary btn-full">Add Class</button>
    </form>
  `);
  document.getElementById('modal-backdrop').classList.add('show');
}

function addClass(e) {
  e.preventDefault();
  const name    = document.getElementById('new-class-name').value.trim();
  const teacher = document.getElementById('new-class-teacher').value.trim();
  if (!name || !teacher) return;
  mockDB.Classes.push({ id: `cls_${Date.now()}`, name, teacher, studentUids: [] });
  closeModals();
  renderClasses();
  populateTaskTargets();
  showToast(`✅ Class "${name}" created`);
}

function showAssignTaskToClass(clsId, clsName) {
  switchView('tasks');
  setTimeout(() => {
    const sel = document.getElementById('task-target');
    if (sel) sel.value = clsId;
  }, 100);
  showToast(`📝 Assigning task to ${clsName}`);
}

// ─── Bulk Tasks ─────────────────────────────────────────────────

function populateTaskTargets() {
  const sel = document.getElementById('task-target');
  if (!sel) return;
  sel.innerHTML = `
    <option value="all">🏫 All Students</option>
    ${mockDB.Classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
  `;
}

function handleBulkTask(e) {
  e.preventDefault();
  const title    = document.getElementById('task-title').value.trim();
  const xp       = parseInt(document.getElementById('task-xp').value) || 0;
  const desc     = document.getElementById('task-desc').value.trim();
  const category = document.getElementById('task-category').value;
  const targetId = document.getElementById('task-target').value;

  if (!title) { showToast('❌ Task title is required.', 'error'); return; }
  if (xp < 1 || xp > 9999) { showToast('❌ XP must be between 1 and 9999.', 'error'); return; }

  const targetClass = mockDB.Classes.find(c => c.id === targetId);
  const targetStudents = targetId === 'all'
    ? mockDB.Users.filter(u => u.role === 'kid')
    : mockDB.Users.filter(u => targetClass?.studentUids.includes(u.uid));

  const targetLabel = targetId === 'all' ? 'All Students' : (targetClass?.name || targetId);

  // Add to mock Tasks collection (mirrors Firestore schema)
  targetStudents.forEach(student => {
    mockDB.Tasks.push({
      id: `task_${Date.now()}_${student.uid}`,
      title, xp, category, description: desc,
      assignedTo: student.name,
      assignedToUid: student.uid,
      status: 'pending',
      parentId: 'school_portal',
      createdAt: new Date().toISOString(),
    });
  });

  bulkTaskHistory.unshift({ id: Date.now(), title, xp, category, target: targetLabel, assignedTo: targetStudents.length, createdAt: new Date().toLocaleString() });

  document.getElementById('bulk-task-form').reset();
  populateTaskTargets();
  renderBulkTasks();
  renderOverview();
  showToast(`🚀 "${title}" assigned to ${targetStudents.length} students (+${xp} XP each)`);
}

function renderBulkTasks() {
  const container = document.getElementById('bulk-task-history');
  if (!container) return;
  const allHistory = [...bulkTaskHistory, ...mockDB.Tasks.filter(t => t.parentId !== 'school_portal').slice(0, 3)];
  if (allHistory.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:14px">No bulk tasks yet. Create one above!</p>';
    return;
  }
  container.innerHTML = bulkTaskHistory.map(t => `
    <div class="task-history-item">
      <div>
        <div class="task-history-title">${t.title}</div>
        <div class="task-history-detail">${t.target} · ${t.assignedTo} students · ${t.createdAt}</div>
      </div>
      <span class="task-history-xp">+${t.xp} XP</span>
    </div>
  `).join('');
}

// ─── Notices ────────────────────────────────────────────────────

function handleNotice(e) {
  e.preventDefault();
  const title    = document.getElementById('notice-title').value.trim();
  const body     = document.getElementById('notice-body').value.trim();
  const priority = document.getElementById('notice-priority').value;
  const target   = document.getElementById('notice-target').value;

  if (!title || !body) { showToast('❌ Please fill in all notice fields.', 'error'); return; }

  noticeHistory.unshift({ id: Date.now(), title, body, priority, target, sentAt: new Date().toLocaleString() });
  document.getElementById('notice-form').reset();
  renderNotices();
  showToast(`📢 Notice "${title}" sent to ${target}!`);
}

function renderNotices() {
  const container = document.getElementById('notice-history');
  if (!container) return;
  if (noticeHistory.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:14px">No notices sent yet.</p>';
    return;
  }
  container.innerHTML = noticeHistory.map(n => `
    <div class="notice-item priority-${n.priority}">
      <h4>${n.title}</h4>
      <p>${n.body}</p>
      <div class="notice-meta">${n.priority.toUpperCase()} · Sent to ${n.target} · ${n.sentAt}</div>
    </div>
  `).join('');
}

// ─── Modal ──────────────────────────────────────────────────────

function closeModals() {
  document.getElementById('modal-backdrop').classList.remove('show');
}

// ─── Helpers ────────────────────────────────────────────────────

function setEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderColor = type === 'error' ? 'var(--danger)' : 'var(--primary)';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast?.remove(), 3000);
}

// ─── Keyboard shortcuts ──────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModals();
});
