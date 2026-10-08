import * as THREE from 'three';
import { createGrassTexture, createWaterTexture, createZone3Texture } from './textures.js';

// Dimensions globales du monde géant
export const GRID_WIDTH = 36;
export const GRID_DEPTH = 196;
export const GRID_SIZE = GRID_WIDTH; // Pour compatibilité

// Découpage des 3 zones (toutes les trois égales et gigantesques : 2304 cases chacune !) :
// - Zone 1 (Zone Nord) : Z de 0 à 63 (64 rangées = 2304 cases)
// - Rivière 1 (Frontière 1-2) : Z = 64..65 (2 rangées avec ponts)
// - Zone 2 (Zone Sud) : Z de 66 à 129 (64 rangées = 2304 cases)
// - Canal Royal 2 (Frontière 2-3) : Z = 130..131 (2 rangées avec ponts royaux)
// - Zone 3 (Zone Mégalopole) : Z de 132 à 195 (64 rangées = 2304 cases)
// TOTAL : 7 056 cases d'espace de jeu total !

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
    hemiLight.position.set(GRID_WIDTH / 2, 80, GRID_DEPTH / 2);
    this.scene.add(hemiLight);

    // Soleil directionnel couvrant toute l'immensité du monde (36x196)
    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.3);
    dirLight.position.set(GRID_WIDTH + 30, 110, GRID_DEPTH * 0.45);
    dirLight.target.position.set(GRID_WIDTH / 2, 0, GRID_DEPTH / 2);
    this.scene.add(dirLight.target);

    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 350;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 110;
    dirLight.shadow.camera.bottom = -110;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Disque solaire stylisé
    const sunGeo = new THREE.BoxGeometry(12, 12, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(GRID_WIDTH + 60, 130, GRID_DEPTH * 0.4);
    this.scene.add(sunMesh);
  }

  initSkyAndFog() {
    this.scene.background = new THREE.Color(0xbbe4fc);
    this.scene.fog = new THREE.Fog(0xbbe4fc, 80, 240);
  }

  initTerrain() {
    const northTex = createGrassTexture(true);
    northTex.repeat.set(GRID_WIDTH, 64);

    const southTex = createGrassTexture(false);
    southTex.repeat.set(GRID_WIDTH, 64);

    const zone3Tex = createZone3Texture();
    zone3Tex.repeat.set(GRID_WIDTH, 64);

    const waterTex1 = createWaterTexture();
    waterTex1.repeat.set(GRID_WIDTH, 2);

    const waterTex2 = createWaterTexture();
    waterTex2.repeat.set(GRID_WIDTH, 2);

    const northMat = new THREE.MeshLambertMaterial({ map: northTex });
    const southMat = new THREE.MeshLambertMaterial({ map: southTex });
    const zone3Mat = new THREE.MeshLambertMaterial({ map: zone3Tex });
    const waterMat1 = new THREE.MeshLambertMaterial({ map: waterTex1, transparent: true, opacity: 0.9 });
    const waterMat2 = new THREE.MeshLambertMaterial({ map: waterTex2, transparent: true, opacity: 0.9 });
    const stoneBorderMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const goldBorderMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });

    const centerX = (GRID_WIDTH - 1) / 2; // 17.5

    // Helper pour créer un grand chunk de sol (performances 60 FPS optimales)
    const createGroundChunk = (width, depth, zStart, mat, yOffset = 0, zoneId = 1, isRiver = false) => {
      const geo = new THREE.BoxGeometry(width, 1, depth);
      const mesh = new THREE.Mesh(geo, mat);
      const zCenter = zStart + (depth - 1) / 2;
      mesh.position.set(centerX, yOffset, zCenter);
      mesh.receiveShadow = true;
      mesh.userData = {
        isGround: true,
        zoneId,
        isRiver,
        zStart,
        zEnd: zStart + depth - 1
      };
      this.scene.add(mesh);
      this.groundTiles.push(mesh);
      return mesh;
    };

    // 1. Zone 1 : Plaine Verdoyante (Z: 0 à 63 = 64 rangées, 2304 cases)
    createGroundChunk(GRID_WIDTH, 64, 0, northMat, 0, 1, false);

    // Rivière 1 (Z: 64 à 65 = 2 rangées)
    createGroundChunk(GRID_WIDTH, 2, 64, waterMat1, -0.2, 1, true);

    // 2. Zone 2 : Rivage Cristallin (Z: 66 à 129 = 64 rangées, 2304 cases)
    createGroundChunk(GRID_WIDTH, 64, 66, southMat, 0, 2, false);

    // Grand Canal Royal 2 (Z: 130 à 131 = 2 rangées)
    createGroundChunk(GRID_WIDTH, 2, 130, waterMat2, -0.2, 2, true);

    // 3. Zone 3 : Mégalopole Bâtisseurs (Z: 132 à 195 = 64 rangées, 2304 cases)
    createGroundChunk(GRID_WIDTH, 64, 132, zone3Mat, 0, 3, false);

    // Bordures de pavés pour les rivières
    for (let x = 0; x < GRID_WIDTH; x++) {
      // Rivière 1 bordures
      [63, 66].forEach(z => {
        const paver = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.15), stoneBorderMat);
        paver.position.set(x, 0.55, z === 63 ? z + 0.45 : z - 0.45);
        this.scene.add(paver);
      });

      // Canal 2 bordures dorées
      [129, 132].forEach(z => {
        const paver = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.18), goldBorderMat);
        paver.position.set(x, 0.56, z === 129 ? z + 0.45 : z - 0.45);
        this.scene.add(paver);
      });
    }
  }

  // Ponts de franchissement sur les 2 rivières
  initBridges() {
    const plankGeo = new THREE.BoxGeometry(1, 0.22, 1);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
    const royalMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    const postGeo = new THREE.BoxGeometry(0.12, 0.7, 0.12);
    const railWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const railGoldMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });

    const bridgeXPositions = [7, 8, 17, 18, 27, 28]; // 3 passages bien répartis

    // 1. Ponts en bois sur la Rivière 1 (Z = 64, 65)
    bridgeXPositions.forEach(x => {
      [64, 65].forEach(z => {
        const plank = new THREE.Mesh(plankGeo, woodMat);
        plank.position.set(x, 0.11, z);
        plank.receiveShadow = true;
        plank.userData = { isGround: true, gridX: x, gridZ: z, zoneId: 1 };
        this.scene.add(plank);
        this.groundTiles.push(plank);
      });

      const isWestEdge = x === 7 || x === 17 || x === 27;
      const isEastEdge = x === 8 || x === 18 || x === 28;
      [64, 65].forEach(z => {
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

    // 2. Grands ponts dorés sur le Canal Royal 2 (Z = 130, 131)
    bridgeXPositions.forEach(x => {
      [130, 131].forEach(z => {
        const plank = new THREE.Mesh(plankGeo, royalMat);
        plank.position.set(x, 0.12, z);
        plank.receiveShadow = true;
        plank.userData = { isGround: true, gridX: x, gridZ: z, zoneId: 3 };
        this.scene.add(plank);
        this.groundTiles.push(plank);
      });

      const isWestEdge = x === 7 || x === 17 || x === 27;
      const isEastEdge = x === 8 || x === 18 || x === 28;
      [130, 131].forEach(z => {
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

    // Arbres de chêne dans Zone 1 (Nord, bordures pour ne pas gêner les constructions)
    const northTrees = [
      [4, 8], [31, 8], [5, 25], [30, 25], [4, 45], [31, 45], [12, 10], [24, 10]
    ];
    northTrees.forEach(([x, z]) => createTree(x, z, false));

    // Arbres de cristal dans Zone 2 (Sud, bordures)
    const southTrees = [
      [4, 75], [31, 75], [5, 95], [30, 95], [4, 115], [31, 115], [12, 80], [24, 80]
    ];
    southTrees.forEach(([x, z]) => createTree(x, z, true));

    // Obélisques dorés monumentaux sur les côtés de Zone 3
    const obeliskGeo = new THREE.BoxGeometry(1.2, 5.0, 1.2);
    const obeliskMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const goldTipGeo = new THREE.OctahedronGeometry(0.8, 0);
    const goldTipMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    const obeliskCoords = [
      [3, 140], [32, 140],
      [3, 160], [32, 160],
      [3, 180], [32, 180],
      [3, 192], [32, 192]
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

    // Bords Est & Ouest (longueur Z = 196)
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
      // Postes réguliers sur la longueur Z
      [-0.5, 32], [GRID_WIDTH - 0.5, 32],
      [-0.5, 64], [GRID_WIDTH - 0.5, 64],
      [-0.5, 98], [GRID_WIDTH - 0.5, 98],
      [-0.5, 130], [GRID_WIDTH - 0.5, 130],
      [-0.5, 164], [GRID_WIDTH - 0.5, 164],
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

      const pointLight = new THREE.PointLight(0xfef08a, 0.45, 12);
      pointLight.position.set(cx, 2.7, cz);
      this.scene.add(pointLight);
    });
  }

  // Totems et Balises des 3 Tables ZONES (Nord, Sud, Mégalopole)
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
      const coreGeo = new THREE.OctahedronGeometry(0.42, 0);
      const coreMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 1.3;
      group.add(core);

      // Faisceau lumineux vertical projeté vers le ciel
      const beamGeo = new THREE.CylinderGeometry(0.15, 0.15, 55, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.35
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 27.5;
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

    // Totem Zone 1 (Nord - centre à Z = 31.5)
    createBeacon(centerX, 31.5, 1, 'Zone Nord', 0x22c55e, 'Plaine Verdoyante (2304 cases)');
    // Totem Zone 2 (Sud - centre à Z = 97.5)
    createBeacon(centerX, 97.5, 2, 'Zone Sud', 0x0284c7, 'Rivage Cristallin (2304 cases)');
    // Totem Zone 3 (Mégalopole - centre à Z = 163.5)
    createBeacon(centerX, 163.5, 3, 'Zone Mégalopole', 0xf59e0b, 'Plateau des Bâtisseurs (2304 cases)');
  }

  // Nuages cubiques Minecraft
  initClouds() {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < 30; i++) {
      const w = 8 + Math.random() * 16;
      const d = 8 + Math.random() * 16;
      const geo = new THREE.BoxGeometry(w, 1.5, d);
      const cloud = new THREE.Mesh(geo, cloudMat);

      cloud.position.set(
        (Math.random() - 0.5) * (GRID_WIDTH * 3) + (GRID_WIDTH / 2),
        32 + Math.random() * 14,
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
      mid.y += 3.5;

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
        mid.y += 6.0;

        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const points = curve.getPoints(32);
        const geo = new THREE.BufferGeometry().setFromPoints(points);

        const mat = new THREE.LineBasicMaterial({
          color: 0xfacc15,
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
