import * as THREE from 'three';

export class BossManager {
  constructor() {
    this.bosses = new Map(); // Map of position key -> Boss instance
    this.scene = null;
    this.cellSize = 120;
    console.log('👹 BossManager initialized');
  }

  async initialize(scene, cellSize = 120) {
    this.scene = scene;
    this.cellSize = cellSize;
    console.log('👹 Initializing boss manager...');
  }

  async createBossForRoom(i, j, roomValue, cellSize, scene, gridWidth, gridHeight, bossId = 1) {
    const positionKey = `${i},${j}`;
    if (this.bosses.has(positionKey)) {
      console.warn(`⚠️ Boss already exists at position [${i},${j}]`);
      return this.bosses.get(positionKey);
    }
    
    console.log(`👹 Creating boss ${bossId} at position [${i},${j}]`);
    
    try {
      const boss = new BossEnemy(cellSize, bossId);
      await boss.initialize();
      
      // Calculate position
      const x = j * cellSize - (gridWidth * cellSize) / 2;
      const y = -i * cellSize + (gridHeight * cellSize) / 2;
      
      boss.setPosition(x, y, 0);
      boss.roomI = i;
      boss.roomJ = j;
      
      // Add to scene
      scene.add(boss.getObject3D());
      
      // Store boss
      this.bosses.set(positionKey, boss);
      
      console.log(`✅ Boss ${bossId} created successfully at [${i},${j}]`);
      return boss;
    } catch (error) {
      console.error(`❌ Failed to create boss at [${i},${j}]:`, error);
      return null;
    }
  }

  // Get boss at specific position
  getBossAt(i, j) {
    const positionKey = `${i},${j}`;
    return this.bosses.get(positionKey) || null;
  }

  updateAllBosses(deltaTime) {
    for (const boss of this.bosses.values()) {
      boss.update(deltaTime);
    }
  }

  dispose() {
    for (const boss of this.bosses.values()) {
      boss.dispose();
    }
    this.bosses.clear();
  }

  removeFromScene(scene) {
    console.log(`🧹 Removing ${this.bosses.size} bosses from scene`);
    for (const boss of this.bosses.values()) {
      if (boss.sprite && boss.sprite.parent) {
        boss.sprite.parent.remove(boss.sprite);
      }
    }
  }
}

class BossEnemy {
  constructor(cellSize = 120, bossId = 1, sizeMultiplier = 2.0) {
    this.name = "Boss";
    this.sprite = null;
    this.material = null;
    this.cellSize = cellSize;
    this.baseScale = cellSize * 1.2 * sizeMultiplier; // Larger scale for boss
    this.bossId = bossId;
    this.sizeMultiplier = sizeMultiplier;
    
    // Room position for reset purposes
    this.roomI = -1;
    this.roomJ = -1;
    
    // Combat state
    this.isDead = false;
    
    // Animation properties
    this.animations = new Map(); // Store different animation sprite sheets
    this.currentAnimation = 'idle';
    this.currentFrame = 0;
    this.animationSpeed = 0.15; // Animation speed
    this.lastFrameTime = 0;
    this.isPlaying = true;
    
    // Animation configurations
    this.animationConfigs = {
      anger: { frames: 5, speed: 0.5 },
      attack: { frames: 7, speed: 0.4 },
      death: { frames: 4, speed: 0.5 }, // Slower death animation
      hurt: { frames: 2, speed: 0.3 },
      idle: { frames: 3, speed: 0.7 },  // Slower idle animation
      run: { frames: 6, speed: 0.1 },
      walk: { frames: 6, speed: 0.15 }
    };
    
    // Special attack animations
    this.specialAttackConfigs = {
      fire: { frames: 5, speed: 0.4 },
      blade: { frames: 5, speed: 0.4 },
      lightning: { frames: 5, speed: 0.4 }
    };
    
    this.loaded = false;
    
    console.log(`👹 Creating boss ${this.bossId}`);
  }

