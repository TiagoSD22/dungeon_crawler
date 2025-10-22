// DungeonGame.js - Main game logic extracted from app.js
import * as THREE from 'three';
import { DirectionalSpriteKnight } from './DirectionalSpriteKnight.js';
import { PowerUpManager } from './PowerUpManager.js';
import { SpellEffectManager } from './SpellEffectManager.js';
import { EnemyManager } from './EnemyManager.js';
import { BossManager } from './BossManager.js';
import { FightManager } from './FightManager.js';
import { EnvironmentManager } from './EnvironmentManager.js';
import { AnimatedPrincess } from './AnimatedPrincess.js';

export class DungeonGame {
  constructor() {
    this.cellSize = 120;
    this.WATER_ROWS_OFFSET = 3;
    this.WALL_PADDING = 1;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.dungeonData = null;
    
    // Game objects
    this.knight = null;
    this.princess = null;
    this.powerUpManager = null;
    this.spellEffectManager = null;
    this.enemyManager = null;
    this.bossManager = null;
    this.fightManager = null;
    this.environmentManager = null;
    
    // Game state
    this.isAnimating = false;
    this.zoomLevel = 1;
    this.cameraPosition = { x: 0, y: 0 };
    this.isDragging = false;
    this.lastMousePosition = { x: 0, y: 0 };
    this.knightCurrentHP = 0;
    this.knightMaxHP = 0;
    this.hpNotifications = [];
  }

  // Helper function to convert original grid coordinates to expanded grid coordinates (with walls)
  getExpandedPosition(originalI, originalJ, originalGridWidth, expandedGridHeight) {
    const expandedI = originalI + this.WATER_ROWS_OFFSET + this.WALL_PADDING;
    const expandedJ = originalJ + this.WALL_PADDING;
    const expandedGridWidth = originalGridWidth + (2 * this.WALL_PADDING);
    const x = expandedJ * this.cellSize - (expandedGridWidth * this.cellSize) / 2;
    const y = -expandedI * this.cellSize + (expandedGridHeight * this.cellSize) / 2;
    return { x, y, expandedI, expandedJ };
  }

  async init(dungeonData, container) {
    this.dungeonData = dungeonData;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Add lighting for better 3D model visualization
    const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(100, 100, 200);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    this.scene.add(directionalLight);
    
    const fillLight = new THREE.DirectionalLight(0x8080ff, 0.4);
    fillLight.position.set(-100, -100, 100);
    this.scene.add(fillLight);

    // Calculate dungeon dimensions for proper camera setup
    const originalWidth = this.dungeonData.input[0].length;
    const originalHeight = this.dungeonData.input.length;
    const expandedWidth = originalWidth + (2 * this.WALL_PADDING);
    const expandedHeight = originalHeight + this.WATER_ROWS_OFFSET + (2 * this.WALL_PADDING);
    
    const dungeonWidth = expandedWidth * this.cellSize;
    const expandedDungeonHeight = expandedHeight * this.cellSize;
    const maxDimension = Math.max(dungeonWidth, expandedDungeonHeight);
    
    // Set up orthographic camera with proper bounds
    const aspect = window.innerWidth / window.innerHeight;
    const cameraSize = maxDimension * 1.2;
    
    this.camera = new THREE.OrthographicCamera(
      -cameraSize * aspect / 2, cameraSize * aspect / 2,
      cameraSize / 2, -cameraSize / 2,
      0.1, 1000
    );
    this.camera.position.z = 500;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Append renderer to the container
    container.appendChild(this.renderer.domElement);

    // Update UI with dungeon info
    document.getElementById('minHp').textContent = `Minimum HP Required: ${this.dungeonData.min_hp}`;
    document.getElementById('dungeonSize').textContent = `Dungeon Size: ${this.dungeonData.input.length} x ${this.dungeonData.input[0].length}`;

    await this.createDungeon(this.dungeonData.input);
    
    // Setup camera controls
    this.setupCameraControls();
    
    // Start render loop
    this.animate();
  }

