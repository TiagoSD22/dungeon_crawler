import * as THREE from 'three';

export class EnemyManager {
  constructor() {
    this.enemies = new Map(); // Map of position key -> Enemy instance
    this.scene = null;
    this.cellSize = 80;
    console.log('👻 EnemyManager initialized');
  }

  async initialize(scene, cellSize = 80) {
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
    
    console.log(`👻 Creating enemy at threat room [${i},${j}]`);
    
    try {
      // Determine enemy type (50% ghost, 50% beholder)
      const enemyType = this.determineEnemyType(i, j, roomValue);
      
      let enemy;
      if (enemyType === 'ghost') {
        // Determine ghost type (1, 2, or 3)
        const ghostType = this.determineGhostType(i, j, roomValue);
        console.log(`👻 Creating ghost type ${ghostType} at threat room [${i},${j}]`);
        
        enemy = new GhostEnemy(cellSize, ghostType);
      } else if (enemyType === 'beholder') {
        // Determine beholder type (1, 2, or 3)
        const beholderType = this.determineBeholderType(i, j, roomValue);
        console.log(`👁️ Creating beholder type ${beholderType} at threat room [${i},${j}]`);
        
        enemy = new BeholderEnemy(cellSize, beholderType);
      } else {
        // Fallback to ghost if unknown type
        console.warn(`⚠️ Unknown enemy type: ${enemyType}, defaulting to ghost`);
        enemy = new GhostEnemy(cellSize, 1);
      }
      
      await enemy.initialize();
      
      // Store room position for reset purposes
      enemy.roomI = i;
      enemy.roomJ = j;
      
      // Position in the center of the room
      const x = j * cellSize - (gridWidth * cellSize) / 2;
      const y = -i * cellSize + (gridHeight * cellSize) / 2;
      const z = 15; // Same level as knight
      
      enemy.setPosition(x, y, z);
      
      // Add to scene
      scene.add(enemy.getObject3D());
      
      // Store in manager
      this.enemies.set(positionKey, enemy);
      
      console.log(`✅ ${enemyType} enemy created at position [${i},${j}] facing Front`);
      
    } catch (error) {
      console.error(`Failed to create enemy for room [${i},${j}]:`, error);
    }
  }

  // Determine what type of enemy to create (50% ghost, 50% beholder)
  determineEnemyType(i, j, roomValue) {
    // Use position and room value to create a pseudo-random but consistent choice
    const seed = (i * 23 + j * 19 + Math.abs(roomValue)) % 2;
    return seed === 0 ? 'ghost' : 'beholder';
  }

  // Determine which ghost type (1, 2, or 3) to create
  determineGhostType(i, j, roomValue) {
    // Use position and room value to create some variety
    // This creates a pseudo-random but consistent distribution
    const seed = (i * 31 + j * 17 + Math.abs(roomValue)) % 3;
    return seed + 1; // Returns 1, 2, or 3
  }

