import * as THREE from 'three';

export class EnvironmentManager {
  constructor() {
    this.floorTextures = {
      base: {},
      layers: {},
      water: {}, // Add water textures
      plates: null
    };
    this.isLoaded = false;
    this.floorSprites = [];
    this.visitedCells = new Set(); // Track visited cells
    this.darkOverlays = []; // Store dark overlays for visited cells
    
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
      
      // Load water textures
      this.floorTextures.water.base = await this.loadTexture(loader, './assets/environment/floors/water_floor_base_1.PNG');
      this.floorTextures.water.layer = await this.loadTexture(loader, './assets/environment/floors/water_layer_1.PNG');
      
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

  // Generate expanded matrix with 6 extra water rows at the top
  generateExpandedMatrix(originalGrid) {
    const width = originalGrid[0].length;
    const extraRows = 6;
    
    // Create 6 rows of water environment (using value -999 to identify as water)
    const waterRows = [];
    for (let i = 0; i < extraRows; i++) {
      const row = [];
      for (let j = 0; j < width; j++) {
        row.push(-999); // Special value for water environment
      }
      waterRows.push(row);
    }
    
    // Combine water rows with original grid
    const expandedGrid = [...waterRows, ...originalGrid];
    
    console.log(`🌊 Generated expanded matrix: ${expandedGrid.length}x${width} (added ${extraRows} water rows)`);
    return expandedGrid;
  }

  createWaterFloorForCell(i, j, cellSize, scene, gridWidth, gridHeight) {
    if (!this.isLoaded) {
      console.warn('⚠️ Environment textures not loaded yet');
      return;
    }

    // Calculate position
    const x = j * cellSize - (gridWidth * cellSize) / 2;
    const y = -i * cellSize + (gridHeight * cellSize) / 2;
    
    // Create water base floor
    const waterBaseMaterial = new THREE.SpriteMaterial({
      map: this.floorTextures.water.base,
      transparent: false // Make fully opaque
    });
    
    const waterBase = new THREE.Sprite(waterBaseMaterial);
    waterBase.scale.set(cellSize * 1.15, cellSize * 1.15, 1); // Same size as regular floors
    waterBase.position.set(x, y, -0.1); // Floor slightly behind the room boxes
    scene.add(waterBase);
    this.floorSprites.push(waterBase);

    // 45% chance to add water layer detail
    if (Math.random() < 0.45) {
      const waterLayerMaterial = new THREE.SpriteMaterial({
        map: this.floorTextures.water.layer,
        transparent: true,
        alphaTest: 0.1
      });
      
      const waterLayer = new THREE.Sprite(waterLayerMaterial);
      waterLayer.scale.set(cellSize * 0.3, cellSize * 0.3, 1); // Small detail like other layers
      waterLayer.position.set(x, y, -0.05); // Layer slightly above base floor
      scene.add(waterLayer);
      this.floorSprites.push(waterLayer);
    }
  }

  createFloorForCell(i, j, cellSize, scene, gridWidth, gridHeight, roomValue = 0) {
    if (!this.isLoaded) {
      console.warn('⚠️ Environment textures not loaded yet');
      return;
    }

    // Check if this is a water cell (expanded matrix water rows)
    if (roomValue === -999) {
      this.createWaterFloorForCell(i, j, cellSize, scene, gridWidth, gridHeight);
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
      transparent: false, // Make fully opaque
      color: 0x505050 // Darken the floor tiles significantly
    });
    
    const baseFloor = new THREE.Sprite(baseMaterial);
    baseFloor.scale.set(cellSize * 1, cellSize * 1, 1); // 15% larger to eliminate gaps completely
    baseFloor.position.set(x, y, -0.1); // Floor slightly behind the room boxes
    scene.add(baseFloor);
    this.floorSprites.push(baseFloor);

    // 30% chance to add a floor layer
    /*if (Math.random() < 0.6) {
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
    }*/

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

    // Generate expanded matrix with water environment
    const expandedGrid = this.generateExpandedMatrix(grid);

    // Create floors for the expanded grid
    for (let i = 0; i < expandedGrid.length; i++) {
      for (let j = 0; j < expandedGrid[i].length; j++) {
        const roomValue = expandedGrid[i][j];
        this.createFloorForCell(i, j, cellSize, scene, expandedGrid[0].length, expandedGrid.length, roomValue);
      }
    }
    
    console.log(`✅ Created ${this.floorSprites.length} floor elements for expanded dungeon!`);
  }

  // Method to get expanded matrix for use by other systems
  getExpandedMatrix(originalGrid) {
    return this.generateExpandedMatrix(originalGrid);
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
    
    // Also clear visited cells when clearing floors
    this.clearVisitedCells(scene);
    
    console.log('🧹 Cleared all floor elements');
  }

  // Method to mark a cell as visited and darken it
  markCellAsVisited(gridI, gridJ, cellSize, scene, gridWidth, gridHeight) {
    const cellKey = `${gridI},${gridJ}`;
    
    // Don't add overlay if already visited
    if (this.visitedCells.has(cellKey)) {
      return;
    }
    
    this.visitedCells.add(cellKey);
    
    // Calculate position (same as floor positioning)
    const x = gridJ * cellSize - (gridWidth * cellSize) / 2;
    const y = -gridI * cellSize + (gridHeight * cellSize) / 2;
    
    // Create a bright overlay to show visited cells on dark floors
    const brightMaterial = new THREE.SpriteMaterial({
      color: 0xffffff, // White for brightening effect
      transparent: true,
      opacity: 0.2 // Subtle brightening overlay
    });
    
    // Create a simple bright quad using a minimal texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // White for brightening
    ctx.fillRect(0, 0, 32, 32);
    
    const brightTexture = new THREE.CanvasTexture(canvas);
    brightTexture.magFilter = THREE.NearestFilter;
    brightTexture.minFilter = THREE.NearestFilter;
    
    brightMaterial.map = brightTexture;
    
    const brightOverlay = new THREE.Sprite(brightMaterial);
    brightOverlay.scale.set(cellSize * 1.15, cellSize * 1.15, 1); // Same size as base floor
    brightOverlay.position.set(x, y, -0.01); // Above everything else but still behind room elements
    
    scene.add(brightOverlay);
    this.darkOverlays.push(brightOverlay);
    
    console.log(`🏃 Marked cell (${gridI},${gridJ}) as visited`);
  }

  // Method to clear visited cells (for dungeon reset)
  clearVisitedCells(scene) {
    this.visitedCells.clear();
    
    this.darkOverlays.forEach(overlay => {
      scene.remove(overlay);
      if (overlay.material.map) {
        overlay.material.map.dispose();
      }
      overlay.material.dispose();
    });
    this.darkOverlays = [];
    
    console.log('🧹 Cleared all visited cell markers');
  }

  // Method to get visited cells count
  getVisitedCellsCount() {
    return this.visitedCells.size;
  }

  // Method to update floor animations (if needed in the future)
  update(deltaTime) {
    // Currently floors are static, but this method is here for future enhancements
    // like animated water floors, glowing magic circles, etc.
  }
}
