// DungeonGamePage.js - Handles the main game screen with Three.js
import { DungeonGame } from './DungeonGame.js';

export class DungeonGamePage {
  constructor() {
    this.isVisible = false;
    this.container = null;
    this.dungeonGame = null;
    console.log('🎮 DungeonGamePage initialized');
  }

  async show(dungeonData = null) {
    if (this.isVisible) return;

    await this.createGameScreen();
    
    // Initialize the game with the dungeon data
    this.dungeonGame = new DungeonGame();
    
    // Find canvas container in our screen
    const canvasContainer = this.container.querySelector('.game-canvas-container');
    
    try {
      await this.dungeonGame.init(dungeonData, canvasContainer);
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        this.setupEventListeners();
      }, 100);
      
      this.isVisible = true;
      console.log('📄 Showing dungeon game page');
    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
      this.showError('Failed to load the dungeon. Please try again.');
    }
  }

  async hide() {
    if (!this.isVisible) return;

    if (this.dungeonGame) {
      this.dungeonGame.dispose();
      this.dungeonGame = null;
    }
    
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.isVisible = false;
    console.log('📄 Hiding dungeon game page');
  }

  showError(message) {
    if (this.container) {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 1000;
      `;
      errorDiv.innerHTML = `
        <h3>❌ Error</h3>
        <p>${message}</p>
        <button onclick="window.pageManager.showPage('input')" style="
          background: #fff;
          color: #000;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 10px;
        ">🏠 Back to Input</button>
      `;
      this.container.appendChild(errorDiv);
    }
  }

  async createGameScreen() {
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'dungeonGameScreen';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 900;
      background: #111;
      color: #eee;
      font-family: sans-serif;
      text-align: center;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Create game UI HTML
    this.container.innerHTML = `
      <h1>🏰 Dungeon Rescue</h1>
      <p id="minHp"></p>
      <p id="dungeonSize"></p>
      <p id="knightHP" style="color: #4CAF50; font-weight: bold;">HP: 0/0</p>
      <div class="controls">
        <button id="playBtn" class="play-btn">▶️ Start Rescue Mission</button>
        <button id="resetCameraBtn" class="control-btn">🎯 Reset View</button>
        <button id="focusKnightBtn" class="control-btn" title="Center camera on knight's current position">🔍 Focus on Knight</button>
        <button id="backToInputBtn" class="control-btn" style="background: #FF9800;">🏠 New Dungeon</button>
      </div>
      <div class="camera-info">
        <span id="zoomLevel">Zoom: 100%</span>
        <span class="controls-hint">Use mouse wheel to zoom, drag to pan, or use WASD/arrow keys. Press R to reset view, F to focus on knight.</span>
      </div>
      
      <div class="game-canvas-container"></div>
      
      <!-- Power-up Inventory UI -->
      <div class="inventory">
        <h3>🎒 Current Power-up</h3>
        <div id="currentPowerUp" style="display: none;">
          <div class="power-up-slot">
          </div>
          <p id="powerUpName" class="power-up-name"></p>
        </div>
        <div id="emptySlot" class="power-up-slot empty-slot">
          Empty
        </div>
      </div>
      
      <!-- Enemy Tracker UI -->
      <div class="enemy-tracker">
        <h3>⚔️ Current Enemy</h3>
        <div id="currentEnemy" style="display: none;">
          <div class="enemy-slot">
          </div>
          <p id="enemyName" class="enemy-name"></p>
          <p id="enemyDMG" class="enemy-dmg">DMG: 0</p>
        </div>
        <div id="emptyEnemySlot" class="enemy-slot empty-enemy-slot">
          No Enemy
        </div>
      </div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #444444;"></div>
          <span>Neutral Room</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #00ff00;"></div>
          <span>Power-up Room</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ff0000;"></div>
          <span>Threat Room</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #6B6B6B;"></div>
          <span>⚔️ Knight</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ff69b4;"></div>
          <span>👸 Princess</span>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #dungeonGameScreen canvas { display: block; margin: auto; }
      #dungeonGameScreen .controls { margin: 20px 0; }
      #dungeonGameScreen .play-btn, #dungeonGameScreen .control-btn {
        background: #4CAF50;
        border: none;
        color: white;
        padding: 15px 32px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 16px;
        margin: 4px 2px;
        cursor: pointer;
        border-radius: 8px;
        transition: background-color 0.3s;
      }
      #dungeonGameScreen .control-btn {
        background: #2196F3;
        padding: 10px 20px;
        font-size: 14px;
      }
      #dungeonGameScreen .play-btn:hover { background: #45a049; }
      #dungeonGameScreen .control-btn:hover { background: #1976D2; }
      #dungeonGameScreen .play-btn:disabled { background: #666; cursor: not-allowed; }
      #dungeonGameScreen .camera-info {
        margin: 10px 0;
        font-size: 14px;
      }
      #dungeonGameScreen .camera-info span {
        margin: 0 10px;
      }
      #dungeonGameScreen .controls-hint {
        color: #aaa;
        font-size: 12px;
        font-style: italic;
      }
      #dungeonGameScreen .legend {
        display: inline-block;
        margin: 10px;
        text-align: left;
      }
      #dungeonGameScreen .legend-item {
        margin: 5px 0;
        display: flex;
        align-items: center;
      }
      #dungeonGameScreen .legend-color {
        width: 20px;
        height: 20px;
        margin-right: 10px;
        border: 1px solid #fff;
      }
      #dungeonGameScreen canvas {
        border: 2px solid #333;
        border-radius: 8px;
      }
      #dungeonGameScreen .inventory {
        position: fixed;
        top: 20px;
        right: 200px;
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #333;
        border-radius: 8px;
        padding: 15px;
        min-width: 120px;
        text-align: center;
      }
      #dungeonGameScreen .inventory h3 {
        margin: 0 0 10px 0;
        color: #fff;
        font-size: 14px;
      }
      #dungeonGameScreen .power-up-slot {
        width: 60px;
        height: 60px;
        border: 2px solid #555;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 10px auto;
        background: rgba(255, 255, 255, 0.1);
      }
      #dungeonGameScreen .power-up-slot img {
        width: 50px;
        height: 50px;
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
      }
      #dungeonGameScreen .power-up-name {
        font-size: 12px;
        color: #ccc;
        margin: 0;
      }
      #dungeonGameScreen .empty-slot {
        color: #666;
        font-size: 12px;
      }
      #dungeonGameScreen .enemy-tracker {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(50, 50, 50, 0.9);
        border: 2px solid #777;
        border-radius: 8px;
        padding: 15px;
        min-width: 120px;
        text-align: center;
      }
      #dungeonGameScreen .enemy-tracker h3 {
        margin: 0 0 10px 0;
        color: #fff;
        font-size: 14px;
      }
      #dungeonGameScreen .enemy-slot {
        width: 80px;
        height: 80px;
        border: 2px solid #a55;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 10px auto;
        background: rgba(255, 100, 100, 0.1);
      }
      #dungeonGameScreen .enemy-slot img {
        width: 70px;
        height: 70px;
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
      }
      #dungeonGameScreen .enemy-dmg {
        font-size: 12px;
        color: #ff4444;
        margin: 0;
        font-weight: bold;
      }
      #dungeonGameScreen .enemy-name {
        font-size: 12px;
        color: #ffaa00;
        margin: 0 0 5px 0;
        font-weight: bold;
      }
      #dungeonGameScreen .empty-enemy-slot {
        color: #666;
        font-size: 12px;
      }
      #dungeonGameScreen .game-canvas-container {
        margin: 20px 0;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(this.container);
  }

  setupEventListeners() {
    // Query buttons from within our container to avoid conflicts
    const playBtn = this.container.querySelector('#playBtn');
    const resetCameraBtn = this.container.querySelector('#resetCameraBtn');
    const focusKnightBtn = this.container.querySelector('#focusKnightBtn');
    const backToInputBtn = this.container.querySelector('#backToInputBtn');

    console.log('🎮 Setting up event listeners...');
    console.log('Play button found:', !!playBtn);
    console.log('Reset camera button found:', !!resetCameraBtn);
    console.log('Focus knight button found:', !!focusKnightBtn);
    console.log('Back to input button found:', !!backToInputBtn);
    console.log('DungeonGame instance:', !!this.dungeonGame);

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        console.log('🎬 Play button clicked!');
        if (this.dungeonGame) {
          this.dungeonGame.startAnimation();
        } else {
          console.error('❌ DungeonGame instance not found!');
        }
      });
    }

    if (resetCameraBtn) {
      resetCameraBtn.addEventListener('click', () => {
        console.log('🎯 Reset camera button clicked!');
        if (this.dungeonGame) {
          this.dungeonGame.resetCamera();
        } else {
          console.error('❌ DungeonGame instance not found!');
        }
      });
    }

    if (focusKnightBtn) {
      focusKnightBtn.addEventListener('click', () => {
        console.log('🔍 Focus knight button clicked!');
        if (this.dungeonGame) {
          this.dungeonGame.focusOnKnight();
        } else {
          console.error('❌ DungeonGame instance not found!');
        }
      });
    }

    if (backToInputBtn) {
      backToInputBtn.addEventListener('click', () => {
        console.log('🏠 Back to input button clicked!');
        if (window.pageManager) {
          window.pageManager.showPage('input');
        }
      });
    }

    // Window resize handler
    window.addEventListener('resize', () => {
      if (this.dungeonGame) {
        this.dungeonGame.onWindowResize();
      }
    });
  }

  dispose() {
    this.hide();
  }
}
