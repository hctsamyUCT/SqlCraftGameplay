import * as THREE from 'three';
import { sound } from './sound.js';

export class SelectionSystem {
  constructor(scene, db, world, blockManager) {
    this.scene = scene;
    this.db = db;
    this.world = world;
    this.blockManager = blockManager;

    this.selectedIds = new Set();
    this.highlightGroup = new THREE.Group();
    this.scene.add(this.highlightGroup);

    this.tagSprites = new Map(); // id -> Sprite
    this.orderBadges = []; // floating order number sprites

    this.isMinimized = false;
    this.domContainer = null;
    this.createUI();
  }

  // Set DOM container for floating selection toolbar
  createUI() {
    let bar = document.getElementById('selection-toolbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'selection-toolbar';
      bar.className = 'selection-toolbar hidden';
      document.body.appendChild(bar);
    }
    this.domContainer = bar;
    this.renderToolbar();
  }

  getCurrentSQLQuery() {
    const ids = Array.from(this.selectedIds);
    if (ids.length === 0) return 'SELECT * FROM blocs;';
    if (ids.length === 1) return `SELECT * FROM blocs WHERE id = ${ids[0]};`;
    return `SELECT * FROM blocs WHERE id IN (${ids.join(', ')});`;
  }

  renderToolbar() {
    const count = this.selectedIds.size;
    const currentQuery = this.getCurrentSQLQuery();

    if (this.isMinimized) {
      this.domContainer.classList.add('is-minimized');
      this.domContainer.innerHTML = `
        <div class="sel-mini-bar">
          <span class="sel-icon">🔍</span>
          <span class="sel-title">Mode SQL</span>
          <span class="sel-count badge">${count} bloc${count > 1 ? 's' : ''}</span>
          <code class="sel-mini-code">${currentQuery}</code>
          <button id="btn-unminimize-toolbar" class="btn-xs" title="Agrandir la barre d'outils">➕ Agrandir</button>
          <button id="btn-close-toolbar-mini" class="btn-xs btn-danger" title="Fermer et désélectionner">✕</button>
        </div>
      `;
      this.bindToolbarEvents();
      return;
    }

    this.domContainer.classList.remove('is-minimized');
    this.domContainer.innerHTML = `
      <div class="sel-header">
        <div class="sel-header-left">
          <span class="sel-icon">🔍</span>
          <span class="sel-title">Mode Requête SQL</span>
          <span class="sel-count badge">${count} bloc${count > 1 ? 's' : ''} ciblé${count > 1 ? 's' : ''}</span>
        </div>
        <div class="sel-header-right">
          <button id="btn-open-sql-guide" class="btn-xs btn-guide" title="Guide pédagogique : à quoi servent tous ces outils ?">❓ Guide</button>
          <button id="btn-select-all" class="btn-xs" title="Sélectionner tous les blocs existants">Tous (SELECT *)</button>
          <button id="btn-minimize-toolbar" class="btn-xs" title="Réduire en petite barre discrète pour voir tout le terrain">➖ Réduire</button>
          <button id="btn-close-toolbar" class="btn-xs btn-danger" title="Fermer la boîte et désélectionner">✕ Fermer</button>
        </div>
      </div>

      <!-- Live query preview bar -->
      <div class="sel-sql-bar" title="Requête SQL générée en temps réel selon ta sélection">
        <span class="sel-sql-tag">LIVE SQL</span>
        <code class="sel-sql-code">${currentQuery}</code>
      </div>

      <div class="sel-actions">
        <button id="btn-sql-show" class="btn-action" title="Exécute SELECT sur les blocs ciblés et affiche leurs détails dans la console">
          <span class="action-icon">📋</span>
          <span class="action-text">Afficher</span>
          <span class="action-sql">SELECT</span>
          <span class="action-sub">Lire les lignes</span>
        </button>

        <div class="dropdown-wrapper">
          <button id="btn-sql-filter" class="btn-action dropdown-trigger" title="Filtre les blocs avec WHERE selon leur couleur ou leur type">
            <span class="action-icon">🔍</span>
            <span class="action-text">Filtrer</span>
            <span class="action-sql">WHERE ▾</span>
            <span class="action-sub">Couleur / Type</span>
          </button>
          <div class="dropdown-menu" id="filter-menu">
            <div class="dropdown-group-title">${count > 0 ? 'Filtrer la sélection par type' : 'Filtrer tout par type'}</div>
            <button class="dropdown-item" data-filter-type="beton">🧱 Béton</button>
            <button class="dropdown-item" data-filter-type="porte">🚪 Porte</button>
            <button class="dropdown-item" data-filter-type="plante">🌿 Plante</button>
            <div class="dropdown-group-title">${count > 0 ? 'Filtrer la sélection par couleur' : 'Filtrer tout par couleur'}</div>
            <button class="dropdown-item" data-filter-color="rouge"><span class="color-dot red"></span> Rouge</button>
            <button class="dropdown-item" data-filter-color="bleu"><span class="color-dot blue"></span> Bleu</button>
            <button class="dropdown-item" data-filter-color="vert"><span class="color-dot green"></span> Vert</button>
            <button class="dropdown-item" data-filter-color="jaune"><span class="color-dot yellow"></span> Jaune</button>
          </div>
        </div>

        <div class="dropdown-wrapper">
          <button id="btn-sql-sort" class="btn-action dropdown-trigger" title="Classe les blocs dans l'espace avec ORDER BY et affiche des numéros 3D">
            <span class="action-icon">↕️</span>
            <span class="action-text">Trier</span>
            <span class="action-sql">ORDER BY ▾</span>
            <span class="action-sub">Numéroter 1,2,3</span>
          </button>
          <div class="dropdown-menu" id="sort-menu">
            <button class="dropdown-item" data-sort-field="x" data-sort-dir="ASC">📍 Position X (Ouest ➔ Est)</button>
            <button class="dropdown-item" data-sort-field="z" data-sort-dir="ASC">📍 Position Z (Nord ➔ Sud)</button>
            <button class="dropdown-item" data-sort-field="type" data-sort-dir="ASC">🔤 Type alphabétique</button>
            <button class="dropdown-item" data-sort-field="id" data-sort-dir="DESC">🆔 Id décroissant (récent)</button>
          </div>
        </div>

        <button id="btn-sql-count" class="btn-action" title="Fonction d'agrégation : compte le nombre total de blocs sans tout télécharger">
          <span class="action-icon">🔢</span>
          <span class="action-text">Compter</span>
          <span class="action-sql">COUNT(*)</span>
          <span class="action-sub">Nombre total</span>
        </button>

        <button id="btn-sql-join" class="btn-action btn-join" title="Lien relationnel : fusionne la table blocs et la table zones via la clé étrangère zone_id">
          <span class="action-icon">🔗</span>
          <span class="action-text">Relier</span>
          <span class="action-sql">JOIN zones</span>
          <span class="action-sub">Lier aux Zones</span>
        </button>
      </div>

      <div class="sel-hint-bar">
        <span>💡 Appuie sur <kbd>Tab</kbd> pour libérer la souris et interagir avec les outils</span>
      </div>
    `;

    this.bindToolbarEvents();
  }

