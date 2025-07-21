import * as THREE from 'three';

export class SpellEffectManager {
  constructor() {
    this.spellEffects = new Map(); // Map of spell type -> SpellEffect instance
    this.scene = null;
    this.availableSpells = [
      'comet', 'fire', 'gypno', 'ice', 'kill_all', 
      'light', 'spikes', 'tesla_ball', 'tornado', 'water'
    ];
    this.fileNameMappings = {
      'comet': 'comet',
      'fire': 'fire',
      'gypno': 'spiral',
      'ice': 'ice',
      'kill_all': 'scull',
      'light': 'shine',
      'spikes': 'spikes',
      'tesla_ball': 'tesla_ball',
      'tornado': 'tornado',
      'water': 'water'
    };
  }

  async initialize(scene, cellSize = 80) {
    this.scene = scene;
    this.cellSize = cellSize;
    console.log('✨ Initializing spell effect manager...');
    
    // Preload all spell effects
    const loadPromises = this.availableSpells.map(async (spellType) => {
      try {
        const spellEffect = new SpellEffect(spellType, cellSize, this.fileNameMappings);
        await spellEffect.loadFrames();
        this.spellEffects.set(spellType, spellEffect);
        
        // Add to scene (initially hidden)
        if (spellEffect.getObject3D()) {
          scene.add(spellEffect.getObject3D());
        }
        
        console.log(`✅ ${spellType} spell effect loaded`);
      } catch (error) {
        console.error(`❌ Failed to load ${spellType} spell effect:`, error);
      }
    });
    
    await Promise.allSettled(loadPromises);
    console.log(`🎯 Spell effects initialization complete - ${this.spellEffects.size} effects loaded`);
  }

  playSpellEffect(spellType, knightPosition, direction = 'Right', onComplete = null) {
    const spellEffect = this.spellEffects.get(spellType);
    
    if (!spellEffect) {
      console.warn(`⚠️ Spell effect not found: ${spellType}`);
      if (onComplete) onComplete();
      return;
    }

    if (!spellEffect.loaded) {
      console.warn(`⚠️ Spell effect ${spellType} not loaded yet`);
      if (onComplete) onComplete();
      return;
    }

    try {
      // Position spell effect based on knight's position and direction
      const spellPosition = this.calculateSpellPosition(knightPosition, direction);
      spellEffect.setPosition(spellPosition.x, spellPosition.y, spellPosition.z);
      
      // Apply rotation based on direction and spell type
      this.applySpellRotation(spellEffect, direction, spellType);
      
      // Play the spell effect
      spellEffect.play(direction, onComplete);
      
      console.log(`🪄 Playing ${spellType} spell effect at position (${spellPosition.x}, ${spellPosition.y}, ${spellPosition.z}) facing ${direction}`);
    } catch (error) {
      console.error(`❌ Error playing ${spellType} spell effect:`, error);
      if (onComplete) onComplete();
    }
  }

