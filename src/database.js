import { GRID_SIZE } from './world.js';

export class GameDatabase {
  constructor() {
    this.zones = [
      { id: 1, nom: 'Zone Nord', biome: 'Plateau Verdoyant Géant (2304 cases)', sol: 'Herbe Émeraude' },
      { id: 2, nom: 'Zone Sud', biome: 'Rivage Cristallin Géant (2304 cases)', sol: 'Quartz Azur' },
      { id: 3, nom: 'Zone Mégalopole', biome: 'Plateau des Bâtisseurs (2304 cases)', sol: 'Dalles Dorées & Marbre' }
    ];

    this.blocs = [];
    this.nextId = 1;
    this.listeners = [];
  }

  // Subscribe to SQL query execution events
  onQuery(callback) {
    this.listeners.push(callback);
  }

  emitQuery(payload) {
    this.listeners.forEach(cb => cb(payload));
  }

  // Get zone for a given Z coordinate:
  // - Z < 66 : Zone 1 (Zone Nord - 2304 cases)
  // - Z >= 66 && Z < 132 : Zone 2 (Zone Sud - 2304 cases)
  // - Z >= 132 : Zone 3 (Zone Mégalopole - 2304 cases)
  getZoneId(z) {
    if (z < 66) return 1;
    if (z < 132) return 2;
    return 3;
  }

  getZone(zoneId) {
    return this.zones.find(z => z.id === zoneId);
  }

  // C - CREATE: Insert a new block
  insertBlock(type, couleur, x, y, z) {
    const id = this.nextId++;
    const zone_id = this.getZoneId(z);
    const newBlock = { id, type, couleur, x, y, z, zone_id };
    this.blocs.push(newBlock);

    const query = `INSERT INTO blocs (id, type, couleur, x, y, z, zone_id)\nVALUES (${id}, '${type}', '${couleur}', ${x}, ${y}, ${z}, ${zone_id});`;
    const explanation = `➕ INSERT : Tu ajoutes une nouvelle ligne dans la table 'blocs'. Chaque bloc a sa propre clé primaire (id = ${id}) et sa zone_id (${zone_id}) ! [CRUD : Create]`;

    this.emitQuery({
      query,
      op: 'INSERT',
      explanation,
      block: newBlock,
      totalCount: this.blocs.length
    });

    return newBlock;
  }

  // U - UPDATE: Update block color
  updateBlockColor(id, newColor) {
    const block = this.blocs.find(b => b.id === id);
    if (!block) return null;

    const oldColor = block.couleur;
    block.couleur = newColor;

    const query = `UPDATE blocs\nSET couleur = '${newColor}'\nWHERE id = ${id};`;
    const explanation = `🎨 UPDATE : Tu modifies la colonne 'couleur' (passée de '${oldColor}' à '${newColor}') de la ligne ciblée par sa clé primaire (WHERE id = ${id}) ! [CRUD : Update]`;

    this.emitQuery({
      query,
      op: 'UPDATE',
      explanation,
      block,
      oldColor,
      newColor
    });

    return block;
  }

  // D - DELETE: Remove a block
  deleteBlock(id) {
    const index = this.blocs.findIndex(b => b.id === id);
    if (index === -1) return null;

    const deletedBlock = this.blocs.splice(index, 1)[0];

    const query = `DELETE FROM blocs\nWHERE id = ${id};`;
    const explanation = `💥 DELETE : Tu supprimes de la table 'blocs' la ligne ayant pour clé primaire (WHERE id = ${id}) ! [CRUD : Delete]`;

    this.emitQuery({
      query,
      op: 'DELETE',
      explanation,
      block: deletedBlock,
      totalCount: this.blocs.length
    });

    return deletedBlock;
  }

