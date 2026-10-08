import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { COLOR_MAP } from './textures.js';
import { sound } from './sound.js';
import { GRID_WIDTH, GRID_DEPTH } from './world.js';

export class PlayerController {
  constructor(camera, domElement, scene, blockManager, selectionSystem, dataViewer, sqlConsole) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.blockManager = blockManager;
    this.selectionSystem = selectionSystem;
    this.dataViewer = dataViewer;
    this.sqlConsole = sqlConsole;

    this.controls = new PointerLockControls(camera, document.body);

    // Initial camera position (standing in Zone Nord, looking toward Zone Sud across the vast world)
    const centerX = GRID_WIDTH / 2 - 0.5;
    this.camera.position.set(centerX, 2.6, 4.0);
    this.camera.lookAt(centerX, 1.5, 25.0);

    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;
    this.canJump = false;

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    // Hotbar state
    // 1: Maison, 2: Tour, 3: Ferme, 4: Pont, 5: Pinceau, 6: Hache, 7: Loupe
    this.activeSlot = 1;
    this.activeColor = 'rouge'; // rouge, bleu, vert, jaune
    this.colorList = ['rouge', 'bleu', 'vert', 'jaune'];

    // Raycaster for crosshair
    this.raycaster = new THREE.Raycaster();
    this.centerScreen = new THREE.Vector2(0, 0); // crosshair center
    this.currentIntersection = null;

