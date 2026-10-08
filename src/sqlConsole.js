import { sound } from './sound.js';

export class SQLConsole {
  constructor(db) {
    this.db = db;
    this.container = null;
    this.feedEl = null;
    this.inputEl = null;
    this.history = [];
    this.historyIndex = -1;
    this.isMinimized = false;

    this.initUI();
    this.bindEvents();
    this.showWelcome();
  }

  initUI() {
    let el = document.getElementById('sql-console-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sql-console-container';
      el.className = 'sql-console';
      document.body.appendChild(el);
    }
    this.container = el;

    this.container.innerHTML = `
      <div class="console-header">
        <div class="console-title">
          <span class="status-dot"></span>
          <span class="terminal-icon">⚡</span>
          <strong>CONSOLE SQL</strong>
          <span class="db-status-badge">BDD ACTIVE</span>
        </div>
        <div class="console-controls">
          <button id="btn-ghost-console" class="icon-btn" title="Activer / Désactiver la transparence (voir à travers)">👁️</button>
          <button id="btn-copy-query" class="icon-btn" title="Copier la dernière requête">📋</button>
          <button id="btn-clear-console" class="icon-btn" title="Vider la console">🧹</button>
          <button id="btn-toggle-console" class="icon-btn" title="Réduire/Agrandir">➖</button>
        </div>
      </div>

      <div class="console-body" id="console-feed">
        <!-- Queries will be dynamically prepended / appended here -->
      </div>

      <div class="console-footer">
        <div class="quick-sql-tags">
          <span class="quick-label">Exemples :</span>
          <button class="quick-tag" data-sql="SELECT * FROM blocs;">SELECT *</button>
          <button class="quick-tag" data-sql="SELECT COUNT(*) FROM blocs;">COUNT(*)</button>
          <button class="quick-tag" data-sql="SELECT * FROM blocs JOIN zones ON zones.id = blocs.zone_id;">JOIN</button>
          <button class="quick-tag" data-sql="SELECT * FROM blocs WHERE couleur = 'jaune';">WHERE</button>
        </div>
        <form id="console-form" class="console-input-bar">
          <span class="prompt-symbol">SQL&gt;</span>
          <input type="text" id="console-sql-input" placeholder="Tape une commande SQL ou joue pour voir la magie..." autocomplete="off" />
          <button type="submit" class="btn-execute">Exécuter</button>
        </form>
      </div>
    `;

    this.feedEl = document.getElementById('console-feed');
    this.inputEl = document.getElementById('console-sql-input');
  }