  // R - READ: SELECT specific blocks
  selectBlocks(ids) {
    if (!ids || ids.length === 0) {
      const query = `SELECT * FROM blocs;`;
      const explanation = `📋 SELECT * : Tu lis toutes les lignes de la table 'blocs' sans filtre ! [CRUD : Read]`;
      this.emitQuery({ query, op: 'SELECT', explanation, results: [...this.blocs] });
      return [...this.blocs];
    }

    const results = this.blocs.filter(b => ids.includes(b.id));
    const query = `SELECT * FROM blocs\nWHERE id IN (${ids.join(', ')});`;
    const explanation = `📋 SELECT : Tu récupères uniquement les lignes dont l'id fait partie de la sélection (${ids.length} bloc${ids.length > 1 ? 's' : ''}) ! [CRUD : Read]`;

    this.emitQuery({
      query,
      op: 'SELECT',
      explanation,
      results
    });

    return results;
  }

  // Filter blocks by field (type or couleur)
  filterBlocks(field, value) {
    const results = this.blocs.filter(b => String(b[field]).toLowerCase() === String(value).toLowerCase());
    const query = `SELECT * FROM blocs\nWHERE ${field} = '${value}';`;
    const explanation = `🔍 WHERE ${field} = '${value}' : Tu appliques un filtre SQL pour ne retenir que les blocs correspondants (${results.length} trouvé${results.length > 1 ? 's' : ''}) !`;

    this.emitQuery({
      query,
      op: 'SELECT_FILTER',
      explanation,
      results
    });

    return results;
  }

  // Order blocks
  orderBlocks(field, direction = 'ASC') {
    const sorted = [...this.blocs].sort((a, b) => {
      if (direction === 'ASC') {
        return a[field] > b[field] ? 1 : -1;
      } else {
        return a[field] < b[field] ? 1 : -1;
      }
    });

    const query = `SELECT * FROM blocs\nORDER BY ${field} ${direction};`;
    const explanation = `↕️ ORDER BY ${field} ${direction} : Tu classes les lignes de la table par ordre ${direction === 'ASC' ? 'croissant' : 'décroissant'} selon la colonne '${field}' !`;

    this.emitQuery({
      query,
      op: 'ORDER',
      explanation,
      results: sorted
    });

    return sorted;
  }

  // COUNT aggregation function
  countBlocks(ids = null) {
    const count = ids && ids.length > 0
      ? this.blocs.filter(b => ids.includes(b.id)).length
      : this.blocs.length;

    let query, explanation;
    if (ids && ids.length > 0) {
      query = `SELECT COUNT(*) AS total_selection\nFROM blocs\nWHERE id IN (${ids.join(', ')});`;
      explanation = `🔢 COUNT(*) : Fonction d'agrégation calculant le nombre exact de blocs sélectionnés (Résultat : ${count}) !`;
    } else {
      query = `SELECT COUNT(*) AS total_monde\nFROM blocs;`;
      explanation = `🔢 COUNT(*) : Fonction d'agrégation calculant le nombre total de blocs posés dans le monde entier (Résultat : ${count}) !`;
    }

    this.emitQuery({
      query,
      op: 'COUNT',
      explanation,
      count
    });

    return count;
  }

  // JOIN operation connecting blocs to zones
  joinZones(ids = null) {
    const targetBlocs = ids && ids.length > 0
      ? this.blocs.filter(b => ids.includes(b.id))
      : this.blocs;

    const joinedResults = targetBlocs.map(b => {
      const z = this.zones.find(zone => zone.id === b.zone_id) || { nom: 'Inconnu', biome: 'N/A' };
      return {
        bloc_id: b.id,
        type: b.type,
        couleur: b.couleur,
        x: b.x,
        y: b.y,
        z: b.z,
        zone_id: b.zone_id,
        zone_nom: z.nom,
        zone_biome: z.biome
      };
    });

    const uniqueZones = new Set(joinedResults.map(r => r.zone_id));
    const hasBothZones = uniqueZones.size >= 2;

    let query = `SELECT blocs.id, blocs.type, blocs.couleur, zones.nom AS nom_zone, zones.biome\nFROM blocs\nJOIN zones ON zones.id = blocs.zone_id`;
    if (ids && ids.length > 0) {
      query += `\nWHERE blocs.id IN (${ids.join(', ')});`;
    } else {
      query += `;`;
    }

    const explanation = `🔗 JOIN ... ON zones.id = blocs.zone_id :\nC'est la magie relationnelle ! Les tables ('blocs' et 'zones') sont reliées via la clé étrangère 'zone_id'. ${hasBothZones ? `⭐ Tu as relié ${uniqueZones.size} zones différentes (Nord, Sud, Mégalopole) !` : '💡 Astuce : place des blocs dans différentes zones pour voir le lien relationnel !'}`;

    this.emitQuery({
      query,
      op: 'JOIN',
      explanation,
      results: joinedResults,
      hasBothZones
    });

    return { results: joinedResults, hasBothZones };
  }

