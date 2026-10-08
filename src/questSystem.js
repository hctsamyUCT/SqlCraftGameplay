import confetti from 'canvas-confetti';
import { sound } from './sound.js';

export class QuestSystem {
  constructor(db) {
    this.db = db;
    this.missions = [
      {
        id: 'insert',
        title: '1. Le Bâtisseur (INSERT)',
        desc: 'Pose 3 blocs sur le terrain (touches 1 à 3 : Béton, Porte, Plante)',
        target: 3,
        current: 0,
        done: false,
        crud: 'CREATE'
      },
      {
        id: 'update',
        title: "2. L'Artiste (UPDATE)",
        desc: 'Repeins un bloc avec le Pinceau (touche 4)',
        target: 1,
        current: 0,
        done: false,
        crud: 'UPDATE'
      },
      {
        id: 'delete',
        title: '3. Le Démolisseur (DELETE)',
        desc: 'Détruis un bloc avec la Hache (touche 5)',
        target: 1,
        current: 0,
        done: false,
        crud: 'DELETE'
      },
      {
        id: 'count',
        title: "4. L'Analyste (SELECT & COUNT)",
        desc: 'Sélectionne des blocs avec la Loupe (touche 6) et clique Compter',
        target: 1,
        current: 0,
        done: false,
        crud: 'READ / AGGREGATION'
      },
      {
        id: 'join',
        title: "5. L'Architecte Données (JOIN)",
        desc: 'Pose des blocs dans au moins 2 zones différentes, puis clique sur Relier',
        target: 1,
        current: 0,
        done: false,
        crud: 'RELATIONS'
      }
    ];

    this.allCompleted = false;
    this.container = null;
    this.isCollapsed = false;

    this.initUI();
    this.bindDB();
  }

  initUI() {
    let el = document.getElementById('quest-tracker-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'quest-tracker-container';
      el.className = 'quest-tracker';
      document.body.appendChild(el);
    }
    this.container = el;
    this.render();
  }

  render() {
    const completedCount = this.missions.filter(m => m.done).length;
    const total = this.missions.length;
    const percent = Math.round((completedCount / total) * 100);

    let missionsHtml = '';
    this.missions.forEach(m => {
      missionsHtml += `
        <div class="mission-item ${m.done ? 'mission-done' : ''}">
          <div class="mission-check">${m.done ? '✅' : '⚪'}</div>
          <div class="mission-info">
            <div class="mission-name">${m.title}</div>
            <div class="mission-desc">${m.desc}</div>
          </div>
          <span class="mission-tag">${m.crud}</span>
        </div>
      `;
    });

    this.container.innerHTML = `
      <div class="quest-header" id="quest-header-toggle">
        <div class="quest-title">
          <span class="quest-icon">🎯</span>
          <strong>MISSIONS BUT SD</strong>
          <span class="badge badge-accent">${completedCount}/${total}</span>
        </div>
        <button id="btn-collapse-quests" class="btn-xs">${this.isCollapsed ? '➕' : '➖'}</button>
      </div>

      <div class="quest-body ${this.isCollapsed ? 'hidden' : ''}">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${percent}%;"></div>
        </div>
        <div class="missions-list">
          ${missionsHtml}
        </div>
      </div>
    `;

    const toggleBtn = document.getElementById('btn-collapse-quests');
    if (toggleBtn) {
      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        this.isCollapsed = !this.isCollapsed;
        this.render();
      };
    }
  }

  bindDB() {
    this.db.onQuery(payload => {
      this.handleQueryEvent(payload);
    });
  }

  handleQueryEvent(payload) {
    let changed = false;

    // Mission 1: INSERT 3 blocks
    const mInsert = this.missions.find(m => m.id === 'insert');
    if (mInsert && !mInsert.done && payload.op === 'INSERT') {
      mInsert.current++;
      if (mInsert.current >= mInsert.target) {
        this.completeMission(mInsert);
      }
      changed = true;
    }

    // Mission 2: UPDATE block color
    const mUpdate = this.missions.find(m => m.id === 'update');
    if (mUpdate && !mUpdate.done && payload.op === 'UPDATE') {
      this.completeMission(mUpdate);
      changed = true;
    }

    // Mission 3: DELETE block
    const mDelete = this.missions.find(m => m.id === 'delete');
    if (mDelete && !mDelete.done && payload.op === 'DELETE') {
      this.completeMission(mDelete);
      changed = true;
    }

    // Mission 4: COUNT blocks
    const mCount = this.missions.find(m => m.id === 'count');
    if (mCount && !mCount.done && payload.op === 'COUNT') {
      this.completeMission(mCount);
      changed = true;
    }

    // Mission 5: JOIN with both zones
    const mJoin = this.missions.find(m => m.id === 'join');
    if (mJoin && !mJoin.done && payload.op === 'JOIN' && payload.hasBothZones) {
      this.completeMission(mJoin);
      changed = true;
    }

    if (changed) {
      this.render();
      this.checkAllCompleted();
    }
  }

  completeMission(mission) {
    mission.done = true;
    sound.playFanfare();

    // Trigger subtle confetti
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.2, x: 0.15 }
      });
    } catch (e) {}
  }

  checkAllCompleted() {
    if (this.allCompleted) return;
    const doneAll = this.missions.every(m => m.done);

    if (doneAll) {
      this.allCompleted = true;
      sound.playFanfare();

      // Big celebratory fireworks
      try {
        const duration = 3 * 1000;
        const end = Date.now() + duration;

        (function frame() {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        })();
      } catch (e) {}

      // Show Diploma Modal
      this.showDiplomaModal();
    }
  }

  showDiplomaModal() {
    let modal = document.getElementById('diploma-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'diploma-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-card diploma-card fade-in">
        <div class="diploma-icon">🏆</div>
        <h2>FÉLICITATIONS !</h2>
        <div class="diploma-subtitle">Certificat d'Initiation à la Science des Données</div>
        
        <p class="diploma-text">
          Tu viens de manipuler en direct les concepts fondamentaux qui gèrent les données du monde entier : 
          <strong>CRUD (Create, Read, Update, Delete)</strong> et les <strong>Jointures Relationnelles (JOIN)</strong> !
        </p>

        <div class="diploma-highlight">
          <h3>🚀 C'est quoi le BUT Science des Données ?</h3>
          <ul>
            <li>📊 <strong>Bases de données &amp; Big Data :</strong> Stocker et requêter des millions d'informations en SQL et NoSQL.</li>
            <li>🤖 <strong>Intelligence Artificielle &amp; Machine Learning :</strong> Entraîner des modèles prédictifs avec Python.</li>
            <li>📈 <strong>Visualisation &amp; Dashboards :</strong> Raconter des histoires avec les données pour aider les entreprises et la science.</li>
          </ul>
        </div>

        <button id="btn-close-diploma" class="btn-primary-large">Continuer à explorer le monde libre ! 🎮</button>
      </div>
    `;

    modal.classList.remove('hidden');

    const closeBtn = document.getElementById('btn-close-diploma');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.add('hidden');
      };
    }
  }
}
