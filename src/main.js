import * as THREE from 'three';
import { db } from './database.js';
import { GameWorld, GRID_SIZE } from './world.js';
import { BlockManager } from './blockManager.js';
import { SelectionSystem } from './selectionSystem.js';
import { SQLConsole } from './sqlConsole.js';
import { DataViewer } from './dataViewer.js';
import { QuestSystem } from './questSystem.js';
import { PlayerController } from './controls.js';
import { sound } from './sound.js';

class SQLCraftGame {
  constructor() {
    this.container = document.getElementById('canvas-container');

    // 1. Three.js Core Setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    // 2. Game Systems
    this.db = db;
    this.world = new GameWorld(this.scene);
    this.blockManager = new BlockManager(this.scene, this.db);
    this.selectionSystem = new SelectionSystem(this.scene, this.db, this.world, this.blockManager);
    this.sqlConsole = new SQLConsole(this.db);
    this.dataViewer = new DataViewer(this.db, this.selectionSystem);
    this.questSystem = new QuestSystem(this.db);
    this.controller = new PlayerController(
      this.camera,
      this.renderer.domElement,
      this.scene,
      this.blockManager,
      this.selectionSystem,
      this.dataViewer,
      this.sqlConsole
    );

    // 3. Populate initial starter blocks
    this.spawnStarterBlocks();

    // 4. UI & Event Bindings
    this.initUIBindings();

    // 5. Start Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // Pre-seed starter blocks across all 3 zones
  spawnStarterBlocks() {
    // Zone 1 : Nord (Z < 66)
    this.blockManager.placeBlock('maison', 'rouge', { x: 12, y: 1, z: 20 });
    this.blockManager.placeBlock('tour', 'bleu', { x: 23, y: 1, z: 20 });
    this.blockManager.placeBlock('tour', 'bleu', { x: 23, y: 2, z: 20 }); // 2-high tower!

    // Zone 2 : Sud (66 <= Z < 132)
    this.blockManager.placeBlock('ferme', 'vert', { x: 12, y: 1, z: 85 });
    this.blockManager.placeBlock('pont', 'jaune', { x: 23, y: 1, z: 85 });

    // Zone 3 : Mégalopole des Bâtisseurs (Z >= 132)
    this.blockManager.placeBlock('tour', 'jaune', { x: 17, y: 1, z: 150 });
    this.blockManager.placeBlock('tour', 'jaune', { x: 17, y: 2, z: 150 });
    this.blockManager.placeBlock('tour', 'jaune', { x: 17, y: 3, z: 150 }); // 3-high skyscraper start!
    this.blockManager.placeBlock('maison', 'rouge', { x: 14, y: 1, z: 150 });
    this.blockManager.placeBlock('ferme', 'vert', { x: 20, y: 1, z: 150 });
  }

  initUIBindings() {
    // Window Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Top-Nav: Table Viewer button
    const tableBtn = document.getElementById('nav-btn-table');
    if (tableBtn) {
      tableBtn.onclick = () => {
        this.dataViewer.toggle();
      };
    }

    // Top-Nav: Sound Toggle
    const soundBtn = document.getElementById('nav-btn-sound');
    const soundIcon = document.getElementById('sound-icon');
    const soundLabel = document.getElementById('sound-label');
    if (soundBtn) {
      soundBtn.onclick = () => {
        const isMuted = sound.toggleMute();
        if (soundIcon) soundIcon.textContent = isMuted ? '🔇' : '🔊';
        if (soundLabel) soundLabel.textContent = isMuted ? 'Son OFF' : 'Son ON';
      };
    }

    // Top-Nav: Help / Controls guide
    const helpBtn = document.getElementById('nav-btn-help');
    const overlay = document.getElementById('instructions-overlay');
    if (helpBtn && overlay) {
      helpBtn.onclick = () => {
        if (document.exitPointerLock) {
          document.exitPointerLock();
        }
        overlay.classList.remove('hidden');
      };
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Update all subsystems
    this.world.update(delta);
    this.blockManager.update(delta);
    this.selectionSystem.update(delta);
    this.controller.update(delta);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.sqlCraft = new SQLCraftGame();
});
