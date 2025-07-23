import * as THREE from 'three';

export class AnimatedPrincess {
  constructor(cellSize = 120) {
    this.sprite = null;
    this.material = null;
    this.cellSize = cellSize;
    this.baseScale = cellSize * 1.2; // Slightly larger than enemies
    
    // Animation properties
    this.spriteSheet = null;
    this.blessingSheet = null; // Special animation sprite sheet
    this.currentFrame = 0;
    this.animationSpeed = 0.6; // Slower, more regal animation
    this.lastFrameTime = 0;
    this.isPlaying = true;
    this.currentAnimation = 'idle'; // 'idle' or 'blessing'
    
    // Sprite sheet layout
    this.frameWidth = 64; // Each frame is 64x64 pixels (assuming standard size)
    this.frameHeight = 64;
    this.idleFrames = 7; // Idle animation has 7 frames
    this.blessingFrames = 4; // Blessing animation has 4 frames
    this.totalFrames = this.idleFrames; // Current animation frame count
    
    this.loaded = false;
    
    console.log('👸 Creating animated princess');
  }

  async initialize() {
    console.log('👸 Loading princess sprite sheet...');
    
    try {
      // Load the idle sprite sheet
      this.spriteSheet = await this.loadTexture('./assets/queen/Idle.png');
      
      // Load the blessing sprite sheet
      this.blessingSheet = await this.loadTexture('./assets/queen/Special.png');

      // Set up proper texture settings for sprite sheet (7x1 grid for idle)
      this.spriteSheet.repeat.set(1/7, 1); // Show only 1/7 width, full height
      this.spriteSheet.offset.set(0, 0);   // Start at leftmost frame
      this.spriteSheet.needsUpdate = true;
      
      // Set up blessing sprite sheet (4x1 grid)
      this.blessingSheet.repeat.set(1/4, 1); // Show only 1/4 width, full height
      this.blessingSheet.offset.set(0, 0);   // Start at leftmost frame
      this.blessingSheet.needsUpdate = true;
      
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
    if (!this.material) return;
    
    // Choose the appropriate sprite sheet based on current animation
    const currentSheet = this.currentAnimation === 'blessing' ? this.blessingSheet : this.spriteSheet;
    const currentFrameCount = this.currentAnimation === 'blessing' ? this.blessingFrames : this.idleFrames;
    
    if (!currentSheet) return;
    
    // Update material to use the correct sprite sheet
    this.material.map = currentSheet;
    
    // Calculate UV coordinates for the current frame
    const frameWidth = 1 / currentFrameCount;
    const frameHeight = 1; // Full height (1 row)
    
    // Calculate offset for the current frame
    const offsetX = this.currentFrame * frameWidth;
    const offsetY = 0; // Only one row
    
    // For horizontal flip, we need to reverse the U coordinate
    const flippedOffsetX = offsetX + frameWidth; // Start from right edge of frame
    
    // Set texture repeat to show only one frame, but with negative width for flip
    currentSheet.repeat.set(-frameWidth, frameHeight); // Negative width flips horizontally
    
    // Set texture offset to the specific frame (flipped)
    currentSheet.offset.set(flippedOffsetX, offsetY);
    
    currentSheet.needsUpdate = true;
    this.material.needsUpdate = true;
  }

  update(deltaTime) {
    if (!this.isPlaying || !this.loaded) return;
    
    this.lastFrameTime += deltaTime;
    
    if (this.lastFrameTime >= this.animationSpeed) {
      const currentFrameCount = this.currentAnimation === 'blessing' ? this.blessingFrames : this.idleFrames;
      this.currentFrame = (this.currentFrame + 1) % currentFrameCount;
      this.updateSpriteFrame();
      this.lastFrameTime = 0;
    }
  }

  startBlessingAnimation() {
    console.log('👑 Starting queen blessing animation');
    this.currentAnimation = 'blessing';
    this.currentFrame = 0;
    this.updateSpriteFrame();
  }

  goIdle() {
    console.log('👸 Queen returning to idle animation');
    this.currentAnimation = 'idle';
    this.currentFrame = 0;
    this.updateSpriteFrame();
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
    if (this.blessingSheet) {
      this.blessingSheet.dispose();
    }
  }
}
