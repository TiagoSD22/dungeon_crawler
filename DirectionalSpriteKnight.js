import * as THREE from 'three';

export class DirectionalSpriteKnight {
  constructor() {
    this.sprite = null;
    this.material = null;
    this.animations = {}; // Store all animation sets
    this.currentAnimation = null;
    this.currentDirection = 'Right'; // Default direction
    this.loaded = false;
    this.loadCallbacks = [];
    
    // Animation properties
    this.currentFrame = 0;
    this.animationSpeed = 0.1; // Time between frames
    this.lastFrameTime = 0;
    this.isPlaying = false;
    this.loop = true;
    
    // Animation states
    this.isIdle = true;
    this.isWalking = false;
    this.isRunning = false;
    this.isAttacking = false;
  }

  async loadAllAnimations(cellSize = 50) {
    console.log('🎮 Loading all directional knight animations...');
    
    const baseDir = './assets/knight_sprites';
    const directions = ['Right', 'Front'];
    const actions = {
      'idle': 'Idle Blinking',
      'walking': 'Walking', 
      'running': 'Running',
      'slashing': 'Slashing'
    };
    
    // Load all combinations
    const loadPromises = [];
    
    for (const direction of directions) {
      this.animations[direction] = {};
      
      for (const [actionKey, actionFolder] of Object.entries(actions)) {
        const animationPath = `${baseDir}/${direction}/${direction} - ${actionFolder}`;
        
        loadPromises.push(
          this.loadAnimationSequence(direction, actionKey, animationPath)
        );
      }
    }
    
    try {
      await Promise.all(loadPromises);
      console.log('✅ All knight animations loaded successfully');
      
      // Setup initial sprite
      this.setupInitialSprite(cellSize);
      
      // Start with idle animation facing right
      this.playAnimation('idle', 'Right');
      
    } catch (error) {
      console.error('❌ Error loading knight animations:', error);
      throw error;
    }
  }

