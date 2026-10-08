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

  renderToolbar() {
    const count = this.selectedIds.size;
    this.domContainer.innerHTML = `
      <div class="sel-header">
        <span class="sel-icon">🔍</span>
        <span class="sel-title">Mode Requête SQL</span>
        <span class="sel-count badge">${count} bloc${count > 1 ? 's' : ''} ciblé${count > 1 ? 's' : ''}</span>
        <button id="btn-select-all" class="btn-xs" title="Sélectionner tous les blocs">Tous (SELECT *)</button>
        <button id="btn-clear-sel" class="btn-xs btn-danger" title="Désélectionner tout">✕</button>
      </div>

      <div class="sel-actions">
        <button id="btn-sql-show" class="btn-action" title="SELECT * FROM blocs WHERE id IN (...)">
          <span class="action-icon">📋</span>
          <span class="action-text">Afficher</span>
          <span class="action-sql">SELECT</span>
        </button>

        <div class="dropdown-wrapper">
          <button id="btn-sql-filter" class="btn-action dropdown-trigger" title="WHERE type = ... ou WHERE couleur = ...">
            <span class="action-icon">🔍</span>
            <span class="action-text">Filtrer</span>
            <span class="action-sql">WHERE ▾</span>
          </button>
          <div class="dropdown-menu" id="filter-menu">
            <div class="dropdown-group-title">Filtrer par type</div>
            <button class="dropdown-item" data-filter-type="maison">🏠 Maison</button>
            <button class="dropdown-item" data-filter-type="tour">🗼 Tour</button>
            <button class="dropdown-item" data-filter-type="ferme">🌾 Ferme</button>
            <button class="dropdown-item" data-filter-type="pont">🌉 Pont</button>
            <div class="dropdown-group-title">Filtrer par couleur</div>
            <button class="dropdown-item" data-filter-color="rouge"><span class="color-dot red"></span> Rouge</button>
            <button class="dropdown-item" data-filter-color="bleu"><span class="color-dot blue"></span> Bleu</button>
            <button class="dropdown-item" data-filter-color="vert"><span class="color-dot green"></span> Vert</button>
            <button class="dropdown-item" data-filter-color="jaune"><span class="color-dot yellow"></span> Jaune</button>
          </div>
        </div>

        <div class="dropdown-wrapper">
          <button id="btn-sql-sort" class="btn-action dropdown-trigger" title="ORDER BY ...">
            <span class="action-icon">↕️</span>
            <span class="action-text">Trier</span>
            <span class="action-sql">ORDER BY ▾</span>
          </button>
          <div class="dropdown-menu" id="sort-menu">
            <button class="dropdown-item" data-sort-field="x" data-sort-dir="ASC">📍 Position X (Ouest ➔ Est)</button>
            <button class="dropdown-item" data-sort-field="z" data-sort-dir="ASC">📍 Position Z (Nord ➔ Sud)</button>
            <button class="dropdown-item" data-sort-field="type" data-sort-dir="ASC">🔤 Type alphabétique</button>
            <button class="dropdown-item" data-sort-field="id" data-sort-dir="DESC">🆔 Id décroissant</button>
          </div>
        </div>

        <button id="btn-sql-count" class="btn-action" title="SELECT COUNT(*) FROM blocs">
          <span class="action-icon">🔢</span>
          <span class="action-text">Compter</span>
          <span class="action-sql">COUNT(*)</span>
        </button>

        <button id="btn-sql-join" class="btn-action btn-join" title="SELECT * FROM blocs JOIN zones ON zones.id = blocs.zone_id">
          <span class="action-icon">🔗</span>
          <span class="action-text">Relier</span>
          <span class="action-sql">JOIN zones</span>
        </button>
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
    bindClick('btn-select-all', () => this.selectAll());

    bindClick('btn-sql-show', () => {
      const ids = Array.from(this.selectedIds);
      this.db.selectBlocks(ids);
      sound.playSelect();
      this.flashNotice("📋 Données chargées dans la console SQL !");
    });

    bindClick('btn-sql-count', () => {
      const ids = Array.from(this.selectedIds);
      const count = this.db.countBlocks(ids);
      sound.playSqlPulse();
      this.flashNotice(`🔢 COUNT(*) = ${count} bloc${count > 1 ? 's' : ''} !`);
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

      if (hasBothZones) {
        this.flashNotice("✨ JOIN réussi ! Liens tracés entre Nord et Sud !");
      } else {
        this.flashNotice("🔗 JOIN exécuté ! Place des blocs au Nord ET au Sud pour voir le pont !");
      }
    });

    // Dropdown toggle helpers
    const setupDropdown = (triggerId, menuId) => {
      const trigger = document.getElementById(triggerId);
      const menu = document.getElementById(menuId);
      if (trigger && menu) {
        trigger.onclick = (e) => {
          e.stopPropagation();
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
          const results = this.db.filterBlocks('type', type);
          this.setSelectionFromResults(results);
          filterMenu.classList.remove('open');
          sound.playSelect();
        };
      });

      filterMenu.querySelectorAll('[data-filter-color]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const color = btn.getAttribute('data-filter-color');
          const results = this.db.filterBlocks('couleur', color);
          this.setSelectionFromResults(results);
          filterMenu.classList.remove('open');
          sound.playSelect();
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
          const sorted = this.db.orderBlocks(field, dir);
          this.displayOrderBadges(sorted);
          sortMenu.classList.remove('open');
          sound.playSqlPulse();
        };
      });
    }

    // Close dropdowns on outer click
    document.addEventListener('click', () => {
      document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    });
  }

  // Toggle selection on clicked block
  toggleBlockSelection(blockId) {
    if (this.selectedIds.has(blockId)) {
      this.selectedIds.delete(blockId);
    } else {
      this.selectedIds.add(blockId);
      sound.playSelect();
    }
    this.updateVisuals();
  }

  selectAll() {
    this.selectedIds.clear();
    this.db.blocs.forEach(b => this.selectedIds.add(b.id));
    this.db.selectBlocks([]);
    sound.playSelect();
    this.updateVisuals();
  }

  clearSelection() {
    this.selectedIds.clear();
    this.clearOrderBadges();
    this.world.clearJoinRelationships();
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