  bindEvents() {
    // Subscribe to DB query events
    this.db.onQuery(payload => {
      this.addQueryEntry(payload);
    });

    // Ghost mode (transparency toggle so blocks behind are visible)
    const ghostBtn = document.getElementById('btn-ghost-console');
    if (ghostBtn) {
      ghostBtn.onclick = () => {
        const isGhost = this.container.classList.toggle('ghost-mode');
        ghostBtn.style.color = isGhost ? '#38bdf8' : '';
        this.showToastNotice(isGhost ? "👁️ Console ultra-transparente activée (tu peux voir le monde à travers) !" : "👁️ Transparence normale réactivée.");
      };
    }

    // Minimize toggle
    const toggleBtn = document.getElementById('btn-toggle-console');
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        this.isMinimized = !this.isMinimized;
        this.container.classList.toggle('minimized', this.isMinimized);
        toggleBtn.textContent = this.isMinimized ? '➕' : '➖';
      };
    }

    // Clear console
    const clearBtn = document.getElementById('btn-clear-console');
    if (clearBtn) {
      clearBtn.onclick = () => {
        this.feedEl.innerHTML = '';
        this.addSystemNotice("Console vidée. Continue de construire pour voir de nouvelles requêtes !");
      };
    }

    // Copy query
    const copyBtn = document.getElementById('btn-copy-query');
    if (copyBtn) {
      copyBtn.onclick = () => {
        if (this.lastQuery) {
          navigator.clipboard.writeText(this.lastQuery).then(() => {
            this.showToastNotice("Requête copiée dans le presse-papier !");
          });
        }
      };
    }

    // Quick tag buttons
    this.container.querySelectorAll('.quick-tag').forEach(tag => {
      tag.onclick = (e) => {
        e.preventDefault();
        const sql = tag.getAttribute('data-sql');
        if (sql) {
          this.executeInput(sql);
        }
      };
    });

    // Console form submit
    const form = document.getElementById('console-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const text = this.inputEl.value.trim();
        if (text) {
          this.executeInput(text);
          this.history.push(text);
          this.historyIndex = this.history.length;
          this.inputEl.value = '';
        }
      };
    }

    // Prevent pointer lock capture when typing in terminal
    this.inputEl.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        this.inputEl.blur();
      } else if (e.key === 'ArrowUp') {
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.inputEl.value = this.history[this.historyIndex] || '';
        }
      } else if (e.key === 'ArrowDown') {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.inputEl.value = this.history[this.historyIndex] || '';
        } else {
          this.historyIndex = this.history.length;
          this.inputEl.value = '';
        }
      }
    });

    this.inputEl.addEventListener('focus', () => {
      // When focusing input, make sure pointer lock is unlocked
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    });
  }

  // Open and focus input directly (called from Enter or Slash shortcut)
  focusInput() {
    if (this.isMinimized) {
      this.isMinimized = false;
      this.container.classList.remove('minimized');
      const toggleBtn = document.getElementById('btn-toggle-console');
      if (toggleBtn) toggleBtn.textContent = '➖';
    }
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
    this.inputEl.focus();
    this.inputEl.select();
  }

  showWelcome() {
    const welcomeHtml = `
      <div class="console-entry welcome-card">
        <div class="welcome-badge">🎓 BUT Science des Données</div>
        <div class="welcome-text">
          <strong>Bienvenue dans SQL Craft !</strong><br/>
          Le SQL n'est qu'une façon de parler à tes données. Chaque geste que tu fais dans ce monde a sa <em>phrase magique</em> — regarde la console à chaque clic !
        </div>
        <div class="welcome-hint">
          🎮 <strong>Touches :</strong> ZQSD/WASD pour marcher • Espace pour sauter • 1 à 7 dans la hotbar • Clic pour agir !
        </div>
      </div>
    `;
    this.feedEl.innerHTML = welcomeHtml;
  }

  unminimize() {
    if (this.isMinimized) {
      this.isMinimized = false;
      this.container.classList.remove('minimized');
      const toggleBtn = document.getElementById('btn-toggle-console');
      if (toggleBtn) toggleBtn.textContent = '➖';
    }
  }

  addQueryEntry({ query, op, explanation, results, count }) {
    this.lastQuery = query;
    this.unminimize();
    sound.playSqlPulse();

    const entry = document.createElement('div');
    entry.className = `console-entry op-${op ? op.toLowerCase() : 'custom'} fade-in`;

    const opBadge = this.getOpBadge(op);
    const highlightedSQL = this.highlightSQL(query);

    entry.innerHTML = `
      <div class="entry-meta">
        ${opBadge}
        <span class="entry-time">${new Date().toLocaleTimeString()}</span>
      </div>
      <pre class="entry-sql"><code>${highlightedSQL}</code></pre>
      <div class="entry-explanation">${explanation}</div>
    `;

    this.feedEl.appendChild(entry);
    this.feedEl.scrollTop = this.feedEl.scrollHeight;

    // Pulse console container
    this.container.classList.add('flash-glow');
    setTimeout(() => this.container.classList.remove('flash-glow'), 350);
  }

  addSystemNotice(msg) {
    const div = document.createElement('div');
    div.className = 'console-entry system-notice';
    div.innerHTML = `<span class="sys-icon">ℹ️</span> ${msg}`;
    this.feedEl.appendChild(div);
    this.feedEl.scrollTop = this.feedEl.scrollHeight;
  }

  getOpBadge(op) {
    switch (op) {
      case 'INSERT':
        return '<span class="badge badge-insert">➕ INSERT [CREATE]</span>';
      case 'UPDATE':
        return '<span class="badge badge-update">🎨 UPDATE [UPDATE]</span>';
      case 'DELETE':
        return '<span class="badge badge-delete">💥 DELETE [DELETE]</span>';
      case 'SELECT':
      case 'SELECT_FILTER':
        return '<span class="badge badge-select">📋 SELECT [READ]</span>';
      case 'JOIN':
        return '<span class="badge badge-join">🔗 JOIN [RELATIONNEL]</span>';
      case 'ORDER':
        return '<span class="badge badge-order">↕️ ORDER BY [TRI]</span>';
      case 'COUNT':
        return '<span class="badge badge-count">🔢 COUNT(*) [AGRÉGATION]</span>';
      default:
        return '<span class="badge badge-default">⚡ SQL EXEC</span>';
    }
  }

  // Syntax highlighting for SQL statements
  highlightSQL(sql) {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'INSERT', 'INTO', 'VALUES',
      'UPDATE', 'SET', 'DELETE FROM', 'DELETE', 'JOIN', 'ON', 'ORDER BY',
      'COUNT', 'AND', 'OR', 'IN', 'AS', 'ASC', 'DESC', 'GROUP BY'
    ];

    let escaped = sql
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Highlight strings in green
    escaped = escaped.replace(/('[^']*')/g, '<span class="sql-str">$1</span>');

    // Highlight numbers in amber
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="sql-num">$1</span>');

    // Highlight keywords
    keywords.forEach(kw => {
      const reg = new RegExp(`\\b(${kw})\\b`, 'gi');
      escaped = escaped.replace(reg, '<span class="sql-kw">$1</span>');
    });

    return escaped;
  }

  executeInput(sql) {
    const res = this.db.executeRawSQL(sql);
    if (res && res.error) {
      this.addSystemNotice(`❌ Erreur SQL : ${res.error}`);
    }
  }

  showToastNotice(msg) {
    let t = document.getElementById('game-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'game-toast';
      t.className = 'game-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2500);
  }
}
