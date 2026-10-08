import * as THREE from 'three';
import { getBlockTexture, COLOR_MAP } from './textures.js';
import { sound } from './sound.js';
import { GRID_WIDTH, GRID_DEPTH } from './world.js';

export class BlockManager {
  constructor(scene, db) {
    this.scene = scene;
    this.db = db;
    this.blockMeshes = new Map(); // id -> Mesh
    this.particles = [];
    this.animatingBlocks = [];

    // Minecraft-style black wireframe selection box on targeted block
    const wireGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    const wireMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    this.targetWireframe = new THREE.LineSegments(wireGeo, wireMat);
    this.targetWireframe.visible = false;
    this.scene.add(this.targetWireframe);

    // Common box geometry
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
  }

  // Check if grid coordinate already has a block
  hasBlockAt(x, y, z) {
    return this.db.blocs.some(b => b.x === x && b.y === y && b.z === z);
  }

  // Create 3D Mesh for a block
  createMesh(blockData) {
    const tex = getBlockTexture(blockData.type, blockData.couleur);
    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      color: 0xffffff
    });

    const mesh = new THREE.Mesh(this.boxGeo, mat);
    mesh.position.set(blockData.x, blockData.y, blockData.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      isBlock: true,
      id: blockData.id,
      type: blockData.type,
      couleur: blockData.couleur,
      gridX: blockData.x,
      gridY: blockData.y,
      gridZ: blockData.z,
      zoneId: blockData.zone_id
    };

    // Pop-in animation
    mesh.scale.set(0.1, 0.1, 0.1);
    this.animatingBlocks.push({
      mesh,
      targetScale: 1.0,
      currentScale: 0.1,
      speed: 14
    });

    this.scene.add(mesh);
    this.blockMeshes.set(blockData.id, mesh);
    return mesh;
  }

  // Place a block from user interaction
  placeBlock(type, couleur, targetCoord) {
    const { x, y, z } = targetCoord;

    // Boundary check (within grid boundaries and height limit up to 40 for mega-buildings)
    if (x < 0 || x >= GRID_WIDTH || z < 0 || z >= GRID_DEPTH || y < 1 || y > 40) {
      return null;
    }

    // Check collision with existing blocks
    if (this.hasBlockAt(x, y, z)) {
      return null;
    }

    // Insert into DB
    const blockData = this.db.insertBlock(type, couleur, x, y, z);
    this.createMesh(blockData);
    sound.playPlace();

    return blockData;
  }

  // Repaint block (UPDATE)
  repaintBlock(id, newColor) {
    const mesh = this.blockMeshes.get(id);
    if (!mesh) return null;

    const updated = this.db.updateBlockColor(id, newColor);
    if (!updated) return null;

    // Update material texture
    const newTex = getBlockTexture(updated.type, newColor);
    mesh.material.map = newTex;
    mesh.material.needsUpdate = true;
    mesh.userData.couleur = newColor;

    // Quick bounce animation
    mesh.scale.set(1.2, 1.2, 1.2);
    this.animatingBlocks.push({
      mesh,
      targetScale: 1.0,
      currentScale: 1.2,
      speed: 8
    });

    sound.playPaint();
    return updated;
  }

  // Destroy block (DELETE)
  destroyBlock(id) {
    const mesh = this.blockMeshes.get(id);
    if (!mesh) return null;

    const deleted = this.db.deleteBlock(id);
    if (!deleted) return null;

    // Spawn Minecraft-like debris explosion
    this.spawnBreakParticles(mesh.position, deleted.couleur);

    this.scene.remove(mesh);
    if (mesh.material) mesh.material.dispose();
    this.blockMeshes.delete(id);

    // Hide wireframe if it was on this block
    this.targetWireframe.visible = false;

    sound.playDestroy();
    return deleted;
  }

  // Particles explosion when breaking a block
  spawnBreakParticles(pos, colorName) {
    const colorHex = COLOR_MAP[colorName] ? COLOR_MAP[colorName].hex : 0xef4444;
    const count = 12;
    const partGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const partMat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < count; i++) {
      const part = new THREE.Mesh(partGeo, partMat);
      part.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.6
      ));

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 2,
        (Math.random() - 0.5) * 4
      );

      this.scene.add(part);
      this.particles.push({
        mesh: part,
        vel,
        rotVel: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 0.5,
        maxLife: 0.5
      });
    }
  }

  // Update target wireframe cursor
  updateTargetWireframe(intersection) {
    if (!intersection) {
      this.targetWireframe.visible = false;
      return;
    }

    const obj = intersection.object;
    if (obj.userData && obj.userData.isBlock) {
      this.targetWireframe.position.copy(obj.position);
      this.targetWireframe.visible = true;
    } else if (obj.userData && obj.userData.isGround) {
      this.targetWireframe.position.set(obj.userData.gridX, 0, obj.userData.gridZ);
      this.targetWireframe.visible = true;
    } else {
      this.targetWireframe.visible = false;
    }
  }

  // Calculate target placement coordinate based on clicked face normal
  getPlacementTarget(intersection) {
    if (!intersection) return null;

    const obj = intersection.object;
    const normal = intersection.face ? intersection.face.normal : new THREE.Vector3(0, 1, 0);

    if (obj.userData && obj.userData.isBlock) {
      return {
        x: Math.round(obj.position.x + normal.x),
        y: Math.round(obj.position.y + normal.y),
        z: Math.round(obj.position.z + normal.z)
      };
    } else if (obj.userData && obj.userData.isGround) {
      return {
        x: obj.userData.gridX,
        y: 1, // Place on top of ground (y=0)
        z: obj.userData.gridZ
      };
    }

    return null;
  }

  // Frame update
  update(delta) {
    // Animate scale transitions
    for (let i = this.animatingBlocks.length - 1; i >= 0; i--) {
      const anim = this.animatingBlocks[i];
      anim.currentScale += (anim.targetScale - anim.currentScale) * Math.min(1, anim.speed * delta);
      anim.mesh.scale.set(anim.currentScale, anim.currentScale, anim.currentScale);

      if (Math.abs(anim.targetScale - anim.currentScale) < 0.01) {
        anim.mesh.scale.set(anim.targetScale, anim.targetScale, anim.targetScale);
        this.animatingBlocks.splice(i, 1);
      }
    }

    // Update particles physics
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        p.vel.y -= 9.8 * delta; // Gravity
        p.mesh.position.addScaledVector(p.vel, delta);
        p.mesh.rotation.x += p.rotVel.x * delta;
        p.mesh.rotation.y += p.rotVel.y * delta;

        const scale = p.life / p.maxLife;
        p.mesh.scale.set(scale, scale, scale);
      }
    }
  }
}
