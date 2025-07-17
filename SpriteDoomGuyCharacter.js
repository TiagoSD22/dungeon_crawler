import * as THREE from 'three';

export class SpriteKnightCharacter {
  constructor() {
    this.sprite = null;
    this.material = null;
    this.textures = {}; // Store multiple textures
    this.currentTexture = null;
    this.loaded = false;
    this.loadCallbacks = [];
    
    // Animation properties
    this.frameWidth = 0;
    this.frameHeight = 0;
    this.totalFrames = 4;
    this.currentFrame = 0;
    this.animationSpeed = 0.5; // Slower animation speed (was 0.2)
    this.lastFrameTime = 0;
    this.isWalking = false;
    this.isRunning = false;
    this.isIdle = true;
  }

  async loadSprite(imagePath, cellSize = 50) {
    const spriteName = imagePath.split('/').pop().split('.')[0]; // Extract filename without extension
    
    return new Promise((resolve, reject) => {
      const textureLoader = new THREE.TextureLoader();
      
      textureLoader.load(
        imagePath,
        (texture) => {
          this.textures[spriteName] = texture;
          
          // If this is the first texture loaded, set it as current and setup sprite
          if (!this.currentTexture) {
            this.currentTexture = texture;
            this.setupSprite(cellSize);
          }
          
          this.loaded = true;
          
          // Call any pending callbacks
          this.loadCallbacks.forEach(callback => callback());
          this.loadCallbacks = [];
          
          console.log(`✅ Knight sprite "${spriteName}" loaded successfully`);
          resolve(texture);
        },
        (progress) => {
          console.log(`Loading sprite "${spriteName}" progress:`, (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
          console.error(`❌ Error loading sprite "${spriteName}":`, error);
          reject(error);
        }
      );
    });
  }

  async loadMultipleSprites(spritePaths, cellSize = 50) {
    console.log('🎮 Loading multiple knight sprites:', spritePaths);
    
    // Load all sprites
    const loadPromises = spritePaths.map(path => this.loadSprite(path, cellSize));
    
    try {
      await Promise.all(loadPromises);
      console.log('✅ All knight sprites loaded successfully');
      
      // Set idle as default
      this.switchToTexture('Idle');
      this.playAnimation('idle');
      
    } catch (error) {
      console.error('❌ Error loading some sprites:', error);
      throw error;
    }
  }

  switchToTexture(textureName) {
    if (this.textures[textureName] && this.material) {
      console.log(`🔄 Switching to texture: ${textureName}`);
      this.currentTexture = this.textures[textureName];
      this.material.map = this.currentTexture;
      this.material.needsUpdate = true;
      
      // Reset frame to 0 when switching textures
      this.currentFrame = 0;
      this.currentTexture.offset.set(0, 0);
    }
  }

  setupSprite(cellSize = 50) {
    if (!this.currentTexture) return;

    console.log('🎮 Setting up Knight sprite animation');

    // Calculate frame dimensions (4 frames horizontally)
    this.frameWidth = 1 / this.totalFrames; // Each frame is 1/4 of the texture width
    this.frameHeight = 1; // Full height

    // Set texture properties for pixel art
    this.currentTexture.magFilter = THREE.NearestFilter; // Pixel art style
    this.currentTexture.minFilter = THREE.NearestFilter;
    this.currentTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.currentTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Set initial UV coordinates to show first frame
    this.currentTexture.repeat.set(this.frameWidth, this.frameHeight);
    this.currentTexture.offset.set(0, 0);

    // Create sprite material
    this.material = new THREE.SpriteMaterial({ 
      map: this.currentTexture,
      transparent: true,
      alphaTest: 0.5 // Remove transparent pixels
    });

    // Create sprite
    this.sprite = new THREE.Sprite(this.material);
    
    // Scale the sprite proportional to cell size (80% of cell size)
    const spriteSize = cellSize * 0.8;
    this.sprite.scale.set(spriteSize, spriteSize, 1);
    
    console.log('🎯 Knight sprite created with scale:', this.sprite.scale, 'based on cellSize:', cellSize);
  }

  updateAnimation(deltaTime) {
    if (!this.currentTexture || (!this.isIdle && !this.isRunning && !this.isWalking)) return;

    this.lastFrameTime += deltaTime;

    // Change frame based on animation speed
    if (this.lastFrameTime >= this.animationSpeed) {
      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
      
      // Update texture offset to show current frame
      const frameX = this.currentFrame * this.frameWidth;
      this.currentTexture.offset.set(frameX, 0);
      
      this.lastFrameTime = 0;
    }
  }

  playAnimation(name) {
    console.log('🎬 Playing animation:', name);
    
    if (name === 'run' || name === 'running') {
      this.isRunning = true;
      this.isWalking = false;
      this.isIdle = false;
      // Switch to Run texture and set fast animation
      this.switchToTexture('Run');
      this.animationSpeed = 0.2; // Fast running animation
    } else if (name === 'walk' || name === 'walking') {
      this.isWalking = true;
      this.isRunning = false;
      this.isIdle = false;
      // For walking, still slower than running
      this.switchToTexture('Run'); // Use run sprite for walking too, just slower
      this.animationSpeed = 0.4;
    } else if (name === 'idle') {
      this.isIdle = true;
      this.isWalking = false;
      this.isRunning = false;
      // Switch to Idle texture and set slow animation
      this.switchToTexture('Idle');
      this.animationSpeed = 0.8; // Very slow idle animation
    }
  }

  startRunning() {
    this.playAnimation('run');
  }

  startWalking() {
    this.playAnimation('walk');
  }

  stopMoving() {
    this.playAnimation('idle');
  }

  // Keep old method for compatibility
  stopWalking() {
    this.playAnimation('idle');
  }

  update(deltaTime) {
    this.updateAnimation(deltaTime);
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

  celebrate() {
    // Simple celebration - faster animation
    const originalSpeed = this.animationSpeed;
    this.animationSpeed = 0.1;
    
    setTimeout(() => {
      this.animationSpeed = originalSpeed;
    }, 2000);
  }

  setScale(scale) {
    if (this.sprite) {
      this.sprite.scale.set(scale, scale, 1);
    }
  }

  setPosition(x, y, z) {
    if (this.sprite) {
      this.sprite.position.set(x, y, z);
    }
  }
}
