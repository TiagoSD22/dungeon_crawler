import * as THREE from 'three';

export class EnvironmentManager {
  constructor() {
    this.floorTextures = {
      base: {},
      layers: {},
      plates: null
    };
    this.isLoaded = false;
    this.floorSprites = [];
    
    // Load all floor textures
    this.loadTextures();
  }

  async loadTextures() {
    const loader = new THREE.TextureLoader();
    
    try {
      console.log('🏗️ Loading environment textures...');
      
      // Load base floor textures
      this.floorTextures.base.floor1 = await this.loadTexture(loader, './assets/environment/floors/floor_base_1.PNG');
      this.floorTextures.base.floor2 = await this.loadTexture(loader, './assets/environment/floors/floor_base_2.PNG');
      
      // Load layer textures
      this.floorTextures.layers.layer1 = await this.loadTexture(loader, './assets/environment/floors/floor_layer_1.PNG');
      this.floorTextures.layers.layer2 = await this.loadTexture(loader, './assets/environment/floors/floor_layer_2.PNG');
      
      // Load plates texture
      this.floorTextures.plates = await this.loadTexture(loader, './assets/environment/floors/plates.png');
      
      this.isLoaded = true;
      console.log('✅ Environment textures loaded successfully!');
      
    } catch (error) {
      console.error('❌ Failed to load environment textures:', error);
    }
  }

  loadTexture(loader, path) {
    return new Promise((resolve, reject) => {
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
        (error) => {
          console.error(`Failed to load texture: ${path}`, error);
          reject(error);
        }
      );
    });
  }

  createFloorForCell(i, j, cellSize, scene, gridWidth, gridHeight, roomValue = 0) {
    if (!this.isLoaded) {
      console.warn('⚠️ Environment textures not loaded yet');
      return;
    }

    // Calculate position
    const x = j * cellSize - (gridWidth * cellSize) / 2;
    const y = -i * cellSize + (gridHeight * cellSize) / 2;
    
    // Randomly choose base floor (50/50 chance)
    const useFloor1 = Math.random() < 0.5;
    const baseTexture = useFloor1 ? this.floorTextures.base.floor1 : this.floorTextures.base.floor2;
    
    // Create base floor sprite
    const baseMaterial = new THREE.SpriteMaterial({
      map: baseTexture,
      transparent: true,
      alphaTest: 0.1
    });
    
    const baseFloor = new THREE.Sprite(baseMaterial);
    baseFloor.scale.set(cellSize * 1.15, cellSize * 1.15, 1); // 15% larger to eliminate gaps completely
    baseFloor.position.set(x, y, -0.1); // Floor slightly behind the room boxes
    scene.add(baseFloor);
    this.floorSprites.push(baseFloor);

    // 30% chance to add a floor layer
    if (Math.random() < 0.3) {
      const useLayer1 = Math.random() < 0.5;
      const layerTexture = useLayer1 ? this.floorTextures.layers.layer1 : this.floorTextures.layers.layer2;
      
      const layerMaterial = new THREE.SpriteMaterial({
        map: layerTexture,
        transparent: true,
        alphaTest: 0.1
      });
      
      const layerFloor = new THREE.Sprite(layerMaterial);
      layerFloor.scale.set(cellSize * 0.4, cellSize * 0.4, 1); // Much smaller - just a detail on the ground
      layerFloor.position.set(x, y, -0.05); // Layer slightly above base floor
      scene.add(layerFloor);
      this.floorSprites.push(layerFloor);
    }

    // 15% chance to add plates (only on neutral or positive rooms)
    /*if (roomValue >= 0 && Math.random() < 0.15) {
      const platesMaterial = new THREE.SpriteMaterial({
        map: this.floorTextures.plates,
        transparent: true,
        alphaTest: 0.1
      });
      
      const platesSprite = new THREE.Sprite(platesMaterial);
      // Make plates slightly smaller than the cell
      platesSprite.scale.set(cellSize * 0.8, cellSize * 0.8, 1);
      platesSprite.position.set(x, y, -0.01); // Plates on top of layers
      scene.add(platesSprite);
      this.floorSprites.push(platesSprite);
    }*/
  }

  createFloorsForDungeon(grid, cellSize, scene) {
    console.log('🏗️ Creating floors for dungeon...');
    
    if (!this.isLoaded) {
      console.warn('⚠️ Environment textures not loaded yet, floors will be created when ready');
      // Wait for textures to load, then create floors
      const checkLoaded = () => {
        if (this.isLoaded) {
          this.createFloorsForDungeon(grid, cellSize, scene);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      setTimeout(checkLoaded, 100);
      return;
    }

    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const roomValue = grid[i][j];
        this.createFloorForCell(i, j, cellSize, scene, grid[0].length, grid.length, roomValue);
      }
    }
    
    console.log(`✅ Created ${this.floorSprites.length} floor elements!`);
  }

  // Method to get floor statistics
  getFloorStats() {
    const stats = {
      totalFloors: this.floorSprites.length,
      isLoaded: this.isLoaded
    };
    return stats;
  }

  // Method to clear all floors (useful for regenerating dungeon)
  clearFloors(scene) {
    this.floorSprites.forEach(sprite => {
      scene.remove(sprite);
      if (sprite.material.map) {
        sprite.material.map.dispose();
      }
      sprite.material.dispose();
    });
    this.floorSprites = [];
    console.log('🧹 Cleared all floor elements');
  }

  // Method to update floor animations (if needed in the future)
  update(deltaTime) {
    // Currently floors are static, but this method is here for future enhancements
    // like animated water floors, glowing magic circles, etc.
  }
}
