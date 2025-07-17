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

  async initialize(scene, cellSize = 50) {
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
  constructor(type, cellSize = 50, fileNameMappings = {}) {
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