  async initialize() {
    console.log(`👹 Loading boss ${this.bossId} animations...`);
    
    try {
      // Load all basic animations
      for (const [animName, config] of Object.entries(this.animationConfigs)) {
        await this.loadAnimation(animName, config.frames);
      }
      
      // Load special attack animations
      for (const [attackName, config] of Object.entries(this.specialAttackConfigs)) {
        await this.loadSpecialAttackAnimation(attackName, config.frames);
      }
      
      // Set up initial sprite with idle animation
      this.setupSprite();
      this.loaded = true;
      
      console.log(`✅ Boss ${this.bossId} animations loaded successfully!`);
    } catch (error) {
      console.error(`❌ Failed to load boss ${this.bossId} animations:`, error);
      throw error;
    }
  }

  async loadAnimation(animationName, frameCount) {
    console.log(`📸 Loading ${animationName} animation with ${frameCount} frames`);
    
    const frames = [];
    const basePath = `./assets/boss/${this.bossId}`;
    
    // Capitalize first letter for file naming
    const capitalizedName = animationName.charAt(0).toUpperCase() + animationName.slice(1);
    
    for (let i = 1; i <= frameCount; i++) {
      const framePath = `${basePath}/${capitalizedName}${i}.png`;
      try {
        const texture = await this.loadTexture(framePath);
        if (texture) {
          // Apply horizontal flip to all frames (boss faces right, we want left)
          texture.flipY = true;
          texture.wrapS = THREE.RepeatWrapping;
          texture.repeat.x = -1; // Horizontal flip
          frames.push(texture);
        }
      } catch (error) {
        console.warn(`⚠️ Could not load frame ${i} for ${animationName}: ${framePath}`);
      }
    }
    
    if (frames.length > 0) {
      this.animations.set(animationName, frames);
      console.log(`✅ Loaded ${frames.length} frames for ${animationName}`);
    } else {
      console.warn(`⚠️ No frames loaded for ${animationName}`);
    }
  }

