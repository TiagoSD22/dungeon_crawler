import * as THREE from 'three';

export class AnimatedPrincess {
  constructor(cellSize = 120) {
    this.sprite = null;
    this.material = null;
    this.cellSize = cellSize;
    this.baseScale = cellSize * 1.2; // Slightly larger than enemies
    
    // Animation properties
    this.spriteSheet = null;
    this.currentFrame = 0;
    this.animationSpeed = 0.6; // Slower, more regal animation
    this.lastFrameTime = 0;
    this.isPlaying = true;
    
    // Sprite sheet layout (7 frames in one row)
    this.frameWidth = 64; // Each frame is 64x64 pixels (assuming standard size)
    this.frameHeight = 64;
    this.totalFrames = 7; // Idle animation has 7 frames
    
    this.loaded = false;
    
    console.log('👸 Creating animated princess');
  }

  async initialize() {
    console.log('👸 Loading princess sprite sheet...');
    
    try {
      // Load the idle sprite sheet
      this.spriteSheet = await this.loadTexture('./assets/queen/Idle.png');

      // Set up proper texture settings for sprite sheet (7x1 grid)
      this.spriteSheet.repeat.set(1/7, 1); // Show only 1/7 width, full height
      this.spriteSheet.offset.set(0, 0);   // Start at leftmost frame
      this.spriteSheet.needsUpdate = true;
      
      // Create material with the sprite sheet
      this.material = new THREE.SpriteMaterial({
        map: this.spriteSheet,
        transparent: true,
        alphaTest: 0.1
      });
      
      // Create sprite
      this.sprite = new THREE.Sprite(this.material);
      this.sprite.scale.set(this.baseScale, this.baseScale, 1); // Normal scale, we'll flip via UV coords
      
      // Set initial frame
      this.updateSpriteFrame();
      
      this.loaded = true;
      console.log('✅ Princess loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to load princess:', error);
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

  updateSpriteFrame() {
    if (!this.material || !this.spriteSheet) return;
    
    // Calculate UV coordinates for the current frame (7 frames in one row)
    const frameWidth = 1 / this.totalFrames;  // 1/7
    const frameHeight = 1; // Full height (1 row)
    
    // Calculate offset for the current frame
    const offsetX = this.currentFrame * frameWidth;
    const offsetY = 0; // Only one row
    
    // For horizontal flip, we need to reverse the U coordinate
    // Instead of using the frame directly, we flip it by reversing the offset and repeat
    const flippedOffsetX = offsetX + frameWidth; // Start from right edge of frame
    
    // Set texture repeat to show only one frame, but with negative width for flip
    this.spriteSheet.repeat.set(-frameWidth, frameHeight); // Negative width flips horizontally
    
    // Set texture offset to the specific frame (flipped)
    this.spriteSheet.offset.set(flippedOffsetX, offsetY);
    
    this.spriteSheet.needsUpdate = true;
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
