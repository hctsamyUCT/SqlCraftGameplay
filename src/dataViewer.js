import { sound } from './sound.js';

export class DataViewer {
  constructor(db, selectionSystem) {
    this.db = db;
    this.selectionSystem = selectionSystem;
    this.isOpen = false;
    this.activeTab = 'blocs'; // 'blocs', 'zones', or 'join'
    this.modalEl = null;

    this.initUI();
    this.bindEvents();
  }

  initUI() {
    let el = document.getElementById('data-viewer-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'data-viewer-modal';
      el.className = 'modal-overlay hidden';
      document.body.appendChild(el);
    }
    this.modalEl = el;

    this.modalEl.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title">
            <span class="db-icon">🗄️</span>
            <strong>EXPLORATEUR DE BASE DE DONNÉES</strong>
            <span class="badge badge-accent">Mode Relationnel</span>
          </div>
          <button id="btn-close-dataviewer" class="btn-close" title="Fermer (Touche T ou Échap)">✕</button>
        </div>

        <div class="modal-tabs">
          <button class="tab-btn active" data-tab="blocs">📦 Table: <code>blocs</code> (<span id="count-tab-blocs">0</span>)</button>
          <button class="tab-btn" data-tab="zones">🗺️ Table: <code>zones</code> (3)</button>
          <button class="tab-btn" data-tab="join">🔗 Vue Relationnelle (<code>JOIN</code>)</button>
        </div>

        <div class="modal-body" id="modal-table-content">
          <!-- Dynamic relational table rendered here -->
        </div>

        <div class="modal-footer">
          <div class="pedagogy-legend">
            <span class="legend-item"><span class="badge-pk">PK</span> <strong>Clé Primaire :</strong> identifiant unique de chaque ligne</span>
            <span class="legend-item"><span class="badge-fk">FK</span> <strong>Clé Étrangère :</strong> pointe vers la clé primaire d'une autre table</span>
          </div>
          <button id="btn-refresh-table" class="btn-refresh">🔄 Rafraîchir</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Close button
    const closeBtn = document.getElementById('btn-close-dataviewer');
    if (closeBtn) {
      closeBtn.onclick = () => this.toggle(false);
    }

    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh-table');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.renderContent();
    }

    // Tab buttons
    this.modalEl.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        this.modalEl.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.getAttribute('data-tab');
        sound.playSelect();
        this.renderContent();
      };
    });

    // Close on click outside modal card
    this.modalEl.onclick = (e) => {
      if (e.target === this.modalEl) {
        this.toggle(false);
      }
    };
  }

  toggle(forceState) {
    this.isOpen = (forceState !== undefined) ? forceState : !this.isOpen;
    if (this.isOpen) {
      this.modalEl.classList.remove('hidden');
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
      this.renderContent();
      sound.playSelect();
    } else {
      this.modalEl.classList.add('hidden');
    }
  }

  renderContent() {
    const container = document.getElementById('modal-table-content');
    const blocsCount = document.getElementById('count-tab-blocs');
    if (blocsCount) blocsCount.textContent = this.db.blocs.length;

    if (this.activeTab === 'blocs') {
      this.renderBlocsTable(container);
    } else if (this.activeTab === 'zones') {
      this.renderZonesTable(container);
    } else if (this.activeTab === 'join') {
      this.renderJoinTable(container);
    }
  }

  renderBlocsTable(container) {
    if (this.db.blocs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>📭 La table <code>blocs</code> est vide pour l'instant !</p>
          <p class="empty-sub">Prends un bloc dans ta hotbar (touches 1 à 4) et fais un clic gauche sur le terrain pour insérer ta première ligne avec <code>INSERT INTO</code> !</p>
        </div>
      `;
      return;
    }

    let rowsHtml = '';
    this.db.blocs.forEach(b => {
      const isSelected = this.selectionSystem.selectedIds.has(b.id);
      rowsHtml += `
        <tr class="table-row ${isSelected ? 'row-selected' : ''}" data-block-id="${b.id}">
          <td class="col-pk"><code>#${b.id}</code></td>
          <td><span class="type-badge badge-${b.type}">${b.type}</span></td>
          <td><span class="color-pill" style="background-color: ${this.getColorHex(b.couleur)}"></span> ${b.couleur}</td>
          <td><code>${b.x}</code></td>
          <td><code>${b.y}</code></td>
          <td><code>${b.z}</code></td>
          <td class="col-fk"><code>${b.zone_id}</code> (${b.zone_id === 1 ? 'Nord' : 'Sud'})</td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="table-info-banner">
        Schéma : <code>blocs(id PK, type VARCHAR, couleur VARCHAR, x INT, y INT, z INT, zone_id INT FK)</code>
      </div>
      <table class="db-table">
        <thead>
          <tr>
            <th><span class="badge-pk">PK</span> id</th>
            <th>type</th>
            <th>couleur</th>
            <th>x</th>
            <th>y</th>
            <th>z</th>
            <th><span class="badge-fk">FK</span> zone_id</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    // Row click to toggle selection
    container.querySelectorAll('.table-row').forEach(row => {
      row.onclick = () => {
        const id = parseInt(row.getAttribute('data-block-id'));
        this.selectionSystem.toggleBlockSelection(id);
        this.renderBlocsTable(container);
      };
    });
  }

  renderZonesTable(container) {
    let rowsHtml = '';
    this.db.zones.forEach(z => {
      rowsHtml += `
        <tr>
          <td class="col-pk"><code>#${z.id}</code></td>
          <td><strong>${z.nom}</strong></td>
          <td>${z.biome}</td>
          <td>${z.sol}</td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="table-info-banner">
        Schéma : <code>zones(id PK, nom VARCHAR, biome VARCHAR, sol VARCHAR)</code>
        <br/><small>Cette table fixe définit les régions géographiques du monde.</small>
      </div>
      <table class="db-table">
        <thead>
          <tr>
            <th><span class="badge-pk">PK</span> id</th>
            <th>nom</th>
            <th>biome</th>
            <th>sol</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  renderJoinTable(container) {
    const { results } = this.db.joinZones();

    if (results.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Pose des blocs pour visualiser la jointure <code>JOIN</code> en direct !</p>
        </div>
      `;
      return;
    }

    let rowsHtml = '';
    results.forEach(r => {
      rowsHtml += `
        <tr>
          <td class="col-pk"><code>#${r.bloc_id}</code></td>
          <td><span class="type-badge badge-${r.type}">${r.type}</span></td>
          <td><span class="color-pill" style="background-color: ${this.getColorHex(r.couleur)}"></span> ${r.couleur}</td>
          <td class="col-joined"><strong>${r.zone_nom}</strong></td>
          <td><em>${r.zone_biome}</em></td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="table-info-banner table-info-join">
        Requête : <code>SELECT blocs.id, blocs.type, blocs.couleur, zones.nom, zones.biome FROM blocs JOIN zones ON zones.id = blocs.zone_id;</code>
      </div>
      <table class="db-table">
        <thead>
          <tr>
            <th>bloc_id</th>
            <th>type</th>
            <th>couleur</th>
            <th><span class="badge-join">JOIN</span> nom_zone</th>
            <th>biome</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  getColorHex(c) {
    const map = { rouge: '#ef4444', bleu: '#3b82f6', vert: '#22c55e', jaune: '#eab308' };
    return map[c] || '#94a3b8';
  }
}