  async loadSpecialAttackAnimation(attackName, frameCount) {
    console.log(`🔥 Loading special attack ${attackName} animation with ${frameCount} frames`);
    
    const frames = [];
    const basePath = `./assets/boss/${this.bossId}/special_attacks/${attackName}`;
    
    for (let i = 1; i <= frameCount; i++) {
      const framePath = `${basePath}/${attackName}${i}.png`;
      try {
        const texture = await this.loadTexture(framePath);
        if (texture) {
          // Apply horizontal flip to special attacks too
          texture.flipY = true;
          texture.wrapS = THREE.RepeatWrapping;
          texture.repeat.x = -1; // Horizontal flip
          frames.push(texture);
        }
      } catch (error) {
        console.warn(`⚠️ Could not load special attack frame ${i} for ${attackName}: ${framePath}`);
      }
    }
    
    if (frames.length > 0) {
      this.animations.set(`special_${attackName}`, frames);
      console.log(`✅ Loaded ${frames.length} frames for special attack ${attackName}`);
    } else {
      console.warn(`⚠️ No frames loaded for special attack ${attackName}`);
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
          texture.wrapT = THREE.ClampToEdgeWrapping;
          resolve(texture);
        },
        undefined,
        (error) => {
          console.warn(`Failed to load texture: ${path}`, error);
          resolve(null);
        }
      );
    });
  }

  setupSprite() {
    const idleFrames = this.animations.get('idle');
    if (!idleFrames || idleFrames.length === 0) {
      console.error('❌ No idle animation frames available for boss');
      return;
    }
    
    this.material = new THREE.SpriteMaterial({
      map: idleFrames[0],
      transparent: true,
      alphaTest: 0.1
    });
    
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(this.baseScale, this.baseScale, 1);
    
    // Start with idle animation
    this.setAnimation('idle');
    
    console.log(`🎨 Boss sprite created with idle animation`);
  }

  setAnimation(animationName) {
    if (this.animations.has(animationName)) {
      this.currentAnimation = animationName;
      this.currentFrame = 0;
      this.lastFrameTime = 0;
      this.updateFrame();
      console.log(`🎬 Boss animation set to: ${animationName}`);
    } else {
      console.warn(`⚠️ Animation ${animationName} not found for boss`);
    }
  }

  setPosition(x, y, z) {
    if (this.sprite) {
      this.sprite.position.set(x, y, z);
    }
  }

  updateFrame() {
    const frames = this.animations.get(this.currentAnimation);
    if (!frames || frames.length === 0 || !this.material) return;
    
    this.material.map = frames[this.currentFrame];
    this.material.needsUpdate = true;
  }

  update(deltaTime) {
    if (!this.isPlaying || !this.loaded) return;
    
    this.lastFrameTime += deltaTime;
    
    // Get animation speed from current animation
    let speed = this.animationSpeed;
    if (this.animationConfigs[this.currentAnimation]) {
      speed = this.animationConfigs[this.currentAnimation].speed;
    } else if (this.currentAnimation.startsWith('special_')) {
      const attackType = this.currentAnimation.replace('special_', '');
      if (this.specialAttackConfigs[attackType]) {
        speed = this.specialAttackConfigs[attackType].speed;
      }
    }
    
    if (this.lastFrameTime >= speed) {
      const frames = this.animations.get(this.currentAnimation);
      if (frames && frames.length > 0) {
        this.currentFrame = (this.currentFrame + 1) % frames.length;
        this.updateFrame();
      }
      this.lastFrameTime = 0;
    }
  }

  // Play specific animation and return to idle when complete
  async playAnimation(animationName, returnToIdle = true) {
    return new Promise((resolve) => {
      if (!this.animations.has(animationName)) {
        console.warn(`⚠️ Animation ${animationName} not found`);
        resolve();
        return;
      }
      
      console.log(`🎬 Playing boss animation: ${animationName}`);
      
      const frames = this.animations.get(animationName);
      const totalFrames = frames.length;
      let frameCount = 0;
      
      this.setAnimation(animationName);
      
      // Get animation speed
      let speed = this.animationSpeed;
      if (this.animationConfigs[animationName]) {
        speed = this.animationConfigs[animationName].speed;
      } else if (animationName.startsWith('special_')) {
        const attackType = animationName.replace('special_', '');
        if (this.specialAttackConfigs[attackType]) {
          speed = this.specialAttackConfigs[attackType].speed;
        }
      }
      
      const animationInterval = setInterval(() => {
        frameCount++;
        if (frameCount >= totalFrames) {
          clearInterval(animationInterval);
          if (returnToIdle && animationName !== 'death') {
            this.setAnimation('idle');
          }
          resolve();
        }
      }, speed * 1000);
    });
  }

  // Play anger animation
  async playAngerAnimation() {
    return this.playAnimation('anger');
  }

  // Play attack animation
  async playAttackAnimation() {
    return this.playAnimation('attack');
  }

  // Play special attack animation
  async playSpecialAttackAnimation(attackType) {
    const animationName = `special_${attackType}`;
    return this.playAnimation(animationName);
  }

  // Play hurt animation
  async playHurtAnimation() {
    return this.playAnimation('hurt');
  }

  // Play death animation
  async playDeathAnimation() {
    return this.playAnimation('death', false); // Don't return to idle after death
  }

  getObject3D() {
    return this.sprite;
  }

  getRoomPosition() {
    return { i: this.roomI, j: this.roomJ };
  }

  // Get boss info for debugging
  getBossInfo() {
    return {
      type: 'boss',
      bossId: this.bossId,
      position: { i: this.roomI, j: this.roomJ },
      isDead: this.isDead,
      currentAnimation: this.currentAnimation
    };
  }

  // Remove boss from scene (called when dead)
  removeFromScene() {
    if (this.sprite && this.sprite.parent) {
      console.log('👹 Removing boss from scene');
      this.sprite.parent.remove(this.sprite);
    }
  }

  dispose() {
    if (this.material) {
      if (this.material.map) {
        this.material.map.dispose();
      }
      this.material.dispose();
    }
    
    // Dispose all animation textures
    for (const frames of this.animations.values()) {
      frames.forEach(texture => texture.dispose());
    }
    this.animations.clear();
  }
}
