const STORAGE_KEY = 'reminders_v1';

let reminders = load();
let currentFilter = 'all';
let alarmTimers = {};

const form = document.getElementById('reminder-form');
const textInput = document.getElementById('reminder-text');
const datetimeInput = document.getElementById('reminder-datetime');
const list = document.getElementById('reminder-list');
const emptyMsg = document.getElementById('empty-msg');
const notification = document.getElementById('notification');
const filterBtns = document.querySelectorAll('.filter-btn');

// Set minimum datetime to now
function setMinDatetime() {
  const now = new Date();
  now.setSeconds(0, 0);
  datetimeInput.min = now.toISOString().slice(0, 16);
}
setMinDatetime();

// Load from localStorage
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

// Create a reminder object
function createReminder(text, datetime) {
  return {
    id: Date.now().toString(),
    text: text.trim(),
    datetime,
    done: false,
    createdAt: new Date().toISOString(),
  };
}

// Format datetime for display
function formatDatetime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Show a toast notification
let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  notification.textContent = message;
  notification.classList.remove('hidden');
  toastTimer = setTimeout(() => notification.classList.add('hidden'), 3500);
}

// Schedule a browser alarm for a reminder
function scheduleAlarm(reminder) {
  clearTimeout(alarmTimers[reminder.id]);
  if (reminder.done) return;

  const ms = new Date(reminder.datetime) - Date.now();
  if (ms <= 0) return;

  alarmTimers[reminder.id] = setTimeout(() => {
    showToast(`Recordatorio: ${reminder.text}`);
    if (Notification.permission === 'granted') {
      new Notification('Recordatorio', { body: reminder.text });
    }
    render();
  }, ms);
}

// Cancel alarm
function cancelAlarm(id) {
  clearTimeout(alarmTimers[id]);
  delete alarmTimers[id];
}

// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Render the list based on current filter
function render() {
  list.innerHTML = '';
  const now = new Date();

  const filtered = reminders.filter(r => {
    if (currentFilter === 'pending') return !r.done;
    if (currentFilter === 'done') return r.done;
    return true;
  });

  emptyMsg.classList.toggle('hidden', filtered.length > 0);

  filtered.forEach(r => {
    const isOverdue = !r.done && new Date(r.datetime) < now;

    const li = document.createElement('li');
    li.className = [
      'reminder-item',
      r.done ? 'done' : '',
      isOverdue ? 'overdue' : '',
    ].join(' ').trim();
    li.dataset.id = r.id;

    li.innerHTML = `
      <button class="check-btn" title="${r.done ? 'Marcar pendiente' : 'Marcar hecho'}" aria-label="toggle">
        ${r.done ? '&#10003;' : ''}
      </button>
      <div class="reminder-body">
        <div class="reminder-text">${escapeHtml(r.text)}</div>
        <div class="reminder-date">${isOverdue ? 'Vencido &mdash; ' : ''}${formatDatetime(r.datetime)}</div>
      </div>
      <button class="delete-btn" title="Eliminar" aria-label="delete">&#10005;</button>
    `;

    li.querySelector('.check-btn').addEventListener('click', () => toggleDone(r.id));
    li.querySelector('.delete-btn').addEventListener('click', () => deleteReminder(r.id));

    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toggleDone(id) {
  const r = reminders.find(r => r.id === id);
  if (!r) return;
  r.done = !r.done;
  if (r.done) cancelAlarm(id);
  else scheduleAlarm(r);
  save();
  render();
}

function deleteReminder(id) {
  cancelAlarm(id);
  reminders = reminders.filter(r => r.id !== id);
  save();
  render();
}

// Form submit
form.addEventListener('submit', e => {
  e.preventDefault();
  const text = textInput.value;
  const datetime = datetimeInput.value;

  if (!text.trim() || !datetime) return;

  const r = createReminder(text, datetime);
  reminders.unshift(r);
  save();
  scheduleAlarm(r);
  render();
  showToast('Recordatorio agregado.');

  textInput.value = '';
  datetimeInput.value = '';
  setMinDatetime();
  textInput.focus();
});

// Filters
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

// Init
requestNotificationPermission();
reminders.forEach(scheduleAlarm);
render();