  // Direct SQL parser for advanced students testing queries in console
  executeRawSQL(sqlString) {
    const raw = sqlString.trim().replace(/;$/, '');
    const upper = raw.toUpperCase();

    // SELECT COUNT(*) FROM blocs
    if (upper.startsWith('SELECT COUNT')) {
      return { success: true, count: this.countBlocks() };
    }

    // SELECT * FROM blocs WHERE couleur = '...'
    if (upper.startsWith('SELECT * FROM BLOCS WHERE COULEUR =')) {
      const match = raw.match(/couleur\s*=\s*['"](\w+)['"]/i);
      if (match) {
        const res = this.filterBlocks('couleur', match[1].toLowerCase());
        return { success: true, results: res };
      }
    }

    // SELECT * FROM blocs WHERE type = '...'
    if (upper.startsWith('SELECT * FROM BLOCS WHERE TYPE =')) {
      const match = raw.match(/type\s*=\s*['"](\w+)['"]/i);
      if (match) {
        const res = this.filterBlocks('type', match[1].toLowerCase());
        return { success: true, results: res };
      }
    }

    // SELECT * FROM blocs JOIN zones
    if (upper.includes('JOIN ZONES')) {
      const res = this.joinZones();
      return { success: true, results: res.results };
    }

    // SELECT * FROM blocs ORDER BY ...
    if (upper.startsWith('SELECT * FROM BLOCS ORDER BY')) {
      const parts = raw.split(/\s+/);
      const field = parts[parts.length - 2] || 'x';
      const dir = parts[parts.length - 1].toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const res = this.orderBlocks(field, dir);
      return { success: true, results: res };
    }

    // SELECT * FROM blocs
    if (upper === 'SELECT * FROM BLOCS') {
      const res = this.selectBlocks();
      return { success: true, results: res };
    }

    // DELETE FROM blocs WHERE id = X
    if (upper.startsWith('DELETE FROM BLOCS WHERE ID =')) {
      const match = raw.match(/id\s*=\s*(\d+)/i);
      if (match) {
        const id = parseInt(match[1]);
        const del = this.deleteBlock(id);
        return { success: !!del, deleted: del };
      }
    }

    // DELETE FROM blocs (clear all)
    if (upper === 'DELETE FROM BLOCS') {
      const count = this.blocs.length;
      const ids = this.blocs.map(b => b.id);
      ids.forEach(id => this.deleteBlock(id));
      return { success: true, message: `${count} blocs supprimés !` };
    }

    // UPDATE blocs SET couleur = '...'
    if (upper.startsWith('UPDATE BLOCS SET COULEUR =')) {
      const matchColor = raw.match(/couleur\s*=\s*['"](\w+)['"]/i);
      const matchId = raw.match(/id\s*=\s*(\d+)/i);
      if (matchColor && matchId) {
        const up = this.updateBlockColor(parseInt(matchId[1]), matchColor[1].toLowerCase());
        return { success: !!up, updated: up };
      }
    }

    // Fallback unknown
    this.emitQuery({
      query: sqlString,
      op: 'RAW_ERROR',
      explanation: "⚠️ Commande non reconnue ou syntaxe non supportée dans ce bac à sable. Essaye : SELECT * FROM blocs; ou SELECT COUNT(*) FROM blocs; ou utilise la hotbar !"
    });

    return { success: false, error: 'Commande non reconnue' };
  }
}

export const db = new GameDatabase();