  // Play special boss attack effects
  async playBossAttackEffect(bossPosition, direction = 'Left', onComplete = null) {
    console.log(`🔥 Playing boss attack effect: Fire`);
    
    try {
      // Create a special boss attack effect using the fire animation frames
      const bossAttackEffect = await this.createBossAttackEffect();
      
      if (bossAttackEffect) {
        // Position the boss attack effect (starts from boss position)
        const attackPosition = this.calculateBossAttackPosition(bossPosition, direction);
        bossAttackEffect.position.set(attackPosition.x, attackPosition.y, attackPosition.z);
        
        // Store movement data for horizontal animation (left to right)
        bossAttackEffect.userData.startPosition = { ...attackPosition };
        bossAttackEffect.userData.direction = direction;
        bossAttackEffect.userData.movementProgress = 0;
        
        // Calculate target position for movement (same distance as queen blessing)
        const targetPosition = this.calculateBossAttackTargetPosition(attackPosition, direction);
        bossAttackEffect.userData.targetPosition = targetPosition;
        
        // Add to scene
        this.scene.add(bossAttackEffect);
        
        // Play the boss attack animation with movement
        this.playBossAttackAnimation(bossAttackEffect, () => {
          // Remove from scene when complete
          this.scene.remove(bossAttackEffect);
          if (onComplete) onComplete();
        });
      } else {
        console.warn(`⚠️ Failed to create boss attack effect`);
        if (onComplete) onComplete();
      }
    } catch (error) {
      console.error(`❌ Error playing boss attack effect:`, error);
      if (onComplete) onComplete();
    }
  }
  async playQueenBlessingEffect(blessingPowerUp, knightPosition, direction = 'Right', onComplete = null) {
    console.log(`👑 Playing queen blessing effect: ${blessingPowerUp.name}`);
    
    try {
      // Create a special blessing effect using the animation frames
      const blessingEffect = await this.createBlessingEffect(blessingPowerUp);
      
      if (blessingEffect) {
        // Position the blessing effect
        const spellPosition = this.calculateSpellPosition(knightPosition, direction);
        blessingEffect.position.set(spellPosition.x, spellPosition.y, spellPosition.z);
        
        // Store movement data for horizontal animation
        blessingEffect.userData.startPosition = { ...spellPosition };
        blessingEffect.userData.direction = direction;
        blessingEffect.userData.moveDistance = 60; // Same as normal spells
        blessingEffect.userData.movementProgress = 0;
        
        // Calculate target position for movement
        const targetPosition = this.calculateBlessingTargetPosition(spellPosition, direction);
        blessingEffect.userData.targetPosition = targetPosition;
        
        // Add to scene
        this.scene.add(blessingEffect);
        
        // Play the blessing animation with movement
        this.playBlessingAnimation(blessingEffect, blessingPowerUp, () => {
          // Remove from scene when complete
          this.scene.remove(blessingEffect);
          if (onComplete) onComplete();
        });
      } else {
        console.warn(`⚠️ Failed to create blessing effect for ${blessingPowerUp.name}`);
        if (onComplete) onComplete();
      }
    } catch (error) {
      console.error(`❌ Error playing blessing effect:`, error);
      if (onComplete) onComplete();
    }
  }

  async createBossAttackEffect() {
    try {
      // Load the first frame to create the sprite
      const loader = new THREE.TextureLoader();
      const firstFramePath = './assets/boss/attacks/fire1.png';
      
      const texture = await new Promise((resolve, reject) => {
        loader.load(firstFramePath, resolve, undefined, reject);
      });
      
      // Setup texture for pixel art
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      
      // Create sprite material
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1
      });
      
      // Create sprite
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(this.cellSize * 1.5, this.cellSize * 1.5, 1); // Same size as blessing effects
      
      // Store attack data for animation
      sprite.userData = {
        attackType: 'fire',
        frameCount: 10, // fire1.png to fire10.png
        animationPath: './assets/boss/attacks/',
        currentFrame: 1
      };
      