    this.initEvents();
    this.initHUD();
  }

  initEvents() {
    // Pointer lock instructions overlay
    const overlay = document.getElementById('instructions-overlay');
    const playBtn = document.getElementById('btn-play');

    if (playBtn) {
      playBtn.onclick = () => {
        sound.init();
        this.controls.lock();
      };
    }

    this.controls.addEventListener('lock', () => {
      if (overlay) overlay.classList.add('hidden');
    });

    this.controls.addEventListener('unlock', () => {
      // Do not re-open overlay on unlock.
      // Unlocking pointer lock allows the user to interact with UI windows (BDD, Missions, SQL input).
    });

    // Re-lock pointer controls when clicking back onto the 3D game canvas
    this.domElement.addEventListener('click', () => {
      if (!this.controls.isLocked && (!overlay || overlay.classList.contains('hidden'))) {
        this.controls.lock();
      }
    });

    // Keyboard handlers
    const onKeyDown = (event) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      switch (event.code) {
        // Movement: AZERTY & QWERTY support
        case 'KeyW':
        case 'KeyZ':
        case 'ArrowUp':
          this.moveForward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = true;
          break;
        case 'KeyA':
        case 'KeyQ':
        case 'ArrowLeft':
          this.moveLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = true;
          break;
        case 'Space':
          if (this.canJump) {
            this.velocity.y = 8.5; // Jump velocity
            this.canJump = false;
          }
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.isSprinting = true;
          break;

        // Hotbar shortcuts (1 to 7)
        case 'Digit1':
          this.setSlot(1);
          break;
        case 'Digit2':
          this.setSlot(2);
          break;
        case 'Digit3':
          this.setSlot(3);
          break;
        case 'Digit4':
          this.setSlot(4);
          break;
        case 'Digit5':
          this.setSlot(5);
          break;
        case 'Digit6':
          this.setSlot(6);
          break;
        case 'Digit7':
          this.setSlot(7);
          break;

        // Cycle Color (Key C)
        case 'KeyC':
          this.cycleColor();
          break;

        // Toggle Table Viewer (Key T)
        case 'KeyT':
          this.dataViewer.toggle();
          break;

        // Toggle Missions (Key M)
        case 'KeyM': {
          const btnCollapse = document.getElementById('btn-collapse-quests');
          if (btnCollapse) btnCollapse.click();
          break;
        }

        // Focus SQL Console (Enter or Slash)
        case 'Enter':
        case 'NumpadEnter':
        case 'Slash': {
          event.preventDefault();
          if (this.controls.isLocked) {
            this.controls.unlock();
          }
          if (this.sqlConsole) {
            this.sqlConsole.focusInput();
          } else {
            const sqlInput = document.getElementById('console-sql-input');
            if (sqlInput) {
              sqlInput.focus();
              sqlInput.select();
            }
          }
          break;
        }

        // Free / Capture Mouse Cursor (Tab)
        case 'Tab':
          event.preventDefault();
          this.toggleMouseCursor();
          break;

        // Cycle Teleport between Zones (Key J)
        case 'KeyJ':
          this.cycleZoneTeleport();
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'KeyZ':
        case 'ArrowUp':
          this.moveForward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = false;
          break;
        case 'KeyA':
        case 'KeyQ':
        case 'ArrowLeft':
          this.moveLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.isSprinting = false;
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Mouse scroll to cycle hotbar
    window.addEventListener('wheel', (e) => {
      if (!this.controls.isLocked) return;
      if (e.deltaY > 0) {
        let next = this.activeSlot + 1;
        if (next > 7) next = 1;
        this.setSlot(next);
      } else {
        let prev = this.activeSlot - 1;
        if (prev < 1) prev = 7;
        this.setSlot(prev);
      }
    }, { passive: true });

    // Mouse click for action
    window.addEventListener('mousedown', (e) => {
      if (!this.controls.isLocked) return;
      if (e.button === 0) {
        // Left click
        this.handleAction();
      }
    });
  }

  initHUD() {
    // Bind hotbar slot clicks
    document.querySelectorAll('.hotbar-slot').forEach(slot => {
      slot.onclick = () => {
        const slotNum = parseInt(slot.getAttribute('data-slot'));
        this.setSlot(slotNum);
      };
    });

    // Bind color palette clicks
    document.querySelectorAll('.color-choice').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const color = btn.getAttribute('data-color');
        this.setColor(color);
      };
    });

    // Bind zone teleport buttons
    const tp1 = document.getElementById('tp-zone-1');
    if (tp1) tp1.onclick = (e) => {
      e.stopPropagation();
      this.teleportToZone(1);
    };

    const tp2 = document.getElementById('tp-zone-2');
    if (tp2) tp2.onclick = (e) => {
      e.stopPropagation();
      this.teleportToZone(2);
    };

    const tp3 = document.getElementById('tp-zone-3');
    if (tp3) tp3.onclick = (e) => {
      e.stopPropagation();
      this.teleportToZone(3);
    };

    this.updateHUD();
  }

  setSlot(num) {
    this.activeSlot = num;
    sound.playSelect();
    this.updateHUD();

    // If slot 7 (Loupe), show selection toolbar; otherwise hide it so color palette is never blocked!
    if (this.activeSlot === 7) {
      this.selectionSystem.showToolbar(true);
    } else {
      this.selectionSystem.showToolbar(false);
    }
  }

  setColor(color) {
    this.activeColor = color;
    sound.playPaint();
    this.updateHUD();
  }

  cycleColor() {
    const idx = this.colorList.indexOf(this.activeColor);
    const nextIdx = (idx + 1) % this.colorList.length;
    this.setColor(this.colorList[nextIdx]);
  }

  updateHUD() {
    // Update active hotbar slot
    document.querySelectorAll('.hotbar-slot').forEach(slot => {
      const slotNum = parseInt(slot.getAttribute('data-slot'));
      slot.classList.toggle('active', slotNum === this.activeSlot);
    });

    // Update active color dots
    document.querySelectorAll('.color-choice').forEach(btn => {
      const color = btn.getAttribute('data-color');
      btn.classList.toggle('active', color === this.activeColor);
    });

    // Update color indicator badge on paintbrush & blocks
    const activeColorIndicator = document.getElementById('active-color-name');
    if (activeColorIndicator) {
      activeColorIndicator.textContent = COLOR_MAP[this.activeColor].label;
      activeColorIndicator.style.color = COLOR_MAP[this.activeColor].css;
    }
  }

  // Handle player action on left-click
  handleAction() {
    if (!this.currentIntersection) return;

    const hit = this.currentIntersection;
    const obj = hit.object;

    // Slot 1-4: Place block
    if (this.activeSlot >= 1 && this.activeSlot <= 4) {
      const typeMap = { 1: 'maison', 2: 'tour', 3: 'ferme', 4: 'pont' };
      const blockType = typeMap[this.activeSlot];
      const targetPos = this.blockManager.getPlacementTarget(hit);

      if (targetPos) {
        // Prevent placing inside player
        const playerGridX = Math.round(this.camera.position.x);
        const playerGridZ = Math.round(this.camera.position.z);
        if (targetPos.x === playerGridX && targetPos.z === playerGridZ && Math.abs(targetPos.y - this.camera.position.y) < 1.0) {
          return;
        }

        this.blockManager.placeBlock(blockType, this.activeColor, targetPos);
      }
    }
    // Slot 5: Paintbrush (UPDATE)
    else if (this.activeSlot === 5) {
      if (obj.userData && obj.userData.isBlock) {
        this.blockManager.repaintBlock(obj.userData.id, this.activeColor);
      }
    }
    // Slot 6: Axe / Destroy (DELETE)
    else if (this.activeSlot === 6) {
      if (obj.userData && obj.userData.isBlock) {
        const id = obj.userData.id;
        // If block was selected in selectionSystem, remove it
        this.selectionSystem.selectedIds.delete(id);
        this.selectionSystem.updateVisuals();

        this.blockManager.destroyBlock(id);
      }
    }
    // Slot 7: Loupe (SELECT)
    else if (this.activeSlot === 7) {
      if (obj.userData && obj.userData.isBlock) {
        this.selectionSystem.toggleBlockSelection(obj.userData.id);
      }
    }
  }

  toggleMouseCursor() {
    if (this.controls.isLocked) {
      this.controls.unlock();
      this.selectionSystem.flashNotice("🖱️ Souris libre : clique sur l'interface (Missions, BDD...). Clic sur l'écran ou [Tab] pour rejouer.");
    } else {
      this.controls.lock();
    }
  }

  teleportToZone(zoneId) {
    const centerX = GRID_WIDTH / 2 - 0.5;
    this.velocity.set(0, 0, 0);
    this.camera.rotation.x = 0;
    this.camera.rotation.z = 0;
    if (zoneId === 1) {
      this.camera.position.set(centerX, 2.6, 12.0);
      this.selectionSystem.flashNotice("📍 Téléporté en Zone 1 : Plaine Verdoyante (2304 cases)");
    } else if (zoneId === 2) {
      this.camera.position.set(centerX, 2.6, 78.0);
      this.selectionSystem.flashNotice("📍 Téléporté en Zone 2 : Rivage Cristallin (2304 cases)");
    } else if (zoneId === 3) {
      this.camera.position.set(centerX, 2.6, 144.0);
      this.selectionSystem.flashNotice("⭐ Téléporté en Zone 3 : Mégalopole (2304 cases)");
    }
    sound.playSelect();
  }

  cycleZoneTeleport() {
    const currentZ = this.camera.position.z;
    if (currentZ < 66) {
      this.teleportToZone(2);
    } else if (currentZ < 132) {
      this.teleportToZone(3);
    } else {
      this.teleportToZone(1);
    }
  }

  // Update loop called every frame
  update(delta) {
    // 1. Raycast for targeted block
    if (this.controls.isLocked) {
      this.raycaster.setFromCamera(this.centerScreen, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      // Find first valid block or ground tile
      const validHit = intersects.find(hit => {
        const ud = hit.object.userData;
        return ud && (ud.isBlock || ud.isGround);
      });

      this.currentIntersection = validHit || null;
      this.blockManager.updateTargetWireframe(this.currentIntersection);
    }

    // 2. Physics & Player Movement
    if (this.controls.isLocked) {
      // Damping
      this.velocity.x -= this.velocity.x * 10.0 * delta;
      this.velocity.z -= this.velocity.z * 10.0 * delta;
      this.velocity.y -= 25.0 * delta; // Gravity

      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      this.direction.normalize();

      const speedMultiplier = this.isSprinting ? 75.0 : 45.0;

      if (this.moveForward || this.moveBackward) {
        this.velocity.z -= this.direction.z * speedMultiplier * delta;
      }
      if (this.moveLeft || this.moveRight) {
        this.velocity.x -= this.direction.x * speedMultiplier * delta;
      }

      this.controls.moveRight(-this.velocity.x * delta);
      this.controls.moveForward(-this.velocity.z * delta);
      this.camera.position.y += this.velocity.y * delta;

      // Ground collision & block stepping
      const playerX = this.camera.position.x;
      const playerZ = this.camera.position.z;

      // Find highest block below player
      let groundY = 1.7; // default floor height (eye level = 1.7 above 0)

      this.blockManager.db.blocs.forEach(b => {
        if (Math.abs(b.x - playerX) < 0.65 && Math.abs(b.z - playerZ) < 0.65) {
          const blockTopY = b.y + 0.5 + 1.7;
          if (blockTopY > groundY && this.camera.position.y >= blockTopY - 0.7) {
            groundY = blockTopY;
          }
        }
      });

      if (this.camera.position.y <= groundY) {
        this.velocity.y = 0;
        this.camera.position.y = groundY;
        this.canJump = true;
      }

      // Constrain within world boundaries (0 to GRID_WIDTH - 1, 0 to GRID_DEPTH - 1)
      this.camera.position.x = Math.max(-0.2, Math.min(GRID_WIDTH - 0.8, this.camera.position.x));
      this.camera.position.z = Math.max(-0.2, Math.min(GRID_DEPTH - 0.8, this.camera.position.z));
    }
  }
}
