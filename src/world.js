import * as THREE from 'three';
import { createGrassTexture, createWaterTexture, createZone3Texture } from './textures.js';

// Dimensions globales du monde
export const GRID_WIDTH = 36;
export const GRID_DEPTH = 100;
export const GRID_SIZE = GRID_WIDTH; // Pour compatibilité

// Découpage des 3 zones :
// - Zone 1 (Zone Nord) : Z de 0 à 15 (16 rangées = 576 cases)
// - Rivière 1 (Frontière 1-2) : Z = 16..17 (2 rangées d'eau avec ponts)
// - Zone 2 (Zone Sud) : Z de 18 à 33 (16 rangées = 576 cases)
// - Canal Royal 2 (Frontière 2-3) : Z = 34..35 (2 rangées d'eau avec ponts royaux)
// - Zone 3 (Zone Mégalopole) : Z de 36 à 99 (64 rangées = 2304 cases = EXACTEMENT 4X PLUS GRANDE !)

export class GameWorld {
  constructor(scene) {
    this.scene = scene;
    this.groundTiles = [];
    this.clouds = [];
    this.beacons = {};
    this.joinLinesGroup = new THREE.Group();
    this.scene.add(this.joinLinesGroup);

    this.initLighting();
    this.initSkyAndFog();
    this.initTerrain();
    this.initBridges();
    this.initScenery();
    this.initPerimeter();
    this.initBeacons();
    this.initClouds();
  }

  initLighting() {
    // Lumière hémisphérique douce
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.85);
    hemiLight.position.set(GRID_WIDTH / 2, 70, GRID_DEPTH / 2);
    this.scene.add(hemiLight);