  async createDungeon(grid) {
    // Initialize environment manager
    this.environmentManager = new EnvironmentManager();
    await this.environmentManager.initialize();
    
    // Pre-register special final room coordinates before creating floors
    this.environmentManager.preRegisterSpecialFinalRoom(this.dungeonData.input, this.dungeonData.path);
    
    // Create floors (will skip special final room coordinates)
    this.environmentManager.createFloorsForDungeon(this.dungeonData.input, this.cellSize, this.scene);
    
    this.createDungeonVisual(grid);
    
    await this.createPrincess(grid);
    
    // Initialize power-up manager
    this.powerUpManager = new PowerUpManager();
    await this.createPowerUps(grid);
    
    // Initialize enemy manager
    this.enemyManager = new EnemyManager();
    await this.enemyManager.initialize(this.scene);
    
    // Initialize boss manager
    this.bossManager = new BossManager();
    await this.bossManager.initialize(this.scene, this.cellSize);
    
    // Store grid dimensions for enemy positioning
    this.scene.userData.gridWidth = this.dungeonData.input[0].length + (2 * this.WALL_PADDING);
    this.scene.userData.gridHeight = this.dungeonData.input.length + this.WATER_ROWS_OFFSET + (2 * this.WALL_PADDING);
    
    await this.createEnemies(grid);
    
    // Show loading message
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
      playBtn.textContent = '🔄 Loading Knight Animations...';
      playBtn.disabled = true;
    }
    
    // Wait for Knight animations to load before enabling play button
    await this.createKnight();
    
    // Initialize HP tracking system
    this.initializeHPTracker();
    
    // Initialize spell effect manager
    this.spellEffectManager = new SpellEffectManager();
    await this.spellEffectManager.initialize(this.scene);
    
    // Initialize fight manager
    this.fightManager = new FightManager(this.scene, this.cellSize);
    
    // Connect knight with spell effect manager
    this.knight.characterController.setSpellEffectManager(this.spellEffectManager);
    
    // Sync knight's power-up with power-up manager
    const currentPowerUp = this.powerUpManager.getCurrentPowerUp();
    this.knight.characterController.setCurrentPowerUp(currentPowerUp);
    
