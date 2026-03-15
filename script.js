// =============================================
// DADOS — carrega do localStorage ou começa vazio
// =============================================
let reminders = JSON.parse(localStorage.getItem('lembretes_v2') || '[]');
let currentFilter = 'all';


// =============================================
// INICIALIZAÇÃO
// =============================================

// Define data/hora padrão do formulário como "agora + 1 hora"
function setDefaultDatetime() {
  const now = new Date(Date.now() + 3600000);
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('inp-datetime').value =
    `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Mostra a barra de permissão se o usuário ainda não decidiu sobre notificações
if (Notification.permission === 'default') {
  document.getElementById('notif-bar').style.display = 'flex';
}

// Re-agenda notificações dos lembretes já existentes ao abrir a página
reminders.forEach(r => { if (!r.done) scheduleNotif(r); });

// Atualiza a tela a cada minuto (para marcar itens como atrasados em tempo real)
setInterval(render, 60000);

// Roda na inicialização
setDefaultDatetime();
render();

// Atalho: pressionar Enter no campo de título adiciona o lembrete
document.getElementById('inp-title').addEventListener('keydown', e => {
  if (e.key === 'Enter') addReminder();
});


// =============================================
// SALVAR NO LOCALSTORAGE
// =============================================
function save() {
  localStorage.setItem('lembretes_v2', JSON.stringify(reminders));
}


// =============================================
// ADICIONAR LEMBRETE
// =============================================
function addReminder() {
  const title = document.getElementById('inp-title').value.trim();

  // Validação: título é obrigatório
  if (!title) {
    const input = document.getElementById('inp-title');
    input.focus();
    input.style.borderColor = 'var(--urgent)';
    setTimeout(() => input.style.borderColor = '', 1500);
    return;
  }

  // Monta o objeto do lembrete
  const r = {
    id: Date.now(),                                          // ID único baseado no timestamp
    title,
    datetime: document.getElementById('inp-datetime').value,
    priority: document.getElementById('inp-priority').value,
    note: document.getElementById('inp-note').value.trim(),
    done: false,
    createdAt: new Date().toISOString()
  };

  reminders.unshift(r); // adiciona no início da lista
  save();
  render();
  scheduleNotif(r);

  // Limpa o formulário
  document.getElementById('inp-title').value = '';
  document.getElementById('inp-note').value = '';
  document.getElementById('inp-priority').value = 'media';
  setDefaultDatetime();
}


// =============================================
// CONCLUIR / REABRIR LEMBRETE
// =============================================
function toggleDone(id) {
  const r = reminders.find(x => x.id === id);
  if (r) {
    r.done = !r.done;
    save();
    render();
  }
}


// =============================================
// DELETAR LEMBRETE
// =============================================
function deleteReminder(id) {
  reminders = reminders.filter(x => x.id !== id);
  save();
  render();
}


// =============================================
// FILTROS
// =============================================
function setFilter(f, el) {
  currentFilter = f;
  // Remove classe ativa de todos os botões e coloca no clicado
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  render();
}

// Retorna a lista filtrada conforme o filtro ativo
function getFiltered() {
  return reminders.filter(r => {
    if (currentFilter === 'pending') return !r.done;
    if (currentFilter === 'done')    return r.done;
    if (currentFilter === 'alta')    return r.priority === 'alta' && !r.done;
    if (currentFilter === 'overdue') return isOverdue(r);
    return true; // 'all'
  });
}


// =============================================
// HELPERS
// =============================================

// Verifica se o lembrete está atrasado
function isOverdue(r) {
  return r.datetime && !r.done && new Date(r.datetime) < new Date();
}

// Formata a data/hora para exibição amigável
function formatDatetime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const diff = d - new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (diff < 0)       return `⚠️ ${dateStr} (atrasado)`;
  if (diff < 3600000) return `⏰ ${dateStr} (em breve!)`;
  return `📅 ${dateStr}`;
}

// Escapa caracteres HTML para evitar XSS
function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// =============================================
// RENDERIZAR A LISTA NA TELA
// =============================================
function render() {
  const list = document.getElementById('reminder-list');
  const filtered = getFiltered();

  // Atualiza os contadores do topo
  document.getElementById('stat-total').textContent   = reminders.length;
  document.getElementById('stat-pending').textContent = reminders.filter(r => !r.done).length;
  document.getElementById('stat-done').textContent    = reminders.filter(r => r.done).length;

  // Estado vazio
  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🌿</div>
        <p>Nenhum lembrete aqui ainda…</p>
      </div>`;
    return;
  }

  // Gera o HTML de cada card
  list.innerHTML = filtered.map(r => {
    const overdue  = isOverdue(r);
    const dtStr    = formatDatetime(r.datetime);
    const prioLabel = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }[r.priority];

    return `
      <div class="reminder-item ${r.done ? 'done' : ''}">
        <div class="priority-bar ${r.priority}"></div>

        <div class="reminder-content">
          <div class="reminder-header">
            <span class="reminder-title">${escHtml(r.title)}</span>
            <span class="priority-badge ${r.priority}">${prioLabel}</span>
          </div>
          ${dtStr ? `<div class="reminder-datetime ${overdue ? 'overdue' : ''}">${dtStr}</div>` : ''}
          ${r.note ? `<div class="reminder-note">${escHtml(r.note)}</div>` : ''}
        </div>

        <div class="reminder-actions">
          <button class="btn-icon done-btn" title="${r.done ? 'Reabrir' : 'Concluir'}" onclick="toggleDone(${r.id})">
            ${r.done ? '↩️' : '✅'}
          </button>
          <button class="btn-icon del-btn" title="Deletar" onclick="deleteReminder(${r.id})">
            🗑️
          </button>
        </div>
      </div>`;
  }).join('');
}


// =============================================
// NOTIFICAÇÕES DO NAVEGADOR
// =============================================

// Pede permissão quando o usuário clica em "Ativar"
function requestNotif() {
  Notification.requestPermission().then(p => {
    if (p === 'granted') {
      document.getElementById('notif-bar').style.display = 'none';
    }
  });
}

// Agenda uma notificação para disparar no horário do lembrete
// (só funciona para lembretes dentro de 7 dias)
function scheduleNotif(r) {
  if (!r.datetime || Notification.permission !== 'granted') return;
  const delay = new Date(r.datetime) - Date.now();
  if (delay > 0 && delay < 86400000 * 7) {
    setTimeout(() => {
      new Notification('🔔 Lembrete: ' + r.title, {
        body: r.note || 'Hora do seu lembrete!',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔔</text></svg>'
      });
    }, delay);
  }
}