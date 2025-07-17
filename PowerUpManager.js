import * as THREE from 'three';

export class PowerUp {
  constructor(type, cellSize = 50) {
    this.type = type;
    this.sprite = null;
    this.material = null;
    this.cellSize = cellSize;
    this.isCollected = false;
    this.animationTime = 0;
    this.floatSpeed = 0.002;
    this.floatHeight = 5;
    this.rotationSpeed = 0.01;
    this.pulseSpeed = 0.003;
    this.baseScale = cellSize * 0.4;
    this.initialY = 0;
    this.isLoaded = false;
    
    // Load texture immediately
    this.loadTexture().then(() => {
      this.isLoaded = true;
      console.log(`✅ Power-up ${this.type} ready for animation`);
    }).catch((error) => {
      console.error(`❌ Failed to initialize power-up ${this.type}:`, error);
    });
  }

  async loadTexture() {
    const loader = new THREE.TextureLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(
        `./assets/power_ups/${this.type}.png`,
        (texture) => {
          // Setup texture for pixel art
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          
          this.material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1
          });
          
          this.sprite = new THREE.Sprite(this.material);
          this.sprite.scale.set(this.baseScale, this.baseScale, 1);
          
          // Ensure sprite is visible and ready for animation
          this.sprite.visible = true;
          
          console.log(`🔮 Power-up ${this.type} loaded successfully`);
          resolve();
        },
        undefined,
        (error) => {
          console.error(`❌ Failed to load power-up ${this.type}:`, error);
          reject(error);
        }
      );
    });
  }

  setPosition(x, y, z) {
    if (this.sprite) {
      this.sprite.position.set(x, y, z);
      this.initialY = y;
    }
  }

  update(deltaTime) {
    this.animationTime += deltaTime;
    
    // Only animate if not collected
    if (!this.isCollected) {
      // Floating animation
      const floatOffset = Math.sin(this.animationTime * this.floatSpeed * 1000) * this.floatHeight;
      this.sprite.position.y = this.initialY + floatOffset;
      
      // Rotation animation
      this.sprite.rotation.z += this.rotationSpeed;
      
      // Pulse scaling animation
      const pulseScale = 1 + Math.sin(this.animationTime * this.pulseSpeed * 1000) * 0.1;
      this.sprite.scale.set(
        this.baseScale * pulseScale,
        this.baseScale * pulseScale,
        1
      );
      
      // Gentle glow effect through opacity
      const glowAlpha = 0.8 + Math.sin(this.animationTime * this.pulseSpeed * 1000 * 2) * 0.2;
      this.material.opacity = glowAlpha;
    }
  }

  collect() {
    if (this.isCollected) return;
    
    this.isCollected = true;
    console.log(`✨ Power-up ${this.type} collected!`);
    
    // Delay before playing collection animation
    setTimeout(() => {
      this.playCollectionAnimation();
    }, 500); // 0.5 second delay
  }

  playCollectionAnimation() {
    if (!this.sprite) return;
    
    // Animate scale up and fade out
    const startScale = this.sprite.scale.x;
    const startOpacity = this.material.opacity;
    const duration = 500; // ms
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      // Scale up
      const scale = startScale + (startScale * 0.5 * easeProgress);
      this.sprite.scale.set(scale, scale, 1);
      
      // Fade out
      this.material.opacity = startOpacity * (1 - easeProgress);
      
      // Move up slightly
      this.sprite.position.y = this.initialY + (this.floatHeight * 2 * easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - hide sprite
        this.sprite.visible = false;
      }
    };
    
    animate();
  }

  getObject3D() {
    return this.sprite;
  }

  dispose() {
    if (this.material) {
      this.material.dispose();
    }
    if (this.sprite) {
      this.sprite.visible = false;
      // Note: The parent (scene) should remove this sprite
    }
  }
}