    // Enable play button once Knight animations are loaded
    if (playBtn) {
      playBtn.textContent = '▶️ Start Rescue Mission';
      playBtn.disabled = false;
    }
  }

  createDungeonVisual(grid) {
    // Get expanded matrix from environment manager
    const expandedGrid = this.environmentManager ? this.environmentManager.getExpandedMatrix(grid) : grid;
    
    const materialNeutral = new THREE.MeshBasicMaterial({ color: 0x444444, opacity: 0.0, transparent: true });
    const materialPower = new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.0, transparent: true });
    const materialThreat = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.0, transparent: true });
    const materialWater = new THREE.MeshBasicMaterial({ color: 0x0066cc, opacity: 0.0, transparent: true });

    for (let i = 0; i < expandedGrid.length; i++) {
      for (let j = 0; j < expandedGrid[i].length; j++) {
        let val = expandedGrid[i][j];
        let mat;
        
        if (val === -999) {
          mat = materialWater;
        } else {
          mat = val === 0 ? materialNeutral : val > 0 ? materialPower : materialThreat;
        }

        let room = new THREE.Mesh(new THREE.BoxGeometry(this.cellSize, this.cellSize, 1), mat);
        room.position.x = j * this.cellSize - (expandedGrid[0].length * this.cellSize) / 2;
        room.position.y = -i * this.cellSize + (expandedGrid.length * this.cellSize) / 2;
        this.scene.add(room);
      }
    }
  }

  async createPowerUps(grid) {
    console.log('🔮 Creating power-ups for power rooms...');
    
    const expandedGridHeight = grid.length + this.WATER_ROWS_OFFSET + (2 * this.WALL_PADDING);
    
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const roomValue = grid[i][j];
        if (roomValue > 0) {
          const expandedPos = this.getExpandedPosition(i, j, grid[0].length, expandedGridHeight);
          await this.powerUpManager.createPowerUpForRoom(expandedPos.expandedI, expandedPos.expandedJ, roomValue, this.cellSize, this.scene, grid[0].length + (2 * this.WALL_PADDING), expandedGridHeight);
        }
      }
    }
    
    console.log('✅ Power-ups created successfully!');
  }

  async createEnemies(grid) {
    console.log('👻 Creating enemies for threat rooms...');
    
    const expandedGridHeight = grid.length + this.WATER_ROWS_OFFSET + (2 * this.WALL_PADDING);
    const path = this.dungeonData.path;
    const lastPosition = path[path.length - 1];
    const [finalI, finalJ] = lastPosition;
    const finalRoomValue = grid[finalI][finalJ];
    
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const roomValue = grid[i][j];
        if (roomValue < 0) {
          if (i === finalI && j === finalJ && finalRoomValue < 0) {
            const expandedFinalI = finalI + this.WATER_ROWS_OFFSET + this.WALL_PADDING;
            const expandedFinalJ = finalJ + this.WALL_PADDING + 4;
            
            console.log(`👹 Creating final room BOSS at special position [${expandedFinalI}, ${expandedFinalJ}]`);
            await this.bossManager.createBossForRoom(expandedFinalI, expandedFinalJ, roomValue, this.cellSize, this.scene, grid[0].length + (2 * this.WALL_PADDING), expandedGridHeight, 1);
          } else {
            const expandedPos = this.getExpandedPosition(i, j, grid[0].length, expandedGridHeight);
            await this.enemyManager.createEnemyForRoom(expandedPos.expandedI, expandedPos.expandedJ, roomValue, this.cellSize, this.scene, grid[0].length + (2 * this.WALL_PADDING), expandedGridHeight);
          }
        }
      }
    }

    const enemyStats = this.enemyManager.getEnemyCountByType();
    console.log('✅ Enemies created successfully!');
    console.log('📊 Enemy Distribution:', enemyStats);
  }

  async createPrincess(grid) {
    console.log('👸 createPrincess function called');
    
    const path = this.dungeonData.path;
    const lastPosition = path[path.length - 1];
    const [i, j] = lastPosition;
    const finalRoomValue = grid[i][j];
    
    console.log('👸 Princess path info:', { path, lastPosition, finalRoomValue });
    
    // Create special final room environment
    const specialRoom = await this.environmentManager.createSpecialFinalRoom(grid, this.cellSize, this.scene, path);
    
    // Create the animated princess
    const animatedPrincess = new AnimatedPrincess(this.cellSize);
    
    try {
      console.log('👸 Loading princess animations...');
      await animatedPrincess.initialize();
      
      this.princess = animatedPrincess.getObject3D();
      this.princess.princessController = animatedPrincess;
      
      // Position princess at the right end of the special final room
      const expandedGridHeight = grid.length + this.WATER_ROWS_OFFSET + (2 * this.WALL_PADDING);
      const expandedGridWidth = grid[0].length + (2 * this.WALL_PADDING);
      
      if (specialRoom) {
        const princessJ = specialRoom.finalJ + specialRoom.finalRoomWidth - 2;
        const princessX = princessJ * this.cellSize - (expandedGridWidth * this.cellSize) / 2;
        const princessY = -specialRoom.finalI * this.cellSize + (expandedGridHeight * this.cellSize) / 2 + 10;
        
        this.princess.position.x = princessX;
        this.princess.position.y = princessY;
        this.princess.position.z = 15;
        
        console.log(`👸 Princess positioned at special final room: (${princessX}, ${princessY})`);
      } else {
        const expandedPos = this.getExpandedPosition(i, j, grid[0].length, expandedGridHeight);
        this.princess.position.x = expandedPos.x;
        this.princess.position.y = expandedPos.y;
        this.princess.position.z = 15;
      }
      
      this.scene.add(this.princess);
      console.log('✅ Animated princess created successfully!');
      
    } catch (error) {
      console.error('❌ Failed to load animated princess:', error);
      // Fallback code here...
    }
  }

  async createKnight() {
    const directionalKnight = new DirectionalSpriteKnight();
    
    try {
      console.log('Loading directional knight sprites...');
      await directionalKnight.loadAllAnimations();
      
      this.knight = directionalKnight.getObject3D();
      
      const doorRow = this.WATER_ROWS_OFFSET;
      const doorCol = 1;
      const knightStartRow = doorRow - 1;
      const knightStartCol = doorCol;
      
      const expandedGridHeight = this.dungeonData.input.length + this.WATER_ROWS_OFFSET + (2 * this.WALL_PADDING);
      const expandedGridWidth = this.dungeonData.input[0].length + (2 * this.WALL_PADDING);
      
      const knightX = knightStartCol * this.cellSize - (expandedGridWidth * this.cellSize) / 2;
      const knightY = -knightStartRow * this.cellSize + (expandedGridHeight * this.cellSize) / 2;
      
      this.knight.position.x = knightX;
      this.knight.position.y = knightY;
      this.knight.position.z = 15;
      
      this.knight.characterController = directionalKnight;
      this.knight.characterController.goIdle('Front');
      
      const path = this.dungeonData.path;
      const [startI, startJ] = path[0];
      const expandedPos = this.getExpandedPosition(startI, startJ, this.dungeonData.input[0].length, expandedGridHeight);
      this.knight.startingPosition = { x: expandedPos.x, y: expandedPos.y, z: 15 };
      
      const doorX = doorCol * this.cellSize - (expandedGridWidth * this.cellSize) / 2;
      const doorY = -doorRow * this.cellSize + (expandedGridHeight * this.cellSize) / 2;
      this.knight.doorPosition = { x: doorX, y: doorY, z: 15 };
      
      this.scene.add(this.knight);
      
      console.log('Directional knight sprite loaded and added to scene successfully!');
    } catch (error) {
      console.error('Failed to load Directional Knight sprite:', error);
      // Fallback code here...
    }
  }

  initializeHPTracker() {
    this.knightMaxHP = this.dungeonData.min_hp;
    this.knightCurrentHP = this.knightMaxHP;
    
    console.log(`🏥 Knight HP initialized: ${this.knightCurrentHP}/${this.knightMaxHP}`);
    this.updateHPDisplay();
  }

  updateHPDisplay() {
    const hpDisplay = document.getElementById('knightHP');
    if (hpDisplay) {
      hpDisplay.textContent = `HP: ${this.knightCurrentHP}/${this.knightMaxHP}`;
    }
  }

  startAnimation() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
      playBtn.disabled = true;
      playBtn.textContent = '⏳ Rescue in Progress...';
    }
    
    console.log('🎬 Starting rescue mission animation...');
    this.animateEntrance();
  }

  animateEntrance() {
    console.log('🚪 Knight starting entrance sequence...');
    
    if (this.knight.characterController) {
      this.knight.characterController.resetToInitialState();
      this.knight.characterController.goIdle('Front');
    }
    
    this.animateToPosition(
      this.knight.doorPosition,
      'Front',
      800,
      () => {
        this.animateToPosition(
          this.knight.startingPosition,
          'Front',
          800,
          () => {
            if (this.environmentManager) {
              this.environmentManager.startDoorAnimation();
            }
            
            setTimeout(() => {
              this.animatePath();
            }, 500);
          }
        );
      }
    );
  }

  animateToPosition(targetPosition, direction, duration, onComplete) {
    if (this.knight.characterController) {
      this.knight.characterController.startRunning(direction);
    }
    
    const startX = this.knight.position.x;
    const startY = this.knight.position.y;
    const startTime = Date.now();
    
    const animateMove = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      this.knight.position.x = startX + (targetPosition.x - startX) * easeProgress;
      this.knight.position.y = startY + (targetPosition.y - startY) * easeProgress;
      this.knight.position.z = targetPosition.z + Math.sin(progress * Math.PI) * 2;
      
      if (progress < 1) {
        requestAnimationFrame(animateMove);
      } else {
        this.knight.position.x = targetPosition.x;
        this.knight.position.y = targetPosition.y;
        this.knight.position.z = targetPosition.z;
        
        if (onComplete) {
          onComplete();
        }
      }
    };
    
    animateMove();
  }

  animatePath() {
    // Simplified path animation for now
    console.log('🎯 Starting path animation...');
    
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
      playBtn.disabled = false;
      playBtn.textContent = '▶️ Start Rescue Mission';
    }
    this.isAnimating = false;
  }

  setupCameraControls() {
    // Copy camera control logic from original app.js
    if (!this.renderer) return;

    this.renderer.domElement.addEventListener('wheel', (event) => {
      event.preventDefault();
      const zoomSpeed = 0.1;
      
      if (event.deltaY > 0) {
        this.zoomLevel = Math.min(this.zoomLevel * (1 + zoomSpeed), 5);
      } else {
        this.zoomLevel = Math.max(this.zoomLevel * (1 - zoomSpeed), 0.1);
      }
      
      this.updateCameraZoom();
    });

    // Add other camera controls...
    this.renderer.domElement.style.cursor = 'grab';
  }

  updateCameraZoom() {
    if (!this.camera || !this.dungeonData) return;
    
    const dungeonWidth = this.dungeonData.input[0].length * this.cellSize;
    const dungeonHeight = this.dungeonData.input.length * this.cellSize;
    const maxDimension = Math.max(dungeonWidth, dungeonHeight);
    const aspect = window.innerWidth / window.innerHeight;
    const cameraSize = maxDimension * 0.8 * this.zoomLevel;
    
    this.camera.left = -cameraSize * aspect / 2;
    this.camera.right = cameraSize * aspect / 2;
    this.camera.top = cameraSize / 2;
    this.camera.bottom = -cameraSize / 2;
    this.camera.updateProjectionMatrix();
    
    const zoomDisplay = document.getElementById('zoomLevel');
    if (zoomDisplay) {
      zoomDisplay.textContent = `Zoom: ${(1/this.zoomLevel * 100).toFixed(0)}%`;
    }
  }

  resetCamera() {
    this.zoomLevel = 1;
    this.cameraPosition.x = 0;
    this.cameraPosition.y = 0;
    this.updateCameraZoom();
    this.updateCameraPosition();
  }

  updateCameraPosition() {
    if (!this.camera) return;
    this.camera.position.x = this.cameraPosition.x;
    this.camera.position.y = this.cameraPosition.y;
  }

  focusOnKnight() {
    if (!this.knight) return;
    
    // Focus camera animation logic here...
    console.log('Focusing on knight...');
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    const currentTime = Date.now();
    const deltaTime = currentTime - (this.lastTime || currentTime);
    this.lastTime = currentTime;
    
    try {
      if (this.knight && this.knight.characterController) {
        this.knight.characterController.update(deltaTime);
      }
      
      if (this.princess && this.princess.princessController) {
        this.princess.princessController.update(deltaTime);
      }
      
      if (this.powerUpManager) {
        this.powerUpManager.updateAllPowerUps(deltaTime);
      }
      
      if (this.spellEffectManager) {
        this.spellEffectManager.updateAll(deltaTime);
      }
      
      if (this.enemyManager) {
        this.enemyManager.updateAllEnemies(deltaTime);
      }
      
      if (this.bossManager) {
        this.bossManager.updateAllBosses(deltaTime);
      }
    } catch (error) {
      console.error('Error in animation loop:', error);
    }
    
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onWindowResize() {
    if (!this.camera || !this.renderer || !this.dungeonData) return;
    
    const aspect = window.innerWidth / window.innerHeight;
    const dungeonWidth = this.dungeonData.input[0].length * this.cellSize;
    const dungeonHeight = this.dungeonData.input.length * this.cellSize;
    const maxDimension = Math.max(dungeonWidth, dungeonHeight);
    const cameraSize = maxDimension * 0.8 * this.zoomLevel;
    
    this.camera.left = -cameraSize * aspect / 2;
    this.camera.right = cameraSize * aspect / 2;
    this.camera.top = cameraSize / 2;
    this.camera.bottom = -cameraSize / 2;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.scene) {
      this.scene.clear();
    }

    if (this.powerUpManager) {
      this.powerUpManager.dispose();
    }

    if (this.spellEffectManager) {
      this.spellEffectManager.dispose();
    }

    if (this.enemyManager) {
      this.enemyManager.dispose();
    }

    if (this.bossManager) {
      this.bossManager.dispose();
    }

    console.log('🧹 Game resources cleaned up');
  }
}