  // Determine which beholder type (1, 2, or 3) to create
  determineBeholderType(i, j, roomValue) {
    // Use a different seed calculation for beholders to ensure variety
    const seed = (i * 37 + j * 13 + Math.abs(roomValue) * 2) % 3;
    return seed + 1; // Returns 1, 2, or 3
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
      
      // Start fight positioning animation
      this.startFightPositioning(enemy, knightDirection, i, j);
      
      console.log(`👻 Enemy now facing ${enemyDirection} and positioning for fight`);
    }
  }

  startFightPositioning(enemy, knightDirection, roomI, roomJ) {
    // Get current enemy position
    const currentPos = enemy.getObject3D().position;
    const startX = currentPos.x;
    const startY = currentPos.y;
    
    // Calculate room center (original position)
    const roomCenterX = roomJ * this.cellSize - (this.scene.userData.gridWidth * this.cellSize) / 2;
    const roomCenterY = -roomI * this.cellSize + (this.scene.userData.gridHeight * this.cellSize) / 2;
    
    // Calculate fighting position based on knight's direction
    let targetX = startX;
    let targetY = startY;
    const fightDistance = this.cellSize * 0.5; // Distance to move for fighting position
    
    if (knightDirection === 'Right') {
      // Knight facing right, enemy steps to the right
      targetX = roomCenterX + fightDistance;
      targetY = roomCenterY;
    } else if (knightDirection === 'Front') {
      // Knight facing front, enemy steps back
      targetX = roomCenterX;
      targetY = roomCenterY - fightDistance;
    } else if (knightDirection === 'Left') {
      // Knight facing left, enemy steps to the left
      targetX = roomCenterX - fightDistance;
      targetY = roomCenterY;
    } else if (knightDirection === 'Back') {
      // Knight facing back, enemy steps forward
      targetX = roomCenterX;
      targetY = roomCenterY - fightDistance;
    }
    
    // Animate to fighting position
    this.animateEnemyToPosition(enemy, targetX, targetY, 400); // 400ms animation
  }

  animateEnemyToPosition(enemy, targetX, targetY, duration = 400) {
    const startTime = Date.now();
    const enemySprite = enemy.getObject3D();
    const startX = enemySprite.position.x;
    const startY = enemySprite.position.y;
    
    console.log(`⚔️ Animating enemy from (${startX}, ${startY}) to (${targetX}, ${targetY})`);
    
    function animateStep() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out animation for smooth movement
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate position
      enemySprite.position.x = startX + (targetX - startX) * easeProgress;
      enemySprite.position.y = startY + (targetY - startY) * easeProgress;
      
      // Add slight bounce effect at the end
      if (progress > 0.8) {
        const bounceProgress = (progress - 0.8) / 0.2;
        const bounceHeight = Math.sin(bounceProgress * Math.PI) * 3;
        enemySprite.position.z = 15 + bounceHeight;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateStep);
      } else {
        console.log(`✅ Enemy positioned for fight at (${targetX}, ${targetY})`);
      }
    }
    
    animateStep();
  }

  resetEnemyPosition(enemy, roomI, roomJ) {
    // Reset enemy to center of room
    const roomCenterX = roomJ * this.cellSize - (this.scene.userData.gridWidth * this.cellSize) / 2;
    const roomCenterY = -roomI * this.cellSize + (this.scene.userData.gridHeight * this.cellSize) / 2;
    
    this.animateEnemyToPosition(enemy, roomCenterX, roomCenterY, 300); // Quick reset
  }

  resetAllEnemyPositions() {
    console.log('🔄 Resetting all enemy positions to room centers');
    for (const enemy of this.enemies.values()) {
      const roomPos = enemy.getRoomPosition();
      if (roomPos.i >= 0 && roomPos.j >= 0) {
        this.resetEnemyPosition(enemy, roomPos.i, roomPos.j);
      }
    }
  }

  // Get enemy at specific position
  getEnemyAt(i, j) {
    const positionKey = `${i},${j}`;
    return this.enemies.get(positionKey) || null;
  }

  // Get all enemies info for debugging
  getAllEnemiesInfo() {
    const enemiesInfo = [];
    for (const [positionKey, enemy] of this.enemies.entries()) {
      enemiesInfo.push({
        position: positionKey,
        ...enemy.getEnemyInfo()
      });
    }
    return enemiesInfo;
  }

  // Get enemy count by type
  getEnemyCountByType() {
    const counts = { 
      ghost: { total: 0, types: { 1: 0, 2: 0, 3: 0 } },
      beholder: { total: 0, types: { 1: 0, 2: 0, 3: 0 } }
    };
    
    for (const enemy of this.enemies.values()) {
      if (enemy.getEnemyInfo) {
        const info = enemy.getEnemyInfo();
        if (info.type === 'ghost') {
          counts.ghost.total++;
          counts.ghost.types[info.ghostType] = (counts.ghost.types[info.ghostType] || 0) + 1;
        } else if (info.type === 'beholder') {
          counts.beholder.total++;
          counts.beholder.types[info.beholderType] = (counts.beholder.types[info.beholderType] || 0) + 1;
        }
      }
    }
    
    return counts;
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
  constructor(cellSize = 80, ghostType = 1) {
    this.sprite = null;
    this.material = null;
    this.cellSize = cellSize;
    this.baseScale = cellSize * 1.1;
    this.ghostType = ghostType; // 1, 2, or 3
    
    // Room position for reset purposes
    this.roomI = -1;
    this.roomJ = -1;
    
    // Combat state
    this.isDead = false;
    
    // Animation properties
    this.spriteSheet = null;
    this.currentDirection = 'Front'; // Default facing direction
    this.currentFrame = 0;
    this.animationSpeed = 0.5; // Slower animation for idle
    this.lastFrameTime = 0;
    this.isPlaying = true;
    
    // Sprite sheet layout (4x4 grid for idle)
    this.frameWidth = 64; // Each frame is 64x64 pixels
    this.frameHeight = 64;
    this.framesPerRow = 4;
    this.totalFrames = 4; // Current animation frames (idle)
    
    // Animation frame counts for different actions
    this.animationFrames = {
      idle: 4,    // Ghost idle animation has 4 frames
      attack: 12, // Ghost attack animation has 12 frames
      hurt: 4,    // Ghost hurt animation has 4 frames
      death: 9    // Ghost death animation has 9 frames
    };
    
    // Direction mappings to row indices
    this.directionRows = {
      'Front': 0,  // First row
      'Back': 1,   // Second row
      'Left': 2,   // Third row
      'Right': 3   // Fourth row
    };
    
    this.loaded = false;
    
    console.log(`👻 Creating ghost type ${this.ghostType}`);
  }

  async initialize() {
    console.log(`👻 Loading ghost type ${this.ghostType} sprite sheet...`);
    
    try {
      // Load the sprite sheet for the specific ghost type
      this.spriteSheet = await this.loadTexture(`./assets/enemies/ghost/${this.ghostType}/idle/full.png`);

      // Set up proper texture settings for sprite sheet
      this.spriteSheet.repeat.set(0.25, 0.25); // Show only 1/4 of texture (4x4 grid)
      this.spriteSheet.offset.set(0, 0.75);    // Start at top-left (Front direction)
      this.spriteSheet.needsUpdate = true;
      
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
      console.log(`✅ Ghost type ${this.ghostType} loaded successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to load ghost type ${this.ghostType}:`, error);
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
    
    // Calculate UV coordinates for the current frame using consistent approach
    const framesPerRow = this.totalFrames;
    const frameWidth = 1 / framesPerRow;  // 0.25
    const frameHeight = 1 / framesPerRow; // 0.25
    
    // Calculate offset (top-left corner of the frame)
    const offsetX = col * frameWidth;
    const offsetY = row * frameHeight;
    
    // Set texture repeat to show only one frame
    this.spriteSheet.repeat.set(frameWidth, frameHeight);
    
    // Set texture offset to the specific frame (Y-axis flipped)
    this.spriteSheet.offset.set(offsetX, 1 - offsetY - frameHeight);
    
    this.spriteSheet.needsUpdate = true;
    this.material.needsUpdate = true;
  }

  update(deltaTime) {
    if (!this.isPlaying || !this.loaded) return;
    
    this.lastFrameTime += deltaTime;
    
    if (this.lastFrameTime >= this.animationSpeed) {
      this.currentFrame = (this.currentFrame + 1) % this.animationFrames.idle;
      this.updateSpriteFrame();
      this.lastFrameTime = 0;
    }
  }

  getObject3D() {
    return this.sprite;
  }

  getRoomPosition() {
    return { i: this.roomI, j: this.roomJ };
  }

  // Get ghost type for identification
  getGhostType() {
    return this.ghostType;
  }

  // Get enemy info for debugging
  getEnemyInfo() {
    return {
      type: 'ghost',
      ghostType: this.ghostType,
      position: { i: this.roomI, j: this.roomJ },
      isDead: this.isDead,
      currentDirection: this.currentDirection
    };
  }

  // Load sprite sheet for specific animation type
  async loadAnimationSpriteSheet(animationType) {
    const path = `./assets/enemies/ghost/${this.ghostType}/${animationType}/full.png`;
    console.log(`👻 Loading ghost type ${this.ghostType} ${animationType} sprite sheet: ${path}`);
    
    try {
      const texture = await this.loadTexture(path);
      return texture;
    } catch (error) {
      console.warn(`⚠️ Could not load ghost type ${this.ghostType} ${animationType} sprite sheet:`, error);
      return null;
    }
  }

  /*
  // Play attack animation
  async playAttackAnimation(row) {
    
    console.log(`👻 Ghost plays attack animation with row ${row}`);
    
    const attackTexture = await this.loadAnimationSpriteSheet('attack');
    if (!attackTexture) {
      console.warn(`⚠️ No attack animation available`);
      return Promise.resolve();
    }
    
    // Attack sprite sheet has 12 columns instead of 4
    return this.playAnimationSequence(attackTexture, row, 0.1, false, 12, 12);
  }*/

  // Play attack animation
  async playAttackAnimation(row) {
    console.log(`👻 Ghost type ${this.ghostType} plays attack animation with row ${row}`);
    
    return new Promise(async (resolve, reject) => {
      try {
        // Load the attack sprite sheet
        const attackTexture = await this.loadAnimationSpriteSheet('attack');
        if (!attackTexture) {
          console.warn(`⚠️ No attack animation available for ghost type ${this.ghostType}`);
          resolve();
          return;
        }        // Store original settings
        const originalTexture = this.material.map;
        const originalRepeat = originalTexture.repeat.clone();
        const originalOffset = originalTexture.offset.clone();
        const originalDirection = this.currentDirection;
        
        // Configure attack texture
        attackTexture.magFilter = THREE.NearestFilter;
        attackTexture.minFilter = THREE.NearestFilter;
        attackTexture.wrapS = THREE.ClampToEdgeWrapping;
        attackTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        // Attack animation settings - use configurable frame count
        const totalFrames = this.animationFrames.attack;
        const frameWidth = 1 / totalFrames;
        const frameHeight = 1 / 4;           // 1/4
        
        // Set up material with attack texture
        this.material.map = attackTexture;
        this.material.needsUpdate = true;
        
        // Configure texture to show one frame at a time
        attackTexture.repeat.set(frameWidth, frameHeight);
        
        let currentFrame = 0;
        
        const animateFrame = () => {
          if (currentFrame < totalFrames) {
            // Calculate UV coordinates
            const offsetX = currentFrame * frameWidth;
            const offsetY = row * frameHeight;
            
            // Set texture offset (Y-axis flipped)
            attackTexture.offset.set(offsetX, 1 - offsetY - frameHeight);
            attackTexture.needsUpdate = true;
            
            console.log(`🎬 Attack frame ${currentFrame + 1}/${totalFrames}`);
            
            currentFrame++;
            setTimeout(animateFrame, 100); // 100ms per frame
          } else {
            // Animation complete - restore original texture
            this.material.map = originalTexture;
            originalTexture.repeat.copy(originalRepeat);
            originalTexture.offset.copy(originalOffset);
            originalTexture.needsUpdate = true;
            this.material.needsUpdate = true;
            
            console.log(`✅ Attack animation completed`);
            resolve();
          }
        };
        
        // Start animation
        animateFrame();
        
      } catch (error) {
        console.error('❌ Failed to play attack animation:', error);
        reject(error);
      }
    });
  }

  // Play hurt animation
  async playHurtAnimation(row) {
    console.log(`👻 Ghost type ${this.ghostType} plays hurt animation with row ${row}`);
    
    return new Promise(async (resolve, reject) => {
      try {
        // Load the hurt sprite sheet
        const hurtTexture = await this.loadAnimationSpriteSheet('hurt');
        if (!hurtTexture) {
          console.warn(`⚠️ No hurt animation available for ghost type ${this.ghostType}`);
          resolve();
          return;
        }
        
        // Store original settings
        const originalTexture = this.material.map;
        const originalRepeat = originalTexture.repeat.clone();
        const originalOffset = originalTexture.offset.clone();
        
        // Configure hurt texture
        hurtTexture.magFilter = THREE.NearestFilter;
        hurtTexture.minFilter = THREE.NearestFilter;
        hurtTexture.wrapS = THREE.ClampToEdgeWrapping;
        hurtTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        // Hurt animation settings - use configurable frame count
        const totalFrames = this.animationFrames.hurt;
        const frameWidth = 1 / totalFrames;
        const frameHeight = 1 / 4;           // 1/4
        
        // Set up material with hurt texture
        this.material.map = hurtTexture;
        this.material.needsUpdate = true;
        
        // Configure texture to show one frame at a time
        hurtTexture.repeat.set(frameWidth, frameHeight);
        
        let currentFrame = 0;
        
        const animateFrame = () => {
          if (currentFrame < totalFrames) {
            // Calculate UV coordinates
            const offsetX = currentFrame * frameWidth;
            const offsetY = row * frameHeight;
            
            // Set texture offset (Y-axis flipped)
            hurtTexture.offset.set(offsetX, 1 - offsetY - frameHeight);
            hurtTexture.needsUpdate = true;
            
            console.log(`💥 Hurt frame ${currentFrame + 1}/${totalFrames}`);
            
            currentFrame++;
            setTimeout(animateFrame, 80); // 80ms per frame
          } else {
            // Animation complete - restore original texture
            this.material.map = originalTexture;
            originalTexture.repeat.copy(originalRepeat);
            originalTexture.offset.copy(originalOffset);
            originalTexture.needsUpdate = true;
            this.material.needsUpdate = true;
            
            console.log(`✅ Hurt animation completed`);
            resolve();
          }
        };
        
        // Start animation
        animateFrame();
        
      } catch (error) {
        console.error('❌ Failed to play hurt animation:', error);
        reject(error);
      }
    });
  }

  // Play death animation
  async playDeathAnimation(row) {
    console.log(`👻 Ghost type ${this.ghostType} plays death animation with row ${row}`);
    
    return new Promise(async (resolve, reject) => {
      try {
        // Load the death sprite sheet
        const deathTexture = await this.loadAnimationSpriteSheet('death');
        if (!deathTexture) {
          console.warn(`⚠️ No death animation available for ghost type ${this.ghostType}`);
          resolve();
          return;
        }
        
        // Store original settings
        const originalTexture = this.material.map;
        const originalRepeat = originalTexture.repeat.clone();
        const originalOffset = originalTexture.offset.clone();
        
        // Configure death texture
        deathTexture.magFilter = THREE.NearestFilter;
        deathTexture.minFilter = THREE.NearestFilter;
        deathTexture.wrapS = THREE.ClampToEdgeWrapping;
        deathTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        // Death animation settings - use configurable frame count
        const totalFrames = this.animationFrames.death;
        const frameWidth = 1 / totalFrames;
        const frameHeight = 1 / 4;           // 1/4
        
        // Set up material with death texture
        this.material.map = deathTexture;
        this.material.needsUpdate = true;
        
        // Configure texture to show one frame at a time
        deathTexture.repeat.set(frameWidth, frameHeight);
        
        let currentFrame = 0;
        
        const animateFrame = () => {
          if (currentFrame < totalFrames) {
            // Calculate UV coordinates
            const offsetX = currentFrame * frameWidth;
            const offsetY = row * frameHeight;
            
            // Set texture offset (Y-axis flipped)
            deathTexture.offset.set(offsetX, 1 - offsetY - frameHeight);
            deathTexture.needsUpdate = true;
            
            console.log(`💀 Death frame ${currentFrame + 1}/${totalFrames}`);
            
            currentFrame++;
            setTimeout(animateFrame, 120); // 120ms per frame
          } else {
            // Animation complete - restore original texture
            this.material.map = originalTexture;
            originalTexture.repeat.copy(originalRepeat);
            originalTexture.offset.copy(originalOffset);
            originalTexture.needsUpdate = true;
            this.material.needsUpdate = true;
            
            console.log(`✅ Death animation completed`);
            resolve();
          }
        };
        
        // Start animation
        animateFrame();
        
      } catch (error) {
        console.error('❌ Failed to play death animation:', error);
        reject(error);
      }
    });
  }

  // Remove enemy from scene (called when dead)
  removeFromScene() {
    if (this.sprite && this.sprite.parent) {
      this.sprite.parent.remove(this.sprite);
      console.log(`👻 Ghost enemy removed from scene`);
    }
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

class BeholderEnemy {
  constructor(cellSize = 80, beholderType = 1) {
    this.sprite = null;
    this.material = null;
    this.cellSize = cellSize;
    this.baseScale = cellSize * 1.1;
    this.beholderType = beholderType; // 1, 2, or 3
    
    // Room position for reset purposes
    this.roomI = -1;
    this.roomJ = -1;
    
    // Combat state
    this.isDead = false;
    
    // Animation properties
    this.spriteSheet = null;
    this.currentDirection = 'Front'; // Default facing direction
    this.currentFrame = 0;
    this.animationSpeed = 0.5; // Slower animation for idle
    this.lastFrameTime = 0;
    this.isPlaying = true;
    
    // Sprite sheet layout (12x4 grid for idle - beholders use 12 frames)
    this.frameWidth = 64; // Each frame is 64x64 pixels
    this.frameHeight = 64;
    this.framesPerRow = 12; // Beholder idle has 12 frames
    this.totalFrames = 12; // Current animation frames (idle)
    
    // Animation frame counts for different actions
    this.animationFrames = {
      idle: 12,   // Beholder idle animation has 12 frames
      attack: 12, // Beholder attack animation has 12 frames
      hurt: 6,    // Beholder hurt animation has 6 frames
      death: 9    // Beholder death animation has 9 frames
    };
    
    // Direction mappings to row indices
    this.directionRows = {
      'Front': 0,  // First row
      'Back': 1,   // Second row
      'Left': 2,   // Third row
      'Right': 3   // Fourth row
    };
    
    this.loaded = false;
    
    console.log(`👁️ Creating beholder type ${this.beholderType}`);
  }

  async initialize() {
    console.log(`👁️ Loading beholder type ${this.beholderType} sprite sheet...`);
    
    try {
      // Load the sprite sheet for the specific beholder type
      this.spriteSheet = await this.loadTexture(`./assets/enemies/beholder/${this.beholderType}/idle/full.png`);

      // Set up proper texture settings for sprite sheet (12x4 grid)
      this.spriteSheet.repeat.set(1/12, 0.25); // Show only 1/12 width, 1/4 height
      this.spriteSheet.offset.set(0, 0.75);    // Start at top-left (Front direction)
      this.spriteSheet.needsUpdate = true;
      
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
      console.log(`✅ Beholder type ${this.beholderType} loaded successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to load beholder type ${this.beholderType}:`, error);
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
    
    // Calculate UV coordinates for the current frame - beholder has 12 frames per row
    const framesPerRow = this.animationFrames.idle; // Use idle frame count (12)
    const frameWidth = 1 / framesPerRow;  // 1/12
    const frameHeight = 1 / 4; // 1/4 (4 rows)
    
    // Calculate offset (top-left corner of the frame)
    const offsetX = col * frameWidth;
    const offsetY = row * frameHeight;
    
    // Set texture repeat to show only one frame
    this.spriteSheet.repeat.set(frameWidth, frameHeight);
    
    // Set texture offset to the specific frame (Y-axis flipped)
    this.spriteSheet.offset.set(offsetX, 1 - offsetY - frameHeight);
    
    this.spriteSheet.needsUpdate = true;
    this.material.needsUpdate = true;
  }

  update(deltaTime) {
    if (!this.isPlaying || !this.loaded) return;
    
    this.lastFrameTime += deltaTime;
    
    if (this.lastFrameTime >= this.animationSpeed) {
      this.currentFrame = (this.currentFrame + 1) % this.animationFrames.idle;
      this.updateSpriteFrame();
      this.lastFrameTime = 0;
    }
  }

  getObject3D() {
    return this.sprite;
  }

  getRoomPosition() {
    return { i: this.roomI, j: this.roomJ };
  }

  // Get beholder type for identification
  getBeholderType() {
    return this.beholderType;
  }

  // Get enemy info for debugging
  getEnemyInfo() {
    return {
      type: 'beholder',
      beholderType: this.beholderType,
      position: { i: this.roomI, j: this.roomJ },
      isDead: this.isDead,
      currentDirection: this.currentDirection
    };
  }

  // Load sprite sheet for specific animation type
  async loadAnimationSpriteSheet(animationType) {
    const path = `./assets/enemies/beholder/${this.beholderType}/${animationType}/full.png`;
    console.log(`👁️ Loading beholder type ${this.beholderType} ${animationType} sprite sheet: ${path}`);
    
    try {
      const texture = await this.loadTexture(path);
      return texture;
    } catch (error) {
      console.warn(`⚠️ Could not load beholder type ${this.beholderType} ${animationType} sprite sheet:`, error);
      return null;
    }
  }

  // Play attack animation
  async playAttackAnimation(row) {
    console.log(`👁️ Beholder type ${this.beholderType} plays attack animation with row ${row}`);
    
    return new Promise(async (resolve, reject) => {
      try {
        // Load the attack sprite sheet
        const attackTexture = await this.loadAnimationSpriteSheet('attack');
        if (!attackTexture) {
          console.warn(`⚠️ No attack animation available for beholder type ${this.beholderType}`);
          resolve();
          return;
        }
        
        // Store original settings
        const originalTexture = this.material.map;
        const originalRepeat = originalTexture.repeat.clone();
        const originalOffset = originalTexture.offset.clone();
        const originalDirection = this.currentDirection;
        
        // Configure attack texture
        attackTexture.magFilter = THREE.NearestFilter;
        attackTexture.minFilter = THREE.NearestFilter;
        attackTexture.wrapS = THREE.ClampToEdgeWrapping;
        attackTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        // Attack animation settings - use configurable frame count
        const totalFrames = this.animationFrames.attack;
        const frameWidth = 1 / totalFrames;
        const frameHeight = 1 / 4;           // 1/4
        
        // Set up material with attack texture
        this.material.map = attackTexture;
        this.material.needsUpdate = true;
        
        // Configure texture to show one frame at a time
        attackTexture.repeat.set(frameWidth, frameHeight);
        
        let currentFrame = 0;
        
        const animateFrame = () => {
          if (currentFrame < totalFrames) {
            // Calculate UV coordinates
            const offsetX = currentFrame * frameWidth;
            const offsetY = row * frameHeight;
            
            // Set texture offset (Y-axis flipped)
            attackTexture.offset.set(offsetX, 1 - offsetY - frameHeight);
            attackTexture.needsUpdate = true;
            
            console.log(`🎬 Beholder attack frame ${currentFrame + 1}/${totalFrames}`);
            
            currentFrame++;
            setTimeout(animateFrame, 100); // 100ms per frame
          } else {
            // Animation complete - restore original texture
            this.material.map = originalTexture;
            originalTexture.repeat.copy(originalRepeat);
            originalTexture.offset.copy(originalOffset);
            originalTexture.needsUpdate = true;
            this.material.needsUpdate = true;
            
            console.log(`✅ Beholder attack animation completed`);
            resolve();
          }
        };
        
        // Start animation
        animateFrame();
        
      } catch (error) {
        console.error('❌ Failed to play beholder attack animation:', error);
        reject(error);
      }
    });
  }

  // Play hurt animation
  async playHurtAnimation(row) {
    console.log(`👁️ Beholder type ${this.beholderType} plays hurt animation with row ${row}`);
    
    return new Promise(async (resolve, reject) => {
      try {
        // Load the hurt sprite sheet
        const hurtTexture = await this.loadAnimationSpriteSheet('hurt');
        if (!hurtTexture) {
          console.warn(`⚠️ No hurt animation available for beholder type ${this.beholderType}`);
          resolve();
          return;
        }
        
        // Store original settings
        const originalTexture = this.material.map;
        const originalRepeat = originalTexture.repeat.clone();
        const originalOffset = originalTexture.offset.clone();
        
        // Configure hurt texture
        hurtTexture.magFilter = THREE.NearestFilter;
        hurtTexture.minFilter = THREE.NearestFilter;
        hurtTexture.wrapS = THREE.ClampToEdgeWrapping;
        hurtTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        // Hurt animation settings - use configurable frame count (6 frames for beholder)
        const totalFrames = this.animationFrames.hurt;
        const frameWidth = 1 / totalFrames;
        const frameHeight = 1 / 4;           // 1/4
        
        // Set up material with hurt texture
        this.material.map = hurtTexture;
        this.material.needsUpdate = true;
        
        // Configure texture to show one frame at a time
        hurtTexture.repeat.set(frameWidth, frameHeight);
        
        let currentFrame = 0;
        
        const animateFrame = () => {
          if (currentFrame < totalFrames) {
            // Calculate UV coordinates
            const offsetX = currentFrame * frameWidth;
            const offsetY = row * frameHeight;
            
            // Set texture offset (Y-axis flipped)
            hurtTexture.offset.set(offsetX, 1 - offsetY - frameHeight);
            hurtTexture.needsUpdate = true;
            
            console.log(`💥 Beholder hurt frame ${currentFrame + 1}/${totalFrames}`);
            
            currentFrame++;
            setTimeout(animateFrame, 80); // 80ms per frame
          } else {
            // Animation complete - restore original texture
            this.material.map = originalTexture;
            originalTexture.repeat.copy(originalRepeat);
            originalTexture.offset.copy(originalOffset);
            originalTexture.needsUpdate = true;
            this.material.needsUpdate = true;
            
            console.log(`✅ Beholder hurt animation completed`);
            resolve();
          }
        };
        
        // Start animation
        animateFrame();
        
      } catch (error) {
        console.error('❌ Failed to play beholder hurt animation:', error);
        reject(error);
      }
    });
  }

  // Play death animation
  async playDeathAnimation(row) {
    console.log(`👁️ Beholder type ${this.beholderType} plays death animation with row ${row}`);
    
    return new Promise(async (resolve, reject) => {
      try {
        // Load the death sprite sheet
        const deathTexture = await this.loadAnimationSpriteSheet('death');
        if (!deathTexture) {
          console.warn(`⚠️ No death animation available for beholder type ${this.beholderType}`);
          resolve();
          return;
        }
        
        // Store original settings
        const originalTexture = this.material.map;
        const originalRepeat = originalTexture.repeat.clone();
        const originalOffset = originalTexture.offset.clone();
        
        // Configure death texture
        deathTexture.magFilter = THREE.NearestFilter;
        deathTexture.minFilter = THREE.NearestFilter;
        deathTexture.wrapS = THREE.ClampToEdgeWrapping;
        deathTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        // Death animation settings - use configurable frame count
        const totalFrames = this.animationFrames.death;
        const frameWidth = 1 / totalFrames;
        const frameHeight = 1 / 4;           // 1/4
        
        // Set up material with death texture
        this.material.map = deathTexture;
        this.material.needsUpdate = true;
        
        // Configure texture to show one frame at a time
        deathTexture.repeat.set(frameWidth, frameHeight);
        
        let currentFrame = 0;
        
        const animateFrame = () => {
          if (currentFrame < totalFrames) {
            // Calculate UV coordinates
            const offsetX = currentFrame * frameWidth;
            const offsetY = row * frameHeight;
            
            // Set texture offset (Y-axis flipped)
            deathTexture.offset.set(offsetX, 1 - offsetY - frameHeight);
            deathTexture.needsUpdate = true;
            
            console.log(`💀 Beholder death frame ${currentFrame + 1}/${totalFrames}`);
            
            currentFrame++;
            setTimeout(animateFrame, 120); // 120ms per frame
          } else {
            // Animation complete - restore original texture
            this.material.map = originalTexture;
            originalTexture.repeat.copy(originalRepeat);
            originalTexture.offset.copy(originalOffset);
            originalTexture.needsUpdate = true;
            this.material.needsUpdate = true;
            
            console.log(`✅ Beholder death animation completed`);
            resolve();
          }
        };
        
        // Start animation
        animateFrame();
        
      } catch (error) {
        console.error('❌ Failed to play beholder death animation:', error);
        reject(error);
      }
    });
  }

  // Remove enemy from scene (called when dead)
  removeFromScene() {
    if (this.sprite && this.sprite.parent) {
      this.sprite.parent.remove(this.sprite);
      console.log(`👁️ Beholder enemy removed from scene`);
    }
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