export class PowerUpManager {
  constructor() {
    this.powerUps = new Map(); // Map of position key -> PowerUp instance
    this.availableTypes = [
      'comet', 'fire', 'gypno', 'ice', 'kill_all', 
      'light', 'spikes', 'tesla_ball', 'tornado', 'water'
    ];
    this.currentInventory = null; // Currently held power-up
    console.log('💎 PowerUpManager initialized');
  }

  async createPowerUpForRoom(i, j, roomValue, cellSize, scene, gridWidth, gridHeight) {
    if (roomValue <= 0) return; // Only create power-ups for positive room values
    
    const positionKey = `${i},${j}`;
    if (this.powerUps.has(positionKey)) {
      console.log(`⚠️ Power-up already exists at position [${i},${j}] - skipping`);
      return; // Already has power-up
    }
    
    // Choose random power-up type
    const randomType = this.availableTypes[Math.floor(Math.random() * this.availableTypes.length)];
    
    const powerUp = new PowerUp(randomType, cellSize);
    
    try {
      await powerUp.loadTexture();
      
      // Position above the room
      const x = j * cellSize - (gridWidth * cellSize) / 2;
      const y = -i * cellSize + (gridHeight * cellSize) / 2;
      const z = 25; // Above the room
      
      powerUp.setPosition(x, y, z);
      
      // Verify sprite is ready
      if (!powerUp.getObject3D()) {
        console.error(`❌ Power-up ${randomType} sprite not ready at position [${i},${j}]`);
        return;
      }
      
      // Add to scene
      scene.add(powerUp.getObject3D());
      
      // Store in manager
      this.powerUps.set(positionKey, powerUp);
      
      console.log(`🔮 Created ${randomType} power-up at position [${i},${j}] (${positionKey}) - sprite visible: ${powerUp.sprite.visible}`);
      
    } catch (error) {
      console.error(`Failed to create power-up for room [${i},${j}]:`, error);
    }
  }

  collectPowerUp(i, j) {
    const positionKey = `${i},${j}`;
    const powerUp = this.powerUps.get(positionKey);
    
    if (powerUp && !powerUp.isCollected) {
      // Update inventory
      this.currentInventory = powerUp.type;
      
      // Collect the power-up
      powerUp.collect();
      
      // Update UI
      this.updateInventoryUI();
      
      console.log(`🎒 Knight collected ${powerUp.type} power-up!`);
      
      return powerUp.type;
    }
    
    return null;
  }

  updateInventoryUI() {
    const inventoryElement = document.getElementById('currentPowerUp');
    const inventoryIcon = document.getElementById('powerUpIcon');
    const emptySlot = document.getElementById('emptySlot');
    
    if (this.currentInventory) {
      inventoryElement.style.display = 'block';
      emptySlot.style.display = 'none';
      inventoryIcon.src = `./assets/power_ups/${this.currentInventory}.png`;
      inventoryIcon.alt = this.currentInventory;
      document.getElementById('powerUpName').textContent = this.currentInventory.replace('_', ' ').toUpperCase();
    } else {
      inventoryElement.style.display = 'none';
      emptySlot.style.display = 'flex';
    }
  }

  updateAllPowerUps(deltaTime) {
    for (const powerUp of this.powerUps.values()) {
      // Always try to update - let the individual power-up handle its own state
      powerUp.update(deltaTime);
    }
  }

  clearInventory() {
    this.currentInventory = null;
    this.updateInventoryUI();
  }

  getCurrentPowerUp() {
    return this.currentInventory;
  }

  dispose() {
    for (const powerUp of this.powerUps.values()) {
      powerUp.dispose();
    }
    this.powerUps.clear();
  }

  // Remove all power-ups from scene
  removeFromScene(scene) {
    console.log(`🧹 Removing ${this.powerUps.size} power-ups from scene`);
    for (const powerUp of this.powerUps.values()) {
      if (powerUp.getObject3D()) {
        scene.remove(powerUp.getObject3D());
        console.log(`🗑️ Removed power-up ${powerUp.type} from scene`);
      }
    }
  }
}
