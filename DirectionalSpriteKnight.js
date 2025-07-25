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
    
    // Spell effect integration
    this.spellEffectManager = null;
    this.currentPowerUp = null;
  }

  async loadAllAnimations(cellSize = 80) {
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
      
      // Load hurt animations for all directions
      await this.loadHurtAnimations();
      
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

  setupInitialSprite(cellSize = 80) {
    // Create initial sprite with first frame of idle animation
    const initialTexture = this.animations['Right']['idle'].frames[0];
    
    this.material = new THREE.SpriteMaterial({
      map: initialTexture,
      transparent: true,
      alphaTest: 0.5
    });
    
    this.sprite = new THREE.Sprite(this.material);
    
    // Scale proportional to cell size
    const spriteSize = cellSize * 1;
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
          
          // Call completion callback if exists
          if (this.onAnimationComplete) {
            this.onAnimationComplete();
          }
          
          // If attack finished, return to idle
          if (this.isAttacking && !this.onAnimationComplete) {
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

  // Power-up collection celebration
  celebratePowerUp(direction = null) {
    console.log('🎉 Knight celebrating power-up collection!');
    
    // Quick idle animation burst
    const originalSpeed = this.animationSpeed;
    this.playAnimation('idle', direction);
    this.animationSpeed = 0.03; // Very fast animation
    
    setTimeout(() => {
      this.animationSpeed = originalSpeed;
    }, 800); // Short celebration
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

  // Set spell effect manager for casting spells
  setSpellEffectManager(spellEffectManager) {
    this.spellEffectManager = spellEffectManager;
  }

  // Set current power-up
  setCurrentPowerUp(powerUp) {
    this.currentPowerUp = powerUp;
  }

  // Load hurt animations for all directions
  async loadHurtAnimations() {
    console.log('😰 Loading knight hurt animations...');
    
    const baseDir = './assets/knight_sprites';
    const directions = ['Right', 'Front'];
    
    for (const direction of directions) {
      if (!this.animations[direction]) {
        this.animations[direction] = {};
      }
      
      try {
        // Updated path to match the actual folder structure
        const hurtPath = `${baseDir}/${direction.toLowerCase()}/${direction}-Hurt`;
        const frames = await this.loadAnimationFrames(hurtPath);
        
        this.animations[direction]['hurt'] = {
          frames: frames,
          frameCount: frames.length,
          currentFrame: 0
        };
        
        console.log(`✅ Loaded ${direction} hurt animation: ${frames.length} frames`);
      } catch (error) {
        console.warn(`⚠️ Could not load ${direction} hurt animation:`, error);
        // Try alternative path structure
        try {
          const alternativePath = `${baseDir}/knight_${direction.toLowerCase()}/${direction}-Hurt`;
          const frames = await this.loadAnimationFrames(alternativePath);
          
          this.animations[direction]['hurt'] = {
            frames: frames,
            frameCount: frames.length,
            currentFrame: 0
          };
          
          console.log(`✅ Loaded ${direction} hurt animation (alternative path): ${frames.length} frames`);
        } catch (altError) {
          console.warn(`⚠️ Could not load ${direction} hurt animation from alternative path:`, altError);
          // Create empty hurt animation as fallback
          this.animations[direction]['hurt'] = {
            frames: [],
            frameCount: 0,
            currentFrame: 0
          };
        }
      }
    }
  }

  // Play hurt animation
  async playHurtAnimation(direction = null) {
    if (direction) {
      this.currentDirection = direction;
    }
    
    console.log(`😰 Playing knight hurt animation: ${this.currentDirection}`);
    
    // Check if hurt animation exists for current direction
    const hurtAnimation = this.animations[this.currentDirection]?.hurt;
    if (!hurtAnimation || hurtAnimation.frameCount === 0) {
      console.warn(`⚠️ No hurt animation for direction: ${this.currentDirection}, using idle instead`);
      // Fallback to idle animation with faster speed
      this.playAnimation('idle', this.currentDirection);
      this.animationSpeed = 0.05; // Fast animation for hurt effect
      
      return new Promise((resolve) => {
        setTimeout(() => {
          this.animationSpeed = 0.15; // Reset to normal idle speed
          resolve();
        }, 500);
      });
    }
    
    return new Promise((resolve) => {
      // Stop current animation
      this.isPlaying = false;
      
      // Set up hurt animation
      this.currentAnimation = hurtAnimation;
      this.currentFrame = 0;
      this.isPlaying = true;
      this.loop = false;
      this.animationSpeed = 0.08; // Medium speed for hurt animation
      
      // Update sprite texture immediately
      this.updateSpriteTexture();
      
      // Set up completion callback
      this.onAnimationComplete = () => {
        console.log(`✅ Knight hurt animation completed`);
        this.onAnimationComplete = null;
        this.loop = true; // Reset loop for other animations
        // Return to idle after hurt
        this.playAnimation('idle', this.currentDirection);
        resolve();
      };
    });
  }

  // Play attack animation
  async playAttackAnimation() {
    console.log(`⚔️ Knight attacks!`);
    
    return new Promise((resolve) => {
      // Use existing slashing animation
      this.playAnimation('slashing');
      
      // Cast spell effect if knight has a power-up and spell effect manager is available
      if (this.currentPowerUp && this.spellEffectManager) {
        console.log(`⚔️ Knight attacking with ${this.currentPowerUp} power-up!`);
        
        // Small delay to sync with attack animation
        setTimeout(() => {
          this.spellEffectManager.playSpellEffect(
            this.currentPowerUp,
            this.sprite.position,
            this.currentDirection,
            () => {
              console.log(`✨ ${this.currentPowerUp} spell effect completed`);
            }
          );
        }, 200); // 0.2 second delay
      }

      this.loop = false;
      
      // Set up completion callback
      this.onAnimationComplete = () => {
        this.onAnimationComplete = null;
        this.loop = true; // Reset loop for other animations
        resolve();
      };
    });
  }

  // Play special attack animation with queen's blessing
  async playSpecialAttackAnimation() {
    console.log(`⚔️ Knight attacks with queen's blessing!`);
    
    return new Promise((resolve) => {
      // Use existing slashing animation
      this.playAnimation('slashing');
      
      let blessingEffectComplete = false;
      let knightAnimationComplete = false;
      
      const checkCompletion = () => {
        if (blessingEffectComplete && knightAnimationComplete) {
          resolve();
        }
      };
      
      // Cast special blessing effect if knight has a queen's blessing
      if (this.currentPowerUp && this.currentPowerUp.isQueenBlessing && this.spellEffectManager) {
        console.log(`👑 Knight attacking with ${this.currentPowerUp.name}!`);
        
        // Small delay to sync with attack animation
        setTimeout(() => {
          this.spellEffectManager.playQueenBlessingEffect(
            this.currentPowerUp,
            this.sprite.position,
            this.currentDirection,
            () => {
              console.log(`✨ ${this.currentPowerUp.name} blessing effect completed`);
              blessingEffectComplete = true;
              checkCompletion();
            }
          );
        }, 200); // 0.2 second delay
      } else if (this.currentPowerUp && this.spellEffectManager) {
        // Fallback to regular spell effect
        setTimeout(() => {
          this.spellEffectManager.playSpellEffect(
            this.currentPowerUp.type || this.currentPowerUp,
            this.sprite.position,
            this.currentDirection,
            () => {
              console.log(`✨ Regular spell effect completed`);
              blessingEffectComplete = true;
              checkCompletion();
            }
          );
        }, 200);
      } else {
        // No power-up, mark blessing as complete
        blessingEffectComplete = true;
      }

      this.loop = false;
      
      // Set up completion callback for knight animation
      this.onAnimationComplete = () => {
        this.onAnimationComplete = null;
        this.loop = true; // Reset loop for other animations
        knightAnimationComplete = true;
        checkCompletion();
      };
    });
  }
}