    // Soleil directionnel couvrant toute l'immensité du monde (36x100)
    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.3);
    dirLight.position.set(GRID_WIDTH + 20, 85, GRID_DEPTH * 0.45);
    dirLight.target.position.set(GRID_WIDTH / 2, 0, GRID_DEPTH / 2);
    this.scene.add(dirLight.target);

    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 240;
    dirLight.shadow.camera.left = -35;
    dirLight.shadow.camera.right = 35;
    dirLight.shadow.camera.top = 75;
    dirLight.shadow.camera.bottom = -75;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Disque solaire stylisé
    const sunGeo = new THREE.BoxGeometry(10, 10, 10);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(GRID_WIDTH + 45, 110, GRID_DEPTH * 0.4);
    this.scene.add(sunMesh);
  }

  initSkyAndFog() {
    this.scene.background = new THREE.Color(0xbbe4fc);
    this.scene.fog = new THREE.Fog(0xbbe4fc, 70, 180);
  }

  initTerrain() {
    const northTex = createGrassTexture(true);
    const southTex = createGrassTexture(false);
    const zone3Tex = createZone3Texture();
    const waterTex = createWaterTexture();

    const northMat = new THREE.MeshLambertMaterial({ map: northTex });
    const southMat = new THREE.MeshLambertMaterial({ map: southTex });
    const zone3Mat = new THREE.MeshLambertMaterial({ map: zone3Tex });
    const waterMat = new THREE.MeshLambertMaterial({ map: waterTex, transparent: true, opacity: 0.9 });
    const stoneBorderMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const goldBorderMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });

    const tileGeo = new THREE.BoxGeometry(1, 1, 1);

    for (let x = 0; x < GRID_WIDTH; x++) {
      for (let z = 0; z < GRID_DEPTH; z++) {
        let mat = northMat;
        let isRiver = false;
        let zoneId = 1;

        if (z < 16) {
          // Zone 1 : Plaine Verdoyante (Nord)
          mat = northMat;
          zoneId = 1;
        } else if (z === 16 || z === 17) {
          // Rivière 1
          mat = waterMat;
          isRiver = true;
          zoneId = 1;
        } else if (z >= 18 && z < 34) {
          // Zone 2 : Rivage Cristallin (Sud)
          mat = southMat;
          zoneId = 2;
        } else if (z === 34 || z === 35) {
          // Grand Canal Royal 2
          mat = waterMat;
          isRiver = true;
          zoneId = 2;
        } else {
          // Zone 3 : Mégalopole (Plateau des Bâtisseurs, 4x plus grand !)
          mat = zone3Mat;
          zoneId = 3;
        }

        const tile = new THREE.Mesh(tileGeo, mat);
        tile.position.set(x, isRiver ? -0.2 : 0, z);
        tile.receiveShadow = true;
        tile.userData = {
          isGround: true,
          gridX: x,
          gridZ: z,
          zoneId
        };

        this.scene.add(tile);
        this.groundTiles.push(tile);

        // Bordures en pierre pour la Rivière 1
        if (z === 15 || z === 18) {
          const borderPaver = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.1, 0.15),
            stoneBorderMat
          );
          borderPaver.position.set(x, 0.55, z === 15 ? z + 0.45 : z - 0.45);
          this.scene.add(borderPaver);
        }
        // Bordures royales dorées pour le Canal 2
        else if (z === 33 || z === 36) {
          const borderPaver = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.12, 0.18),
            goldBorderMat
          );
          borderPaver.position.set(x, 0.56, z === 33 ? z + 0.45 : z - 0.45);
          this.scene.add(borderPaver);
        }
      }
    }
  }

  // Ponts de traversée sur les 2 rivières
  initBridges() {
    const plankGeo = new THREE.BoxGeometry(1, 0.22, 1);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
    const royalMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    const postGeo = new THREE.BoxGeometry(0.12, 0.7, 0.12);
    const railWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const railGoldMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });

    const bridgeXPositions = [7, 8, 17, 18, 27, 28]; // 3 passages bien répartis

    // 1. Ponts en bois sur la Rivière 1 (Z = 16, 17)
    bridgeXPositions.forEach(x => {
      [16, 17].forEach(z => {
        const plank = new THREE.Mesh(plankGeo, woodMat);
        plank.position.set(x, 0.11, z);
        plank.receiveShadow = true;
        plank.userData = { isGround: true, gridX: x, gridZ: z, zoneId: 1 };
        this.scene.add(plank);
        this.groundTiles.push(plank);
      });

      const isWestEdge = x === 7 || x === 17 || x === 27;
      const isEastEdge = x === 8 || x === 18 || x === 28;
      [16, 17].forEach(z => {
        if (isWestEdge) {
          const post = new THREE.Mesh(postGeo, railWoodMat);
          post.position.set(x - 0.44, 0.5, z);
          this.scene.add(post);
        }
        if (isEastEdge) {
          const post = new THREE.Mesh(postGeo, railWoodMat);
          post.position.set(x + 0.44, 0.5, z);
          this.scene.add(post);
        }
      });
    });

    // 2. Grands ponts dorés sur le Canal Royal 2 (Z = 34, 35) menant vers Zone 3
    bridgeXPositions.forEach(x => {
      [34, 35].forEach(z => {
        const plank = new THREE.Mesh(plankGeo, royalMat);
        plank.position.set(x, 0.12, z);
        plank.receiveShadow = true;
        plank.userData = { isGround: true, gridX: x, gridZ: z, zoneId: 3 };
        this.scene.add(plank);
        this.groundTiles.push(plank);
      });

      const isWestEdge = x === 7 || x === 17 || x === 27;
      const isEastEdge = x === 8 || x === 18 || x === 28;
      [34, 35].forEach(z => {
        if (isWestEdge) {
          const post = new THREE.Mesh(postGeo, railGoldMat);
          post.position.set(x - 0.44, 0.5, z);
          this.scene.add(post);
        }
        if (isEastEdge) {
          const post = new THREE.Mesh(postGeo, railGoldMat);
          post.position.set(x + 0.44, 0.5, z);
          this.scene.add(post);
        }
      });
    });
  }

  // Éléments de décorations voxel répartis par biome
  initScenery() {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const crystalMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });

    const createTree = (x, z, isCrystal = false) => {
      const group = new THREE.Group();
      const trunkGeo = new THREE.BoxGeometry(0.7, 2.5, 0.7);
      const trunk = new THREE.Mesh(trunkGeo, isCrystal ? new THREE.MeshLambertMaterial({ color: 0x334155 }) : trunkMat);
      trunk.position.set(x, 1.25, z);
      trunk.castShadow = true;
      group.add(trunk);

      const canopyGeo = new THREE.BoxGeometry(2.4, 2.0, 2.4);
      const canopy = new THREE.Mesh(canopyGeo, isCrystal ? crystalMat : foliageMat);
      canopy.position.set(x, 3.2, z);
      canopy.castShadow = true;
      group.add(canopy);

      const topGeo = new THREE.BoxGeometry(1.4, 1.0, 1.4);
      const top = new THREE.Mesh(topGeo, isCrystal ? crystalMat : foliageMat);
      top.position.set(x, 4.4, z);
      top.castShadow = true;
      group.add(top);

      this.scene.add(group);
    };

    // Arbres de chêne dans Zone 1 (Nord)
    const northTrees = [[4, 4], [31, 4], [5, 11], [30, 11], [12, 3], [24, 3]];
    northTrees.forEach(([x, z]) => createTree(x, z, false));

    // Arbres de cristal dans Zone 2 (Sud)
    const southTrees = [[4, 21], [31, 21], [5, 29], [30, 29], [12, 22], [24, 22]];
    southTrees.forEach(([x, z]) => createTree(x, z, true));

    // Obélisques dorés monumentaux sur les côtés de Zone 3 (laissant tout le centre libre pour bâtir !)
    const obeliskGeo = new THREE.BoxGeometry(1.2, 5.0, 1.2);
    const obeliskMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const goldTipGeo = new THREE.OctahedronGeometry(0.8, 0);
    const goldTipMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    const obeliskCoords = [
      [3, 42], [32, 42],
      [3, 62], [32, 62],
      [3, 82], [32, 82],
      [3, 95], [32, 95]
    ];

    obeliskCoords.forEach(([x, z]) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);

      const ob = new THREE.Mesh(obeliskGeo, obeliskMat);
      ob.position.y = 2.5;
      ob.castShadow = true;
      group.add(ob);

      const tip = new THREE.Mesh(goldTipGeo, goldTipMat);
      tip.position.y = 5.6;
      group.add(tip);

      const glow = new THREE.PointLight(0xf59e0b, 0.4, 8);
      glow.position.y = 5.6;
      group.add(glow);

      this.scene.add(group);
    });
  }

  // Périmètre fortifié avec clôtures et tours de guet
  initPerimeter() {
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const postGeo = new THREE.BoxGeometry(0.18, 1.2, 0.18);
    const railGeo = new THREE.BoxGeometry(1, 0.08, 0.08);

    // Bords Nord & Sud (largeur X = 36)
    for (let x = 0; x < GRID_WIDTH; x++) {
      [-0.5, GRID_DEPTH - 0.5].forEach(z => {
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(x, 0.6, z);
        post.castShadow = true;
        this.scene.add(post);

        const rail = new THREE.Mesh(railGeo, fenceMat);
        rail.position.set(x, 0.8, z);
        this.scene.add(rail);
      });
    }

    // Bords Est & Ouest (longueur Z = 100)
    for (let z = 0; z < GRID_DEPTH; z++) {
      [-0.5, GRID_WIDTH - 0.5].forEach(x => {
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(x, 0.6, z);
        post.castShadow = true;
        this.scene.add(post);

        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1), fenceMat);
        rail.position.set(x, 0.8, z);
        this.scene.add(rail);
      });
    }

    // Tours de guet & lanternes : 4 coins + postes réguliers le long du monde
    const towers = [
      // 4 coins principaux
      [-0.5, -0.5],
      [GRID_WIDTH - 0.5, -0.5],
      [-0.5, GRID_DEPTH - 0.5],
      [GRID_WIDTH - 0.5, GRID_DEPTH - 0.5],
      // Postes réguliers sur la longueur Z (tous les 16-20 blocs)
      [-0.5, 16.5], [GRID_WIDTH - 0.5, 16.5],
      [-0.5, 34.5], [GRID_WIDTH - 0.5, 34.5],
      [-0.5, 52.5], [GRID_WIDTH - 0.5, 52.5],
      [-0.5, 70.5], [GRID_WIDTH - 0.5, 70.5],
      [-0.5, 88.5], [GRID_WIDTH - 0.5, 88.5],
      // Milieux Nord et Sud
      [GRID_WIDTH / 2 - 0.5, -0.5],
      [GRID_WIDTH / 2 - 0.5, GRID_DEPTH - 0.5]
    ];

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const pillarGeo = new THREE.BoxGeometry(0.8, 2.5, 0.8);
    const lanternGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    towers.forEach(([cx, cz]) => {
      const pillar = new THREE.Mesh(pillarGeo, stoneMat);
      pillar.position.set(cx, 1.25, cz);
      pillar.castShadow = true;
      this.scene.add(pillar);

      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(cx, 2.7, cz);
      this.scene.add(lantern);

      const pointLight = new THREE.PointLight(0xfef08a, 0.45, 10);
      pointLight.position.set(cx, 2.7, cz);
      this.scene.add(pointLight);
    });
  }

  // Totems et Balises des 3 Tables ZONES (id=1: Nord, id=2: Sud, id=3: Mégalopole)
  initBeacons() {
    const createBeacon = (x, z, zoneId, name, colorHex, subtitle) => {
      const group = new THREE.Group();
      group.position.set(x, 0.5, z);

      // Socle en pierre
      const baseGeo = new THREE.BoxGeometry(1.4, 0.6, 1.4);
      const baseMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      group.add(base);

      // Pilier en verre protecteur
      const pillarGeo = new THREE.BoxGeometry(0.6, 2.0, 0.6);
      const pillarMat = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.y = 1.3;
      group.add(pillar);

      // Cristal rotatif d'énergie de données
      const coreGeo = new THREE.OctahedronGeometry(0.38, 0);
      const coreMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 1.3;
      group.add(core);

      // Faisceau lumineux vertical projeté vers le ciel
      const beamGeo = new THREE.CylinderGeometry(0.14, 0.14, 45, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.35
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 22.5;
      group.add(beam);

      // Bannière sprite 3D d'affichage de la table
      const canvas = document.createElement('canvas');
      canvas.width = 280;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.roundRect(4, 4, 272, 82, 12);
      ctx.fill();
      const strokeCss = '#' + colorHex.toString(16).padStart(6, '0');
      ctx.strokeStyle = strokeCss;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`TABLE: ZONES`, 140, 32);
      ctx.fillStyle = strokeCss;
      ctx.font = '17px monospace';
      ctx.fillText(`id: ${zoneId} | ${name}`, 140, 58);
      if (subtitle) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.fillText(subtitle, 140, 76);
      }

      const spriteTex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: spriteTex });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(3.4, 1.1, 1);
      sprite.position.set(0, 3.5, 0);
      group.add(sprite);

      this.scene.add(group);

      this.beacons[zoneId] = {
        group,
        core,
        colorHex,
        pos: new THREE.Vector3(x, 1.8, z)
      };
    };

    const centerX = GRID_WIDTH / 2 - 0.5; // 17.5

    // Totem Zone 1 (Nord)
    createBeacon(centerX, 7.5, 1, 'Zone Nord', 0x22c55e, 'Plaine Verdoyante');
    // Totem Zone 2 (Sud)
    createBeacon(centerX, 25.5, 2, 'Zone Sud', 0x0284c7, 'Rivage Cristallin');
    // Totem Zone 3 (Mégalopole, 4x plus grand)
    createBeacon(centerX, 67.5, 3, 'Zone Mégalopole', 0xf59e0b, 'Plateau des Bâtisseurs (x4)');
  }

  // Nuages cubiques Minecraft
  initClouds() {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < 24; i++) {
      const w = 8 + Math.random() * 14;
      const d = 8 + Math.random() * 14;
      const geo = new THREE.BoxGeometry(w, 1.5, d);
      const cloud = new THREE.Mesh(geo, cloudMat);

      cloud.position.set(
        (Math.random() - 0.5) * (GRID_WIDTH * 3) + (GRID_WIDTH / 2),
        28 + Math.random() * 10,
        Math.random() * GRID_DEPTH
      );
      cloud.userData = { speed: 0.5 + Math.random() * 0.7 };

      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  // Traçage dynamique des faisceaux relationnels JOIN
  drawJoinRelationships(blocks) {
    while (this.joinLinesGroup.children.length > 0) {
      const obj = this.joinLinesGroup.children[0];
      this.joinLinesGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }

    if (!blocks || blocks.length === 0) return;

    // Relier chaque bloc à son totem de zone respectif
    blocks.forEach(b => {
      const beacon = this.beacons[b.zone_id];
      if (!beacon) return;

      const blockPos = new THREE.Vector3(b.x, b.y, b.z);
      const beaconPos = beacon.pos.clone();

      const mid = new THREE.Vector3()
        .addVectors(blockPos, beaconPos)
        .multiplyScalar(0.5);
      mid.y += 3.0; // Arche courbe vers le haut

      const curve = new THREE.QuadraticBezierCurve3(blockPos, mid, beaconPos);
      const points = curve.getPoints(24);
      const geo = new THREE.BufferGeometry().setFromPoints(points);

      const mat = new THREE.LineBasicMaterial({
        color: beacon.colorHex,
        linewidth: 3,
        transparent: true,
        opacity: 0.95
      });

      const line = new THREE.Line(geo, mat);
      this.joinLinesGroup.add(line);
    });

    // Relier les zones entre elles si des blocs sont répartis sur plusieurs zones
    const zoneIds = Array.from(new Set(blocks.map(b => b.zone_id)));
    if (zoneIds.length >= 2) {
      for (let i = 0; i < zoneIds.length - 1; i++) {
        const b1 = this.beacons[zoneIds[i]];
        const b2 = this.beacons[zoneIds[i + 1]];
        if (!b1 || !b2) continue;

        const p1 = b1.pos.clone();
        const p2 = b2.pos.clone();
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        mid.y += 5.0;

        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const points = curve.getPoints(32);
        const geo = new THREE.BufferGeometry().setFromPoints(points);

        const mat = new THREE.LineBasicMaterial({
          color: 0xfacc15, // Arche dorée inter-zones
          linewidth: 5,
          transparent: true,
          opacity: 1.0
        });

        const interLine = new THREE.Line(geo, mat);
        this.joinLinesGroup.add(interLine);
      }
    }
  }

  clearJoinRelationships() {
    while (this.joinLinesGroup.children.length > 0) {
      const obj = this.joinLinesGroup.children[0];
      this.joinLinesGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  }

  update(delta) {
    // Dérive des nuages
    this.clouds.forEach(c => {
      c.position.x += c.userData.speed * delta;
      if (c.position.x > GRID_WIDTH * 2.0) {
        c.position.x = -GRID_WIDTH * 1.0;
      }
    });

    // Rotation des cristaux de balise
    Object.values(this.beacons).forEach(b => {
      b.core.rotation.y += 1.5 * delta;
      b.core.rotation.x += 0.8 * delta;
    });

    // Pulsation des lignes JOIN
    if (this.joinLinesGroup.children.length > 0) {
      const time = Date.now() * 0.005;
      const alpha = 0.7 + 0.3 * Math.sin(time);
      this.joinLinesGroup.children.forEach(line => {
        if (line.material) line.material.opacity = alpha;
      });
    }
  }
}