  async loadAnimationSequence(direction, action, basePath) {
    return new Promise(async (resolve, reject) => {
      try {
        // First, try to determine how many frames exist
        const frames = [];
        let frameIndex = 0;
        
        // Try to load frames until we can't find more
        while (frameIndex < 50) { // Max 50 frames safety limit
          const frameNumber = frameIndex.toString().padStart(3, '0');
          const framePath = `${basePath}/${basePath.split('/').pop()}_${frameNumber}.png`;
          
          try {
            const texture = await this.loadTexture(framePath);
            frames.push(texture);
            frameIndex++;
          } catch (error) {
            // No more frames found
            break;
          }
        }
        
        if (frames.length === 0) {
          throw new Error(`No frames found for ${direction} - ${action}`);
        }
        
        // Store the animation
        this.animations[direction][action] = {
          frames: frames,
          frameCount: frames.length,
          currentFrame: 0
        };
        
        console.log(`📁 Loaded ${direction} - ${action}: ${frames.length} frames`);
        resolve();
        
      } catch (error) {
        console.error(`❌ Error loading ${direction} - ${action}:`, error);
        reject(error);
      }
    });
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

  setupInitialSprite(cellSize = 50) {
    // Create initial sprite with first frame of idle animation
    const initialTexture = this.animations['Right']['idle'].frames[0];
    
    this.material = new THREE.SpriteMaterial({
      map: initialTexture,
      transparent: true,
      alphaTest: 0.5
    });
    
    this.sprite = new THREE.Sprite(this.material);
    
    // Scale proportional to cell size
    const spriteSize = cellSize * 0.8;
    this.sprite.scale.set(spriteSize, spriteSize, 1);
    
    console.log('🎯 Knight sprite created with scale:', this.sprite.scale);
  }

  playAnimation(action, direction = null) {
    if (direction) {
      this.currentDirection = direction;
    }
    
    if (!this.animations[this.currentDirection] || !this.animations[this.currentDirection][action]) {
      console.warn(`⚠️ Animation not found: ${this.currentDirection} - ${action}`);
      return;
    }
    
    console.log(`🎬 Playing animation: ${this.currentDirection} - ${action}`);
    
    this.currentAnimation = this.animations[this.currentDirection][action];
    this.currentFrame = 0;
    this.isPlaying = true;
    
    // Update animation states
    this.isIdle = action === 'idle';
    this.isWalking = action === 'walking';
    this.isRunning = action === 'running';
    this.isAttacking = action === 'slashing';
    
    // Set animation speeds
    switch (action) {
      case 'idle':
        this.animationSpeed = 0.15; // Slow blinking
        this.loop = true;
        break;
      case 'walking':
        this.animationSpeed = 0.08; // Medium pace
        this.loop = true;
        break;
      case 'running':
        this.animationSpeed = 0.06; // Fast pace
        this.loop = true;
        break;
      case 'slashing':
        this.animationSpeed = 0.05; // Fast attack
        this.loop = false; // Don't loop attack
        break;
    }
    
    // Update sprite texture immediately
    this.updateSpriteTexture();
  }

  updateSpriteTexture() {
    if (this.currentAnimation && this.material) {
      const texture = this.currentAnimation.frames[this.currentFrame];
      this.material.map = texture;
      this.material.needsUpdate = true;
    }
  }

  update(deltaTime) {
    if (!this.isPlaying || !this.currentAnimation) return;
    
    this.lastFrameTime += deltaTime;
    
    if (this.lastFrameTime >= this.animationSpeed) {
      this.currentFrame++;
      
      if (this.currentFrame >= this.currentAnimation.frameCount) {
        if (this.loop) {
          this.currentFrame = 0; // Loop back to start
        } else {
          this.currentFrame = this.currentAnimation.frameCount - 1; // Stay on last frame
          this.isPlaying = false;
          
          // If attack finished, return to idle
          if (this.isAttacking) {
            setTimeout(() => {
              this.playAnimation('idle');
            }, 100);
          }
        }
      }
      
      this.updateSpriteTexture();
      this.lastFrameTime = 0;
    }
  }

  // Direction calculation based on movement
  getDirectionFromMovement(fromPos, toPos) {
    const [fromI, fromJ] = fromPos;
    const [toI, toJ] = toPos;
    
    const deltaX = toJ - fromJ;
    const deltaY = toI - fromI;
    
    // Determine primary direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'Right' : 'Right'; // For now, always use Right for horizontal
    } else {
      return deltaY > 0 ? 'Front' : 'Front'; // Use Front for vertical
    }
  }

  // Public methods for controlling the knight
  moveToDirection(direction) {
    this.currentDirection = direction;
    this.playAnimation('running', direction);
  }

  startWalking(direction = null) {
    this.playAnimation('walking', direction);
  }

  startRunning(direction = null) {
    this.playAnimation('running', direction);
  }

  startAttacking(direction = null) {
    this.playAnimation('slashing', direction);
  }

  goIdle(direction = null) {
    this.playAnimation('idle', direction);
  }

  // Compatibility methods
  stopMoving() {
    this.goIdle();
  }

  stopWalking() {
    this.goIdle();
  }

  celebrate() {
    // Fast idle animation for celebration
    const originalSpeed = this.animationSpeed;
    this.animationSpeed = 0.05;
    
    setTimeout(() => {
      this.animationSpeed = originalSpeed;
    }, 2000);
  }

  getObject3D() {
    return this.sprite;
  }

  onLoad(callback) {
    if (this.loaded) {
      callback();
    } else {
      this.loadCallbacks.push(callback);
    }
 }

  // Reset knight to initial state (facing right)
  resetToInitialState() {
    this.currentDirection = 'Right';
    this.playAnimation('idle', 'Right');
    console.log('🔄 Knight reset to initial state - facing Right');
  }
}