      return sprite;
    } catch (error) {
      console.error(`❌ Failed to create boss attack effect:`, error);
      return null;
    }
  }

  async createBlessingEffect(blessingPowerUp) {
    try {
      // Load the first frame to create the sprite with correct naming convention
      const loader = new THREE.TextureLoader();
      const firstFramePath = this.getBlessingFramePath(blessingPowerUp, 1);
      
      const texture = await new Promise((resolve, reject) => {
        loader.load(firstFramePath, resolve, undefined, reject);
      });
      
      // Setup texture for pixel art
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      
      // Create sprite material
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1
      });
      
      // Create sprite
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(this.cellSize * 1.5, this.cellSize * 1.5, 1); // Larger for dramatic effect
      
      // Store blessing data for animation
      sprite.userData = {
        blessingType: blessingPowerUp.type,
        frameCount: blessingPowerUp.frameCount,
        animationPath: blessingPowerUp.animationPath,
        currentFrame: 1
      };
      
      return sprite;
    } catch (error) {
      console.error(`❌ Failed to create blessing effect:`, error);
      return null;
    }
  }

  playBlessingAnimation(sprite, blessingPowerUp, onComplete) {
    const frameCount = blessingPowerUp.frameCount;
    const frameDuration = 60; // Faster animation - reduced from 100ms to 60ms
    const totalAnimationTime = frameCount * frameDuration; // Total animation duration
    let currentFrame = 1;
    
    const loader = new THREE.TextureLoader();
    const startTime = Date.now();
    
    const playNextFrame = () => {
      if (currentFrame <= frameCount) {
        const framePath = this.getBlessingFramePath(blessingPowerUp, currentFrame);
        
        // Calculate movement progress based on time
        const elapsed = Date.now() - startTime;
        const movementProgress = Math.min(elapsed / totalAnimationTime, 1);
        
        // Update position for horizontal movement
        if (sprite.userData.startPosition && sprite.userData.targetPosition) {
          const startPos = sprite.userData.startPosition;
          const targetPos = sprite.userData.targetPosition;
          
          const currentX = startPos.x + (targetPos.x - startPos.x) * movementProgress;
          const currentY = startPos.y + (targetPos.y - startPos.y) * movementProgress;
          const currentZ = startPos.z + (targetPos.z - startPos.z) * movementProgress;
          
          sprite.position.set(currentX, currentY, currentZ);
        }
        
        loader.load(
          framePath,
          (texture) => {
            // Setup texture
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            
            // Update sprite material
            if (sprite.material.map) {
              sprite.material.map.dispose();
            }
            sprite.material.map = texture;
            sprite.material.needsUpdate = true;
            
            currentFrame++;
            setTimeout(playNextFrame, frameDuration);
          },
          undefined,
          (error) => {
            console.error(`❌ Failed to load frame ${currentFrame} from ${framePath}:`, error);
            currentFrame++;
            setTimeout(playNextFrame, frameDuration);
          }
        );
      } else {
        // Animation complete
        console.log(`✨ Blessing animation completed for ${blessingPowerUp.name}`);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 200);
      }
    };
    
    playNextFrame();
  }

  playBossAttackAnimation(sprite, onComplete) {
    const frameCount = 10; // fire1.png to fire10.png
    const frameDuration = 60; // Same speed as blessing animations
    const totalAnimationTime = frameCount * frameDuration;
    let currentFrame = 1;
    
    const loader = new THREE.TextureLoader();
    const startTime = Date.now();
    
    const playNextFrame = () => {
      if (currentFrame <= frameCount) {
        const framePath = `./assets/boss/attacks/fire${currentFrame}.png`;
        
        // Calculate movement progress based on time
        const elapsed = Date.now() - startTime;
        const movementProgress = Math.min(elapsed / totalAnimationTime, 1);
        
        // Update position for horizontal movement (left to right)
        if (sprite.userData.startPosition && sprite.userData.targetPosition) {
          const startPos = sprite.userData.startPosition;
          const targetPos = sprite.userData.targetPosition;
          
          const currentX = startPos.x + (targetPos.x - startPos.x) * movementProgress;
          const currentY = startPos.y + (targetPos.y - startPos.y) * movementProgress;
          const currentZ = startPos.z + (targetPos.z - startPos.z) * movementProgress;
          
          sprite.position.set(currentX, currentY, currentZ);
        }
        
        loader.load(
          framePath,
          (texture) => {
            // Setup texture
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            
            // Update sprite material
            if (sprite.material.map) {
              sprite.material.map.dispose();
            }
            sprite.material.map = texture;
            sprite.material.needsUpdate = true;
            
            currentFrame++;
            setTimeout(playNextFrame, frameDuration);
          },
          undefined,
          (error) => {
            console.error(`❌ Failed to load boss attack frame ${currentFrame} from ${framePath}:`, error);
            currentFrame++;
            setTimeout(playNextFrame, frameDuration);
          }
        );
      } else {
        // Animation complete
        console.log(`✨ Boss attack animation completed`);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 200);
      }
    };
    
    playNextFrame();
  }

  // Calculate starting position for boss attack
  calculateBossAttackPosition(bossPosition, direction) {
    let offsetX = 0;
    let offsetZ = 0;
    let offsetY = 0;
    
    // Boss attacks from right to left (towards knight)
    switch (direction) {
      case 'Left':
        offsetX = -30; // Start to the left of boss
        break;
      case 'Right':
        offsetX = 30; // Start to the right of boss
        break;
      case 'Front':
        offsetZ = 20;
        offsetY = -20;
        break;
      case 'Back':
        offsetZ = -30;
        break;
      default:
        offsetX = -30; // Default to left
    }
    
    return {
      x: bossPosition.x + offsetX,
      y: bossPosition.y + offsetY,
      z: bossPosition.z + offsetZ + 5
    };
  }

  // Calculate target position for boss attack movement
  calculateBossAttackTargetPosition(startPosition, direction) {
    const moveDistance = 200; // Same distance as blessing animations
    
    switch (direction) {
      case 'Left':
        return {
          x: startPosition.x - moveDistance, // Move left (towards knight)
          y: startPosition.y,
          z: startPosition.z
        };
      case 'Right':
        return {
          x: startPosition.x + moveDistance,
          y: startPosition.y,
          z: startPosition.z
        };
      case 'Front':
        return {
          x: startPosition.x,
          y: startPosition.y - moveDistance,
          z: startPosition.z + moveDistance
        };
      case 'Back':
        return {
          x: startPosition.x,
          y: startPosition.y,
          z: startPosition.z - moveDistance
        };
      default:
        return {
          x: startPosition.x - moveDistance,
          y: startPosition.y,
          z: startPosition.z
        };
    }
  }

  // Calculate target position for blessing movement
  calculateBlessingTargetPosition(startPosition, direction) {
    const moveDistance = 220; // Increased distance to reach boss position
    
    switch (direction) {
      case 'Right':
        return {
          x: startPosition.x + moveDistance,
          y: startPosition.y +  10, // Slightly above ground
          z: startPosition.z
        };
      case 'Front':
        return {
          x: startPosition.x,
          y: startPosition.y - moveDistance,
          z: startPosition.z + moveDistance
        };
      case 'Left':
        return {
          x: startPosition.x - moveDistance,
          y: startPosition.y,
          z: startPosition.z
        };
      case 'Back':
        return {
          x: startPosition.x,
          y: startPosition.y,
          z: startPosition.z - moveDistance
        };
      default:
        return {
          x: startPosition.x + moveDistance,
          y: startPosition.y,
          z: startPosition.z
        };
    }
  }

  // Helper method to get correct file path for each blessing type
  getBlessingFramePath(blessingPowerUp, frameNumber) {
    const basePath = blessingPowerUp.animationPath;
    
    switch (blessingPowerUp.type) {
      case 'phoenix':
        return `${basePath}phoenix_${frameNumber}.png`;
      case 'kraken':
        return `${basePath}${frameNumber}.png`;
      case 'void':
        return `${basePath}Smoke_scull${frameNumber}.png`;
      default:
        console.warn(`Unknown blessing type: ${blessingPowerUp.type}`);
        return `${basePath}${frameNumber}.png`;
    }
  }

  calculateSpellPosition(knightPosition, direction) {
    let offsetX = 0;
    let offsetZ = 0;
    let offsetY = 0; // Y offset can be adjusted if needed
    
    switch (direction) {
      case 'Right':
        offsetX = 30; // To the right of knight
        break;
      case 'Front':
        offsetZ = 20; // In front of knight
        offsetY = -20;
        break;
      case 'Left':
        offsetX = -30; // To the left of knight
        break;
      case 'Back':
        offsetZ = -30; // Behind knight
        break;
      default:
        offsetX = 30; // Default to right
    }
    
    return {
      x: knightPosition.x + offsetX,
      y: knightPosition.y + offsetY,
      z: knightPosition.z + offsetZ + 5 // Slightly above ground
    };
  }

  applySpellRotation(spellEffect, direction, spellType) {
    if (!spellEffect.sprite) return;
    
    // Spells that need rotation when moving along Z-axis (depth)
    const spellsRequiringRotation = ['comet', 'fire', 'gypno', 'ice', 'spikes', 'water'];
    
    // Reset rotation first
    spellEffect.sprite.material.rotation = 0;
    
    // Apply rotation based on direction and spell type
    if (direction === 'Front' || direction === 'Back') {
      // When knight faces front/back, rotate specific spells 90° clockwise
      if (spellsRequiringRotation.includes(spellType)) {
        spellEffect.sprite.material.rotation = 3 * Math.PI / 2; // 90 degrees clockwise
        console.log(`🔄 Rotating ${spellType} spell 90° for depth movement`);
      }
    }
    
    console.log(`🎯 Spell ${spellType} positioned for ${direction} direction`);
  }

  updateAll(deltaTime) {
    for (const spellEffect of this.spellEffects.values()) {
      spellEffect.update(deltaTime);
    }
  }

  dispose() {
    for (const spellEffect of this.spellEffects.values()) {
      spellEffect.dispose();
    }
    this.spellEffects.clear();
  }
}

