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

    this.zonePinsGroup = new THREE.Group();
    this.scene.add(this.zonePinsGroup);

    this.tagSprites = new Map(); // id -> Sprite
    this.orderBadges = []; // floating order number sprites
    this.zonePins = []; // floating candidate zone pins

    this.isMinimized = false;
    this.isLinkModeActive = false;
    this.domContainer = null;
    this.linkHudContainer = null;
    this.createUI();
    this.createLinkHud();
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
        <button id="btn-sql-show" class="btn-action btn-show-action" title="Exécute SELECT sur les blocs ciblés et affiche leurs détails">
          <span class="action-icon">📋</span>
          <span class="action-text">Afficher</span>
          <span class="action-sql">SELECT</span>
          <span class="action-sub">Lire les lignes</span>
        </button>

        <button id="btn-sql-count" class="btn-action btn-count-action" title="Fonction d'agrégation : compte le nombre total de blocs sans tout télécharger">
          <span class="action-icon">🔢</span>
          <span class="action-text">Compter</span>
          <span class="action-sql">COUNT(*)</span>
          <span class="action-sub">Nombre total</span>
        </button>
      </div>

      <div class="sel-hint-bar">
        <span>💡 Vise et clique sur des blocs pour actualiser la sélection • Touche <kbd>Tab</kbd> pour libérer la souris • Touche <kbd>7</kbd> pour Relier</span>
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
      const results = this.db.selectBlocks(ids);
      sound.playSelect();
      this.flashNotice("📋 Requête SELECT exécutée et affichée dans la Console SQL !");
      this.showSelectResultModal(results, ids);
    });

    bindClick('btn-sql-count', () => {
      const ids = Array.from(this.selectedIds);
      const count = this.db.countBlocks(ids);
      sound.playSqlPulse();
      this.showCountResultModal(count, ids);
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
    this.showLinkHud(false);
    this.clearZonePins();
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
      if (show && !this.isLinkModeActive) {
        this.domContainer.classList.remove('hidden');
      } else {
        this.domContainer.classList.add('hidden');
      }
    }
  }

  // Set DOM container for Link Tool HUD (Slot 7)
  createLinkHud() {
    let hud = document.getElementById('link-tool-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'link-tool-hud';
      hud.className = 'link-tool-hud hidden';
      document.body.appendChild(hud);
    }
    this.linkHudContainer = hud;
    this.renderLinkHud();
  }

  showLinkHud(show = true) {
    if (this.linkHudContainer) {
      if (show) {
        this.linkHudContainer.classList.remove('hidden');
      } else {
        this.linkHudContainer.classList.add('hidden');
      }
    }
  }

  activateLinkTool(active = true) {
    this.isLinkModeActive = active;
    if (active) {
      this.showLinkHud(true);
      this.showToolbar(false);
      this.renderLinkHud();
      this.updateZonePins();
      this.flashNotice("🔗 Outil Relier actif : Vise et clique sur un bloc au Nord, puis un bloc au Sud (ou appuie sur R) !");
    } else {
      this.showLinkHud(false);
      this.clearZonePins();
      if (this.selectedIds.size > 0) {
        this.showToolbar(true);
      }
    }
  }

  renderLinkHud() {
    if (!this.linkHudContainer) return;

    const selected = this.db.blocs.filter(b => this.selectedIds.has(b.id));
    const blockNord = selected.find(b => b.zone_id === 1);
    const blockSud = selected.find(b => b.zone_id >= 2);
    const hasBoth = Boolean(blockNord && blockSud);

    this.linkHudContainer.innerHTML = `
      <div class="link-hud-bar">
        <div class="link-hud-header">
          <span class="link-hud-icon">🔗</span>
          <span class="link-hud-title">OUTIL RELIER — JOINTURE RELATIONNELLE (JOIN)</span>
          <span class="badge badge-join">Touche 7 ou R</span>
        </div>

        <div class="link-hud-cards">
          <div class="link-zone-slot ${blockNord ? 'is-selected' : 'is-empty'}">
            <div class="zone-pill pill-nord">🟢 Table blocs (Zone Nord)</div>
            <div class="slot-desc">${blockNord ? `<strong>Bloc #${blockNord.id}</strong> (${blockNord.type}, ${blockNord.couleur})` : '👉 Vise un bloc au Nord et clique'}</div>
          </div>

          <div class="link-hud-connector ${hasBoth ? 'is-linked' : ''}">
            <span class="connector-txt">➔ 🔗 JOIN ON zones.id = blocs.zone_id ➔</span>
          </div>

          <div class="link-zone-slot ${blockSud ? 'is-selected' : 'is-empty'}">
            <div class="zone-pill pill-sud">🔵 Table blocs (${blockSud ? this.getZoneName(blockSud.zone_id) : 'Zone Sud / Mégalopole'})</div>
            <div class="slot-desc">${blockSud ? `<strong>Bloc #${blockSud.id}</strong> (${blockSud.type}, ${blockSud.couleur})` : '👉 Vise un bloc au Sud et clique'}</div>
          </div>
        </div>

        <div class="link-hud-actions">
          <button id="btn-hud-tp-zone" class="btn-xs btn-zone-tp" title="Se téléporter vers l'autre zone (Touche J)">
            ${blockNord && !blockSud ? '📍 Aller en Zone Sud (J)' : '📍 Aller en Zone Nord (J)'}
          </button>
          <button id="btn-hud-exec-join" class="btn-xs btn-primary ${hasBoth ? 'btn-pulse' : ''}" title="Déclencher la jointure relationnelle (Touche R)">
            ⚡ Relier maintenant (Touche R)
          </button>
          <button id="btn-hud-auto-link" class="btn-xs btn-autojoin" title="Relier automatiquement 1 bloc du Nord et 1 bloc du Sud en 1 clic">
            🪄 Auto-Relier (Nord + Sud)
          </button>
          <button id="btn-hud-clear" class="btn-xs btn-danger" title="Vider la sélection">✕ Vider</button>
        </div>
      </div>
    `;

    const bindHud = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = (e) => { e.stopPropagation(); fn(e); };
    };

    bindHud('btn-hud-tp-zone', () => {
      if (window.sqlCraft && window.sqlCraft.controller) {
        if (blockNord && !blockSud) {
          window.sqlCraft.controller.teleportToZone(2);
        } else {
          window.sqlCraft.controller.teleportToZone(1);
        }
      }
    });

    bindHud('btn-hud-exec-join', () => {
      this.triggerQuickJoin();
    });

    bindHud('btn-hud-auto-link', () => {
      this.autoLinkAcrossZones();
    });

    bindHud('btn-hud-clear', () => {
      this.clearSelection();
    });
  }

  // Floating candidate zone pins across the entire world for easy targeting
  updateZonePins() {
    this.clearZonePins();

    const canvasMap = {
      1: { fill: 'rgba(22, 101, 52, 0.85)', stroke: '#4ade80', label: 'Nord' },
      2: { fill: 'rgba(3, 105, 161, 0.85)', stroke: '#38bdf8', label: 'Sud' },
      3: { fill: 'rgba(180, 83, 9, 0.85)', stroke: '#facc15', label: 'Mégalopole' }
    };

    this.db.blocs.forEach(b => {
      if (this.selectedIds.has(b.id)) return;

      const info = canvasMap[b.zone_id] || canvasMap[1];
      const canvas = document.createElement('canvas');
      canvas.width = 140;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = info.fill;
      ctx.roundRect(2, 2, 136, 44, 8);
      ctx.fill();
      ctx.strokeStyle = info.stroke;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`#${b.id} ${info.label}`, 70, 28);

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, opacity: 0.85 });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(1.1, 0.4, 1);
      sprite.position.set(b.x, b.y + 1.25, b.z);

      this.zonePinsGroup.add(sprite);
      this.zonePins.push(sprite);
    });
  }

  clearZonePins() {
    while (this.zonePinsGroup.children.length > 0) {
      const obj = this.zonePinsGroup.children[0];
      this.zonePinsGroup.remove(obj);
      if (obj.material && obj.material.map) obj.material.map.dispose();
      if (obj.material) obj.material.dispose();
    }
    this.zonePins = [];
  }

  getZoneName(zoneId) {
    if (zoneId === 1) return 'Zone Nord';
    if (zoneId === 2) return 'Zone Sud';
    return 'Zone Mégalopole';
  }

  // Handle direct click in Slot 7 (Relier tool)
  handleLinkToolClick(blockId) {
    const block = this.db.blocs.find(b => b.id === blockId);
    if (!block) return;

    const selectedBlocs = this.db.blocs.filter(b => this.selectedIds.has(b.id));

    if (selectedBlocs.length === 0) {
      this.selectedIds.add(blockId);
      this.updateVisuals();
      sound.playSelect();
      this.flashNotice(`🔗 Étape 1/2 : Bloc #${block.id} (${this.getZoneName(block.zone_id)}) sélectionné ! Vise maintenant un bloc en Zone Sud (ou appuie sur J).`);
      return;
    }

    if (selectedBlocs.length === 1) {
      const first = selectedBlocs[0];
      if (first.id === block.id) {
        this.selectedIds.delete(blockId);
        this.updateVisuals();
        sound.playSelect();
        this.flashNotice(`🔗 Bloc #${block.id} retiré de la liaison.`);
        return;
      }

      if (first.zone_id === block.zone_id) {
        this.selectedIds.clear();
        this.selectedIds.add(block.id);
        this.updateVisuals();
        sound.playSelect();
        this.flashNotice(`💡 Ce bloc est aussi en ${this.getZoneName(block.zone_id)}. Pour un JOIN relationnel, vise un bloc dans une AUTRE zone (Sud ou Mégalopole, touche J) !`);
        return;
      }

      // 2 blocks from different zones selected!
      this.selectedIds.add(block.id);
      this.updateVisuals();
      const ids = [first.id, block.id];
      const targetBlocs = [first, block];
      const { results, hasBothZones } = this.db.joinZones(ids);
      this.world.drawJoinRelationships(targetBlocs);
      sound.playJoinLaser();
      this.showJoinResultModal(results, hasBothZones, ids);
      this.flashNotice(`🎉 Jointure établie ! Bloc #${first.id} (${this.getZoneName(first.zone_id)}) ➔ Bloc #${block.id} (${this.getZoneName(block.zone_id)}) reliés avec succès !`);
      return;
    }

    // Already 2+ selected
    if (this.selectedIds.has(blockId)) {
      this.selectedIds.delete(blockId);
      this.updateVisuals();
    } else {
      this.selectedIds.add(blockId);
      this.updateVisuals();
      this.triggerQuickJoin();
    }
  }

  // Quick join execution via Touche R or UI button
  triggerQuickJoin() {
    const ids = Array.from(this.selectedIds);
    const selectedBlocs = this.db.blocs.filter(b => ids.includes(b.id));
    const uniqueZones = new Set(selectedBlocs.map(b => b.zone_id));

    // If blocks from at least 2 zones are already selected:
    if (uniqueZones.size >= 2) {
      const { results, hasBothZones } = this.db.joinZones(ids);
      this.world.drawJoinRelationships(selectedBlocs);
      sound.playJoinLaser();
      this.showJoinResultModal(results, hasBothZones, ids);
      this.flashNotice(`✨ JOIN réussi ! ${uniqueZones.size} zones reliées par la clé étrangère zone_id !`);
      return;
    }

    // If only 1 block or blocks in only 1 zone are selected:
    if (selectedBlocs.length > 0) {
      const currentZone = selectedBlocs[0].zone_id;
      const targetZone = currentZone === 1 ? 2 : 1;
      let candidate = this.db.blocs.find(b => b.zone_id === targetZone);

      if (!candidate) {
        const zCoord = targetZone === 1 ? 25 : 85;
        candidate = this.blockManager.placeBlock('beton', 'bleu', { x: 18, y: 1, z: zCoord });
      }

      this.selectedIds.add(candidate.id);
      this.updateVisuals();

      const newIds = Array.from(this.selectedIds);
      const newTargetBlocs = this.db.blocs.filter(b => newIds.includes(b.id));
      const { results, hasBothZones } = this.db.joinZones(newIds);
      this.world.drawJoinRelationships(newTargetBlocs);
      sound.playJoinLaser();
      this.showJoinResultModal(results, hasBothZones, newIds);
      this.flashNotice(`✨ Bloc #${selectedBlocs[0].id} (${this.getZoneName(currentZone)}) relié avec succès au Bloc #${candidate.id} (${this.getZoneName(targetZone)}) !`);
      return;
    }

    // If no blocks are selected at all, auto-link 2 blocks across zones!
    this.autoLinkAcrossZones();
  }

  // Automatically select 1 block in Zone 1 and 1 block in Zone 2 and execute JOIN
  autoLinkAcrossZones() {
    let blockNord = this.db.blocs.find(b => b.zone_id === 1);
    if (!blockNord) {
      blockNord = this.blockManager.placeBlock('beton', 'rouge', { x: 15, y: 1, z: 20 });
    }

    let blockSud = this.db.blocs.find(b => b.zone_id === 2);
    if (!blockSud) {
      blockSud = this.blockManager.placeBlock('beton', 'bleu', { x: 18, y: 1, z: 85 });
    }

    this.selectedIds.clear();
    this.selectedIds.add(blockNord.id);
    this.selectedIds.add(blockSud.id);
    this.updateVisuals();

    const ids = [blockNord.id, blockSud.id];
    const targetBlocs = [blockNord, blockSud];
    const { results, hasBothZones } = this.db.joinZones(ids);
    this.world.drawJoinRelationships(targetBlocs);
    sound.playJoinLaser();
    this.showJoinResultModal(results, hasBothZones, ids);
    this.flashNotice(`⚡ Auto-Relier : Bloc #${blockNord.id} (Nord) et Bloc #${blockSud.id} (Sud) reliés en direct !`);
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
    this.renderLinkHud();

    if (this.isLinkModeActive) {
      this.showLinkHud(true);
      this.showToolbar(false);
      this.updateZonePins();
    } else if (this.selectedIds.size > 0) {
      this.showToolbar(true);
      this.showLinkHud(false);
      this.clearZonePins();
    } else {
      this.showToolbar(false);
      this.showLinkHud(false);
      this.clearZonePins();
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
              <p>Avec l'outil Loupe (touche 6), clique sur des blocs dans le monde 3D, puis clique sur <em>Afficher (SELECT)</em> pour inspecter les données !</p>
            </div>
            <div class="tool-sql-sample">
              <code>SELECT * FROM blocs WHERE id IN (1, 4);</code>
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
              <p>Sélectionne quelques blocs (ou aucun pour tout compter) et clique sur <em>Compter (COUNT(*))</em> pour ouvrir le bilan d'agrégation instantané.</p>
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
              <p>Équipe l'outil dédié <strong>Relier (touche 7)</strong> ou appuie sur <strong>R</strong> : clique sur un bloc au Nord puis un bloc au Sud pour voir les lasers jaillir !</p>
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

  // 1. SELECT result modal showing fetched rows
  showSelectResultModal(results, ids) {
    const container = this.getModalContainer();
    const rowsHtml = results.slice(0, 10).map(r => `
      <tr>
        <td><span class="badge badge-pk">#${r.id}</span></td>
        <td><span class="type-badge badge-${r.type}">${r.type}</span></td>
        <td><span class="color-pill ${r.couleur}">${r.couleur}</span></td>
        <td><code>${r.x}</code></td>
        <td><code>${r.y}</code></td>
        <td><code>${r.z}</code></td>
        <td><span class="badge badge-fk">${this.getZoneName(r.zone_id)}</span></td>
      </tr>
    `).join('');

    const query = this.getCurrentSQLQuery();

    container.innerHTML = `
      <div class="sql-edu-modal-card large-card">
        <div class="edu-modal-header">
          <div class="edu-title-group">
            <span class="edu-icon">📋</span>
            <div>
              <h3>Lecture de Données : SELECT</h3>
              <p class="edu-subtitle">Consultation des lignes ciblées dans la table <code>blocs</code></p>
            </div>
          </div>
          <button class="btn-close-modal" id="btn-close-select">✕</button>
        </div>

        <div class="edu-sql-box">
          <div class="sql-box-label">REQUÊTE EXÉCUTÉE :</div>
          <pre><code>${query}</code></pre>
        </div>

        <div class="join-table-wrapper">
          <div class="table-preview-title">Lignes lues (${results.length} bloc${results.length > 1 ? 's' : ''}) :</div>
          <table class="join-data-table">
            <thead>
              <tr>
                <th>id (PK)</th>
                <th>type</th>
                <th>couleur</th>
                <th>x</th>
                <th>y</th>
                <th>z</th>
                <th>zone</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" style="text-align:center;">Aucun bloc dans la sélection</td></tr>'}
            </tbody>
          </table>
          ${results.length > 10 ? `<div class="table-more-hint">+ ${results.length - 10} autres blocs...</div>` : ''}
        </div>

        <div class="edu-explanation-box">
          <strong>💡 Le Cœur de la Lecture en SQL (CRUD : Read)</strong>
          <p>La commande <code>SELECT</code> extrait précisément les données en mémoire vive sans modifier le monde. Les lignes ci-dessus correspondent aux blocs sélectionnés avec votre réticule !</p>
        </div>

        <div class="edu-modal-footer">
          <button class="btn-primary" id="btn-close-select-ok">Parfait, continuer à jouer 🚀</button>
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    const close = () => this.closeEduModal();
    document.getElementById('btn-close-select').onclick = close;
    document.getElementById('btn-close-select-ok').onclick = close;
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

        <!-- Status / Relational Quality Banner -->
        ${!hasBothZones ? `
          <div class="join-status-alert alert-warning">
            <span class="alert-icon">⚠️</span>
            <div class="alert-content">
              <strong>Jointure incomplète (1 seule zone ciblée) :</strong>
              <p>Pour observer un véritable <code>JOIN</code> relationnel et valider la <strong>Mission 5</strong>, il faut relier des blocs situés dans au moins 2 zones différentes (ex: un bloc au Nord et un bloc au Sud) !</p>
              <button id="btn-fix-join-now" class="btn-primary" style="margin-top: 8px;">⚡ Relier automatiquement avec un bloc d'une autre zone</button>
            </div>
          </div>
        ` : `
          <div class="join-status-alert alert-success">
            <span class="alert-icon">⭐</span>
            <div class="alert-content">
              <strong>Liaison Relationnelle Multi-Zones Réussie !</strong>
              <p>Des blocs de zones géographiques différentes sont maintenant interconnectés par la clé étrangère <code>zone_id</code> et des faisceaux lasers 3D en direct !</p>
            </div>
          </div>
        `}

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

    const fixBtn = document.getElementById('btn-fix-join-now');
    if (fixBtn) {
      fixBtn.onclick = () => {
        this.triggerQuickJoin();
      };
    }
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
