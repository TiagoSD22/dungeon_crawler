import * as THREE from 'three';

export class EnemyManager {
  constructor() {
    this.enemies = new Map(); // Map of position key -> Enemy instance
    this.scene = null;
    this.cellSize = 50;
    console.log('👻 EnemyManager initialized');
  }

  async initialize(scene, cellSize = 50) {
    this.scene = scene;
    this.cellSize = cellSize;
    console.log('👻 Initializing enemy manager...');
  }

  async createEnemyForRoom(i, j, roomValue, cellSize, scene, gridWidth, gridHeight) {
    // Only create enemies for threat rooms (negative values)
    if (roomValue >= 0) return;
    
    const positionKey = `${i},${j}`;
    if (this.enemies.has(positionKey)) {
      console.log(`⚠️ Enemy already exists at position [${i},${j}] - skipping`);
      return;
    }
    
    console.log(`👻 Creating ghost enemy at threat room [${i},${j}]`);
    
    try {
      const enemy = new GhostEnemy(cellSize);
      await enemy.initialize();
      
      // Position in the center of the room
      const x = j * cellSize - (gridWidth * cellSize) / 2;
      const y = -i * cellSize + (gridHeight * cellSize) / 2;
      const z = 15; // Same level as knight
      
      enemy.setPosition(x, y, z);
      
      // Add to scene
      scene.add(enemy.getObject3D());
      
      // Store in manager
      this.enemies.set(positionKey, enemy);
      
      console.log(`👻 Ghost enemy created at position [${i},${j}] facing Front`);
      
    } catch (error) {
      console.error(`Failed to create enemy for room [${i},${j}]:`, error);
    }
  }

  onKnightEntersRoom(i, j, knightDirection) {
    const positionKey = `${i},${j}`;
    const enemy = this.enemies.get(positionKey);
    
    if (enemy) {
      console.log(`👻 Knight entered room [${i},${j}] facing ${knightDirection}`);
      
      // Determine enemy facing direction based on knight's direction
      let enemyDirection = 'Front'; // Default
      
      if (knightDirection === 'Front') {
        // Knight facing front, enemy should face back (towards knight)
        enemyDirection = 'Back';
      } else {
        // For all other directions, enemy faces left
        enemyDirection = 'Left';
      }
      
      enemy.setDirection(enemyDirection);
      console.log(`👻 Enemy now facing ${enemyDirection}`);
    }
  }

  updateAllEnemies(deltaTime) {
    for (const enemy of this.enemies.values()) {
      enemy.update(deltaTime);
    }
  }

  dispose() {
    for (const enemy of this.enemies.values()) {
      enemy.dispose();
    }
    this.enemies.clear();
  }

  removeFromScene(scene) {
    console.log(`🧹 Removing ${this.enemies.size} enemies from scene`);
    for (const enemy of this.enemies.values()) {
      if (enemy.getObject3D()) {
        scene.remove(enemy.getObject3D());
        console.log(`🗑️ Removed enemy from scene`);
      }
    }
  }
}

class GhostEnemy {
  constructor(cellSize = 50) {
    this.sprite = null;
    this.material = null;
    this.cellSize = cellSize;
    this.baseScale = cellSize * 0.8;
    
    // Animation properties
    this.spriteSheet = null;
    this.currentDirection = 'Front'; // Default facing direction
    this.currentFrame = 0;
    this.animationSpeed = 0.2; // Slower animation for idle
    this.lastFrameTime = 0;
    this.isPlaying = true;
    
    // Sprite sheet layout (4x4 grid)
    this.frameWidth = 64; // Each frame is 64x64 pixels
    this.frameHeight = 64;
    this.framesPerRow = 4;
    this.totalFrames = 4;
    
    // Direction mappings to row indices
    this.directionRows = {
      'Front': 0,  // First row
      'Back': 1,   // Second row
      'Left': 2,   // Third row
      'Right': 3   // Fourth row
    };
    
    this.loaded = false;
  }

  async initialize() {
    console.log('👻 Loading ghost enemy sprite sheet...');
    
    try {
      // Load the sprite sheet
      this.spriteSheet = await this.loadTexture('./assets/enemies/ghost/idle/full.png');
      
      // Create material with the sprite sheet
      this.material = new THREE.SpriteMaterial({
        map: this.spriteSheet,
        transparent: true,
        alphaTest: 0.1
      });
      
      // Create sprite
      this.sprite = new THREE.Sprite(this.material);
      this.sprite.scale.set(this.baseScale, this.baseScale, 1);
      
      // Set initial frame (Front direction, frame 0)
      this.updateSpriteFrame();
      
      this.loaded = true;
      console.log('✅ Ghost enemy loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to load ghost enemy:', error);
      throw error;
    }
  }

  loadTexture(path) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        path,
        (texture) => {
          // Setup texture for pixel art
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  setPosition(x, y, z) {
    if (this.sprite) {
      this.sprite.position.set(x, y, z);
    }
  }

  setDirection(direction) {
    if (this.directionRows.hasOwnProperty(direction)) {
      this.currentDirection = direction;
      this.currentFrame = 0; // Reset to first frame of new direction
      this.updateSpriteFrame();
    }
  }

  updateSpriteFrame() {
    if (!this.material || !this.spriteSheet) return;
    
    const row = this.directionRows[this.currentDirection];
    const col = this.currentFrame;
    
    // Calculate UV coordinates for the current frame
    const u = col / this.framesPerRow;
    const v = row / this.framesPerRow;
    const frameU = 1 / this.framesPerRow;
    const frameV = 1 / this.framesPerRow;
    
    // Update texture offset and repeat to show the correct frame
    this.spriteSheet.offset.set(u, 1 - v - frameV); // Flip V coordinate
    this.spriteSheet.repeat.set(frameU, frameV);
    
    this.material.needsUpdate = true;
  }

  update(deltaTime) {
    if (!this.isPlaying || !this.loaded) return;
    
    this.lastFrameTime += deltaTime;
    
    if (this.lastFrameTime >= this.animationSpeed) {
      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
      this.updateSpriteFrame();
      this.lastFrameTime = 0;
    }
  }

  getObject3D() {
    return this.sprite;
  }

  dispose() {
    if (this.material) {
      this.material.dispose();
    }
    if (this.spriteSheet) {
      this.spriteSheet.dispose();
    }
  }
}