  bindToolbarEvents() {
    const bindClick = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = (e) => { e.stopPropagation(); fn(e); };
    };

    bindClick('btn-clear-sel', () => this.clearSelection());
    bindClick('btn-close-toolbar', () => this.clearSelection());
    bindClick('btn-close-toolbar-mini', () => this.clearSelection());
    bindClick('btn-minimize-toolbar', () => {
      this.isMinimized = true;
      this.renderToolbar();
      this.flashNotice("➖ Barre d'outils réduite en pastille discrète.");
    });
    bindClick('btn-unminimize-toolbar', () => {
      this.isMinimized = false;
      this.renderToolbar();
    });
    bindClick('btn-select-all', () => this.selectAll());
    bindClick('btn-open-sql-guide', () => this.showGuideModal());

    bindClick('btn-sql-show', () => {
      const ids = Array.from(this.selectedIds);
      this.db.selectBlocks(ids);
      sound.playSelect();
      this.flashNotice("📋 Requête SELECT exécutée et affichée dans la Console SQL !");
    });

    bindClick('btn-sql-count', () => {
      const ids = Array.from(this.selectedIds);
      const count = this.db.countBlocks(ids);
      sound.playSqlPulse();
      this.showCountResultModal(count, ids);
    });

    bindClick('btn-sql-join', () => {
      const ids = Array.from(this.selectedIds);
      const { results, hasBothZones } = this.db.joinZones(ids);

      // Render glowing 3D relationship laser beams
      const targetBlocs = ids.length > 0
        ? this.db.blocs.filter(b => ids.includes(b.id))
        : this.db.blocs;

      this.world.drawJoinRelationships(targetBlocs);
      sound.playJoinLaser();
      this.showJoinResultModal(results, hasBothZones, ids);
    });