class SpellEffect {
  constructor(type, cellSize = 80, fileNameMappings = {}) {
    this.type = type;
    this.sprite = null;
    this.material = null;
    this.frames = [];
    this.currentFrame = 0;
    this.animationSpeed = 0.08; // Animation speed
    this.lastFrameTime = 0;
    this.isPlaying = false;
    this.cellSize = cellSize;
    this.baseScale = cellSize * 1.2; // Spell effect size
    this.onComplete = null;
    this.loaded = false;
    this.fileNameMappings = fileNameMappings;
    
    // Movement properties
    this.startPosition = { x: 0, y: 0, z: 0 };
    this.targetPosition = { x: 0, y: 0, z: 0 };
    this.direction = 'Right';
    this.moveSpeed = 80; // Units per second
    this.movementProgress = 0;
    this.shouldMove = true;
  }

  async loadFrames() {
    console.log(`🔍 Loading frames for ${this.type} spell effect...`);
    
    const actualFileName = this.fileNameMappings[this.type] || this.type;
    const basePath = `./assets/spell_fx/${this.type}`;
    
    console.log(`📁 Looking for ${this.type} files with pattern: ${actualFileName}`);
    
    const framePromises = [];
    
    // Try to load frames (up to 20 frames)
    for (let i = 1; i <= 20; i++) {
      const framePath = `${basePath}/${actualFileName}${i}.png`;
      framePromises.push(this.loadTexture(framePath));
    }
    
    try {
      const results = await Promise.allSettled(framePromises);
      
      // Filter out failed loads and keep successful ones
      this.frames = results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);
      
      if (this.frames.length === 0) {
        throw new Error(`No frames loaded for spell effect: ${this.type}`);
      }
      
      console.log(`🪄 Loaded ${this.frames.length} frames for ${this.type} spell effect`);
      
      // Create sprite with first frame
      this.setupSprite();
      this.loaded = true;
      
    } catch (error) {
      console.error(`❌ Failed to load spell effect frames for ${this.type}:`, error);
      throw error;
    }
  }

  async loadTexture(path) {
    return new Promise((resolve) => {
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
        () => resolve(null) // Return null on error
      );
    });
  }

  setupSprite() {
    if (this.frames.length === 0) return;
    
    this.material = new THREE.SpriteMaterial({
      map: this.frames[0],
      transparent: true,
      alphaTest: 0.1
    });
    
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(this.baseScale, this.baseScale, 1);
    this.sprite.visible = false; // Initially hidden
    
    console.log(`🎨 Spell effect sprite created for ${this.type}`);
  }

  setPosition(x, y, z) {
    this.startPosition = { x, y, z };
    if (this.sprite) {
      this.sprite.position.set(x, y, z);
    }
  }

  setMovementTarget(direction) {
    this.direction = direction;
    this.movementProgress = 0;
    
    const moveDistance = 60; // Distance to move
    
    switch (direction) {
      case 'Right':
        this.targetPosition = {
          x: this.startPosition.x + moveDistance,
          y: this.startPosition.y,
          z: this.startPosition.z
        };
        break;
      case 'Front':
        this.targetPosition = {
          x: this.startPosition.x,
          y: this.startPosition.y - moveDistance,
          z: this.startPosition.z + moveDistance
        };
        break;
      case 'Left':
        this.targetPosition = {
          x: this.startPosition.x - moveDistance,
          y: this.startPosition.y,
          z: this.startPosition.z
        };
        break;
      case 'Back':
        this.targetPosition = {
          x: this.startPosition.x,
          y: this.startPosition.y,
          z: this.startPosition.z - moveDistance
        };
        break;
      default:
        this.targetPosition = { ...this.startPosition };
    }
  }

  play(direction = 'Right', onComplete = null) {
    if (!this.loaded || this.frames.length === 0) {
      console.warn(`⚠️ Spell effect ${this.type} not loaded or has no frames`);
      if (onComplete) onComplete();
      return;
    }
    
    console.log(`🪄 Playing ${this.type} spell effect moving ${direction}`);
    
    this.currentFrame = 0;
    this.isPlaying = true;
    this.lastFrameTime = 0;
    this.onComplete = onComplete;
    this.movementProgress = 0;
    
    // Set up movement
    this.setMovementTarget(direction);
    
    // Show sprite and start animation
    this.sprite.visible = true;
    this.updateFrame();
  }

  update(deltaTime) {
    if (!this.isPlaying || !this.loaded) return;
    
    // Update movement
    if (this.shouldMove && this.movementProgress < 1) {
      this.movementProgress += deltaTime * this.moveSpeed / 100;
      this.movementProgress = Math.min(this.movementProgress, 1);
      
      // Interpolate position
      const progress = this.movementProgress;
      const currentX = this.startPosition.x + (this.targetPosition.x - this.startPosition.x) * progress;
      const currentY = this.startPosition.y + (this.targetPosition.y - this.startPosition.y) * progress;
      const currentZ = this.startPosition.z + (this.targetPosition.z - this.startPosition.z) * progress;
      
      this.sprite.position.set(currentX, currentY, currentZ);
    }
    
    // Update frame animation
    this.lastFrameTime += deltaTime;
    
    if (this.lastFrameTime >= this.animationSpeed) {
      this.currentFrame++;
      
      if (this.currentFrame >= this.frames.length) {
        // Animation complete
        this.isPlaying = false;
        this.sprite.visible = false;
        
        if (this.onComplete) {
          this.onComplete();
        }
        
        console.log(`✨ ${this.type} spell effect completed`);
        return;
      }
      
      this.updateFrame();
      this.lastFrameTime = 0;
    }
  }

  updateFrame() {
    if (this.material && this.frames[this.currentFrame]) {
      this.material.map = this.frames[this.currentFrame];
      this.material.needsUpdate = true;
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.sprite) {
      this.sprite.visible = false;
    }
  }

  getObject3D() {
    return this.sprite;
  }

  dispose() {
    this.stop();
    if (this.material) {
      this.material.dispose();
    }
    this.frames.forEach(frame => {
      if (frame) frame.dispose();
    });
    this.frames = [];
  }
}