    // Dropdown toggle helpers
    const setupDropdown = (triggerId, menuId) => {
      const trigger = document.getElementById(triggerId);
      const menu = document.getElementById(menuId);
      if (trigger && menu) {
        trigger.onclick = (e) => {
          e.stopPropagation();
          // Close other open dropdowns
          document.querySelectorAll('.dropdown-menu.open').forEach(m => {
            if (m !== menu) m.classList.remove('open');
          });
          menu.classList.toggle('open');
        };
      }
    };

    setupDropdown('btn-sql-filter', 'filter-menu');
    setupDropdown('btn-sql-sort', 'sort-menu');

    // Filter menu items
    const filterMenu = document.getElementById('filter-menu');
    if (filterMenu) {
      filterMenu.querySelectorAll('[data-filter-type]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const type = btn.getAttribute('data-filter-type');
          const ids = Array.from(this.selectedIds);
          const results = this.db.filterBlocks('type', type, ids.length > 0 ? ids : null);
          this.setSelectionFromResults(results);
          filterMenu.classList.remove('open');
          sound.playSelect();
          this.flashNotice(`🔍 WHERE type = '${type}' : ${results.length} bloc${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''} !`);
        };
      });

      filterMenu.querySelectorAll('[data-filter-color]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const color = btn.getAttribute('data-filter-color');
          const ids = Array.from(this.selectedIds);
          const results = this.db.filterBlocks('couleur', color, ids.length > 0 ? ids : null);
          this.setSelectionFromResults(results);
          filterMenu.classList.remove('open');
          sound.playSelect();
          this.flashNotice(`🔍 WHERE couleur = '${color}' : ${results.length} bloc${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''} !`);
        };
      });
    }

    // Sort menu items
    const sortMenu = document.getElementById('sort-menu');
    if (sortMenu) {
      sortMenu.querySelectorAll('[data-sort-field]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const field = btn.getAttribute('data-sort-field');
          const dir = btn.getAttribute('data-sort-dir') || 'ASC';
          const ids = Array.from(this.selectedIds);
          const sorted = this.db.orderBlocks(field, dir, ids.length > 0 ? ids : null);
          this.displayOrderBadges(sorted);
          this.showSortResultModal(sorted, field, dir);
          sortMenu.classList.remove('open');
          sound.playSqlPulse();
          this.flashNotice(`↕️ ORDER BY ${field} ${dir} appliqué (${sorted.length} blocs numérotés) !`);
        };
      });
    }

    // Close dropdowns on outer click
    document.addEventListener('click', () => {
      document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    });
  }

  // Toggle selection on clicked block - IMMEDIATELY EMITS SQL QUERY LIVE!
  toggleBlockSelection(blockId) {
    const isAdding = !this.selectedIds.has(blockId);
    if (isAdding) {
      this.selectedIds.add(blockId);
      sound.playSelect();
    } else {
      this.selectedIds.delete(blockId);
      sound.playSelect();
    }

    const ids = Array.from(this.selectedIds);
    // Execute SQL query live in the DB & SQL Console
    if (ids.length > 0) {
      this.db.selectBlocks(ids);
      this.flashNotice(isAdding
        ? `🔍 Bloc #${blockId} sélectionné (${ids.length} ciblé${ids.length > 1 ? 's' : ''}) • Requête envoyée à la Console SQL !`
        : `🔍 Bloc #${blockId} retiré (${ids.length} restant${ids.length > 1 ? 's' : ''}) • Requête actualisée !`
      );
    } else {
      this.db.selectBlocks([]);
      this.flashNotice("🔍 Sélection réinitialisée • SELECT * FROM blocs;");
    }

    this.updateVisuals();
  }

  selectAll() {
    this.selectedIds.clear();
    this.db.blocs.forEach(b => this.selectedIds.add(b.id));
    this.db.selectBlocks([]);
    sound.playSelect();
    this.flashNotice(`📋 Tous les ${this.selectedIds.size} blocs sélectionnés : SELECT * FROM blocs;`);
    this.updateVisuals();
  }

  clearSelection() {
    this.selectedIds.clear();
    this.clearOrderBadges();
    this.world.clearJoinRelationships();
    this.closeEduModal();
    this.showToolbar(false);
    this.db.emitQuery({
      query: `-- Sélection vidée\nSELECT * FROM blocs;`,
      op: 'SELECT',
      explanation: '🧹 Tu as fermé la boîte et vidé la sélection des blocs.',
      results: []
    });
    this.flashNotice("🧹 Boîte fermée et sélection réinitialisée.");
    this.updateVisuals();
  }

  setSelectionFromResults(results) {
    this.selectedIds.clear();
    results.forEach(b => this.selectedIds.add(b.id));
    this.updateVisuals();
  }

  showToolbar(show = true) {
    if (this.domContainer) {
      if (show) {
        this.domContainer.classList.remove('hidden');
      } else {
        this.domContainer.classList.add('hidden');
      }
    }
  }

  // Update 3D glowing bounding outlines and floating ID badges
  updateVisuals() {
    // Clear previous 3D highlights
    while (this.highlightGroup.children.length > 0) {
      const obj = this.highlightGroup.children[0];
      this.highlightGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
    this.tagSprites.clear();

    const boxGeo = new THREE.BoxGeometry(1.08, 1.08, 1.08);
    const boxMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    });

    this.selectedIds.forEach(id => {
      const mesh = this.blockManager.blockMeshes.get(id);
      if (!mesh) return;

      // Glowing wireframe box
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.copy(mesh.position);
      this.highlightGroup.add(box);

      // Floating holographic data tag
      const sprite = this.createTagSprite(id, mesh.userData);
      sprite.position.copy(mesh.position);
      sprite.position.y += 1.1;
      this.highlightGroup.add(sprite);
      this.tagSprites.set(id, sprite);
    });

    // Update DOM UI
    this.renderToolbar();
    if (this.selectedIds.size > 0) {
      this.showToolbar(true);
    } else {
      this.showToolbar(false);
    }
  }

  // 3D Tag Sprite showing ID and Zone
  createTagSprite(id, data) {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.roundRect(2, 2, 156, 60, 8);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`id: ${id}`, 80, 26);

    const zoneColorMap = { 1: '#4ade80', 2: '#38bdf8', 3: '#fbbf24' };
    const zoneNameMap = { 1: 'Nord', 2: 'Sud', 3: 'Mégalopole' };
    ctx.fillStyle = zoneColorMap[data.zoneId] || '#fbbf24';
    ctx.font = '14px monospace';
    ctx.fillText(`zone: ${zoneNameMap[data.zoneId] || 'Mégalopole'}`, 80, 48);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 0.55, 1);
    return sprite;
  }

  // Display numbered badges above sorted blocks
  displayOrderBadges(sortedBlocks) {
    this.clearOrderBadges();

    sortedBlocks.forEach((block, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      // Golden circle
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${index + 1}`, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.75, 0.75, 1);
      sprite.position.set(block.x, block.y + 1.8, block.z);

      this.scene.add(sprite);
      this.orderBadges.push(sprite);
    });

    // Auto-remove order badges after 6 seconds
    setTimeout(() => {
      this.clearOrderBadges();
    }, 6000);
  }

  clearOrderBadges() {
    this.orderBadges.forEach(s => {
      this.scene.remove(s);
      if (s.material.map) s.material.map.dispose();
      s.material.dispose();
    });
    this.orderBadges = [];
  }

  flashNotice(message) {
    let toast = document.getElementById('game-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'game-toast';
      toast.className = 'game-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2800);
  }

  getModalContainer() {
    let el = document.getElementById('sql-edu-modal-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sql-edu-modal-container';
      el.className = 'sql-edu-modal-backdrop hidden';
      document.body.appendChild(el);
    }
    return el;
  }

  closeEduModal() {
    const el = document.getElementById('sql-edu-modal-container');
    if (el) {
      el.classList.add('hidden');
      el.innerHTML = '';
    }
  }

  // 1. Comprehensive Guide Modal explaining all 5 tools
  showGuideModal() {
    const container = this.getModalContainer();
    container.innerHTML = `
      <div class="sql-edu-modal-card">
        <div class="edu-modal-header">
          <div class="edu-title-group">
            <span class="edu-icon">🎓</span>
            <div>
              <h3>Guide des Outils du Mode Requête SQL</h3>
              <p class="edu-subtitle">Comprendre l'utilité de chaque outil et comment les utiliser dans le jeu</p>
            </div>
          </div>
          <button class="btn-close-modal" id="btn-close-guide">✕</button>
        </div>

        <div class="edu-tools-grid">
          <!-- SELECT -->
          <div class="edu-tool-card tool-select">
            <div class="tool-card-top">
              <span class="tool-badge badge-select">📋 SELECT</span>
              <span class="tool-role">Lecture des données</span>
            </div>
            <h4>Afficher les blocs</h4>
            <div class="tool-section">
              <strong>💡 À quoi ça sert ?</strong>
              <p>L'opération fondamentale du SQL ! Permet d'extraire et inspecter les lignes de la table sans rien modifier.</p>
            </div>
            <div class="tool-section">
              <strong>🎮 Comment l'utiliser ?</strong>
              <p>Avec l'outil Loupe (touche 6), clique directement sur des blocs dans le monde 3D. Chaque clic génère et actualise en direct la requête dans la console SQL !</p>
            </div>
            <div class="tool-sql-sample">
              <code>SELECT * FROM blocs WHERE id = 12;</code>
            </div>
          </div>

          <!-- WHERE -->
          <div class="edu-tool-card tool-where">
            <div class="tool-card-top">
              <span class="tool-badge badge-where">🔍 WHERE</span>
              <span class="tool-role">Filtrage conditionnel</span>
            </div>
            <h4>Filtrer par critère</h4>
            <div class="tool-section">
              <strong>💡 À quoi ça sert ?</strong>
              <p>Poser une condition pour ne retenir que les données voulues (ex: seulement les blocs rouges ou uniquement les portes) au lieu de tout charger.</p>
            </div>
            <div class="tool-section">
              <strong>🎮 Comment l'utiliser ?</strong>
              <p>Clique sur <em>Filtrer (WHERE ▾)</em> et choisis un type ou une couleur. Les blocs exclus s'éteignent, seuls les blocs validés restent allumés en 3D !</p>
            </div>
            <div class="tool-sql-sample">
              <code>SELECT * FROM blocs WHERE couleur = 'rouge';</code>
            </div>
          </div>

          <!-- ORDER BY -->
          <div class="edu-tool-card tool-order">
            <div class="tool-card-top">
              <span class="tool-badge badge-order">↕️ ORDER BY</span>
              <span class="tool-role">Classement ordonné</span>
            </div>
            <h4>Trier dans l'espace</h4>
            <div class="tool-section">
              <strong>💡 À quoi ça sert ?</strong>
              <p>Organiser les lignes dans un ordre précis : croissant (ASC), décroissant (DESC), alphabétique ou par coordonnées géographiques (X, Z).</p>
            </div>
            <div class="tool-section">
              <strong>🎮 Comment l'utiliser ?</strong>
              <p>Clique sur <em>Trier (ORDER BY ▾)</em> et choisis un critère (ex: Position X). Des badges dorés 1, 2, 3... apparaissent au-dessus des blocs pour visualiser le tri dans l'espace !</p>
            </div>
            <div class="tool-sql-sample">
              <code>SELECT * FROM blocs ORDER BY x ASC;</code>
            </div>
          </div>

          <!-- COUNT -->
          <div class="edu-tool-card tool-count">
            <div class="tool-card-top">
              <span class="tool-badge badge-count">🔢 COUNT(*)</span>
              <span class="tool-role">Fonction d'agrégation</span>
            </div>
            <h4>Compter les lignes</h4>
            <div class="tool-section">
              <strong>💡 À quoi ça sert ?</strong>
              <p>Calculer immédiatement le nombre total de lignes sans tout transférer. Idéal sur des bases avec des millions d'enregistrements !</p>
            </div>
            <div class="tool-section">
              <strong>🎮 Comment l'utiliser ?</strong>
              <p>Sélectionne quelques blocs (ou aucun pour tout le monde) et clique sur <em>Compter (COUNT(*))</em> pour ouvrir le bilan d'agrégation instantané.</p>
            </div>
            <div class="tool-sql-sample">
              <code>SELECT COUNT(*) FROM blocs;</code>
            </div>
          </div>

          <!-- JOIN -->
          <div class="edu-tool-card tool-join">
            <div class="tool-card-top">
              <span class="tool-badge badge-join">🔗 JOIN</span>
              <span class="tool-role">Lien Relationnel</span>
            </div>
            <h4>Relier Blocs &amp; Zones</h4>
            <div class="tool-section">
              <strong>💡 À quoi ça sert ?</strong>
              <p>C'est le génie du relationnel ! Fusionner deux tables séparées (<code>blocs</code> et <code>zones</code>) grâce à la clé étrangère <code>zone_id</code>.</p>
            </div>
            <div class="tool-section">
              <strong>🎮 Comment l'utiliser ?</strong>
              <p>Place des blocs au Nord et au Sud, puis clique sur <em>Relier (JOIN zones)</em> : des lasers holographiques 3D relient chaque bloc à sa zone et le tableau fusionné s'affiche !</p>
            </div>
            <div class="tool-sql-sample">
              <code>SELECT * FROM blocs JOIN zones ON zones.id = blocs.zone_id;</code>
            </div>
          </div>
        </div>

        <div class="edu-modal-footer">
          <span class="edu-tip">💡 Astuce : Appuie sur <strong>Tab</strong> pour libérer la souris et tester tous les boutons !</span>
          <button class="btn-primary" id="btn-close-guide-ok">J'ai compris, retour au jeu 🚀</button>
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    sound.playSelect();

    const close = () => this.closeEduModal();
    document.getElementById('btn-close-guide').onclick = close;
    document.getElementById('btn-close-guide-ok').onclick = close;
  }

  // 2. COUNT result modal with clear explanation
  showCountResultModal(count, ids) {
    const container = this.getModalContainer();
    const isSubset = ids && ids.length > 0;
    const query = isSubset
      ? `SELECT COUNT(*) AS total_selection\nFROM blocs\nWHERE id IN (${ids.join(', ')});`
      : `SELECT COUNT(*) AS total_monde\nFROM blocs;`;

    container.innerHTML = `
      <div class="sql-edu-modal-card mini-card">
        <div class="edu-modal-header">
          <div class="edu-title-group">
            <span class="edu-icon">🔢</span>
            <div>
              <h3>Agrégation SQL : COUNT(*)</h3>
              <p class="edu-subtitle">Calcul du nombre total de lignes ciblées</p>
            </div>
          </div>
          <button class="btn-close-modal" id="btn-close-count">✕</button>
        </div>

        <div class="count-display-box">
          <div class="count-big-number">${count}</div>
          <div class="count-big-label">bloc${count > 1 ? 's' : ''} compté${count > 1 ? 's' : ''}</div>
        </div>

        <div class="edu-sql-box">
          <div class="sql-box-label">REQUÊTE SQL EXÉCUTÉE :</div>
          <pre><code>${query}</code></pre>
        </div>

        <div class="edu-explanation-box">
          <strong>💡 À quoi ça sert concrètement ?</strong>
          <p>Au lieu de télécharger toutes les colonnes de chaque bloc pour les compter à la main, <code>COUNT(*)</code> ordonne au moteur SQL de renvoyer directement le total calculé en mémoire vive. C'est ultra-rapide et économique !</p>
        </div>

        <div class="edu-modal-footer">
          <button class="btn-primary" id="btn-close-count-ok">Super ! Continuer</button>
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    const close = () => this.closeEduModal();
    document.getElementById('btn-close-count').onclick = close;
    document.getElementById('btn-close-count-ok').onclick = close;
  }

  // 3. JOIN result modal with relational diagram and merged preview
  showJoinResultModal(results, hasBothZones, ids) {
    const container = this.getModalContainer();
    const rowsHtml = results.slice(0, 8).map(r => `
      <tr>
        <td><span class="badge badge-pk">#${r.bloc_id}</span></td>
        <td>${r.type}</td>
        <td><span class="color-pill ${r.couleur}">${r.couleur}</span></td>
        <td><span class="badge badge-fk">FK: ${r.zone_id}</span></td>
        <td><strong>${r.zone_nom}</strong></td>
        <td><span class="biome-tag">${r.zone_biome}</span></td>
      </tr>
    `).join('');

    const query = ids && ids.length > 0
      ? `SELECT blocs.id, blocs.type, blocs.couleur, zones.nom AS nom_zone, zones.biome\nFROM blocs\nJOIN zones ON zones.id = blocs.zone_id\nWHERE blocs.id IN (${ids.join(', ')});`
      : `SELECT blocs.id, blocs.type, blocs.couleur, zones.nom AS nom_zone, zones.biome\nFROM blocs\nJOIN zones ON zones.id = blocs.zone_id;`;

    container.innerHTML = `
      <div class="sql-edu-modal-card large-card">
        <div class="edu-modal-header">
          <div class="edu-title-group">
            <span class="edu-icon">🔗</span>
            <div>
              <h3>Lien Relationnel : JOIN blocs &amp; zones</h3>
              <p class="edu-subtitle">Fusion de deux tables via la clé étrangère <code>zone_id</code></p>
            </div>
          </div>
          <button class="btn-close-modal" id="btn-close-join">✕</button>
        </div>

        <!-- Relational Concept Diagram -->
        <div class="join-concept-diagram">
          <div class="diagram-table">
            <div class="diag-header">Table: blocs</div>
            <div class="diag-row">id (Clé Primaire)</div>
            <div class="diag-row">type, couleur, x, y, z</div>
            <div class="diag-row highlight-fk">zone_id (Clé Étrangère 🗝️)</div>
          </div>

          <div class="diagram-connector">
            <span class="connector-arrow">➔ 🔗 JOIN ON zones.id = blocs.zone_id ➔</span>
          </div>

          <div class="diagram-table">
            <div class="diag-header">Table: zones</div>
            <div class="diag-row highlight-pk">id (Clé Primaire 🔑)</div>
            <div class="diag-row">nom (Zone Nord, Sud...)</div>
            <div class="diag-row">biome, sol</div>
          </div>
        </div>

        <div class="edu-sql-box">
          <div class="sql-box-label">REQUÊTE RELATIONNELLE :</div>
          <pre><code>${query}</code></pre>
        </div>

        <!-- Merged Data Table Preview -->
        <div class="join-table-wrapper">
          <div class="table-preview-title">Données Fusionnées (Résultat du JOIN) :</div>
          <table class="join-data-table">
            <thead>
              <tr>
                <th>blocs.id</th>
                <th>blocs.type</th>
                <th>blocs.couleur</th>
                <th>blocs.zone_id</th>
                <th>zones.nom</th>
                <th>zones.biome</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="6" style="text-align:center;">Aucun bloc dans la sélection</td></tr>'}
            </tbody>
          </table>
          ${results.length > 8 ? `<div class="table-more-hint">+ ${results.length - 8} autres blocs reliés...</div>` : ''}
        </div>

        <div class="edu-explanation-box">
          <strong>💡 Pourquoi le JOIN est essentiel ?</strong>
          <p>Dans une vraie entreprise, on ne répète jamais le nom ou la description d'une catégorie dans chaque produit. On utilise une clé étrangère (<code>zone_id</code>). Le <code>JOIN</code> recolle les morceaux instantanément !</p>
        </div>

        <div class="edu-modal-footer">
          <button class="btn-primary" id="btn-close-join-ok">Fermer et observer les lasers 3D ✨</button>
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    const close = () => this.closeEduModal();
    document.getElementById('btn-close-join').onclick = close;
    document.getElementById('btn-close-join-ok').onclick = close;
  }

  // 4. SORT result modal showing ordered rows
  showSortResultModal(sortedBlocks, field, dir) {
    const container = this.getModalContainer();
    const rowsHtml = sortedBlocks.slice(0, 10).map((b, i) => `
      <div class="sort-rank-item">
        <span class="sort-rank-badge">#${i + 1}</span>
        <span class="sort-block-info">Bloc #${b.id} (${b.type}, ${b.couleur})</span>
        <span class="sort-field-val"><strong>${field}</strong> = ${b[field]}</span>
      </div>
    `).join('');

    const query = `SELECT * FROM blocs\nORDER BY ${field} ${dir};`;

    container.innerHTML = `
      <div class="sql-edu-modal-card mini-card">
        <div class="edu-modal-header">
          <div class="edu-title-group">
            <span class="edu-icon">↕️</span>
            <div>
              <h3>Tri Spatial : ORDER BY ${field} ${dir}</h3>
              <p class="edu-subtitle">Classement ordonné des blocs</p>
            </div>
          </div>
          <button class="btn-close-modal" id="btn-close-sort">✕</button>
        </div>

        <div class="edu-sql-box">
          <div class="sql-box-label">REQUÊTE EXÉCUTÉE :</div>
          <pre><code>${query}</code></pre>
        </div>

        <div class="sort-ranks-list">
          ${rowsHtml || '<div style="color:#94a3b8;">Aucun bloc classé</div>'}
        </div>

        <div class="edu-explanation-box">
          <strong>💡 Regarde dans le monde 3D !</strong>
          <p>Des badges dorés numérotés <strong>1, 2, 3...</strong> flottent au-dessus des blocs pour visualiser précisément la séquence de tri dans l'espace.</p>
        </div>

        <div class="edu-modal-footer">
          <button class="btn-primary" id="btn-close-sort-ok">Parfait !</button>
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    const close = () => this.closeEduModal();
    document.getElementById('btn-close-sort').onclick = close;
    document.getElementById('btn-close-sort-ok').onclick = close;
  }

  update(delta) {
    // Pulse highlight bounding boxes
    if (this.highlightGroup.children.length > 0) {
      const scale = 1.05 + 0.04 * Math.sin(Date.now() * 0.006);
      this.highlightGroup.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.scale.set(scale, scale, scale);
        }
      });
    }
  }
}
