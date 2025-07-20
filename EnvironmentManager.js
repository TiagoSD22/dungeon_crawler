import * as THREE from 'three';

export class EnvironmentManager {
  constructor() {
    this.floorTextures = {
      base: {},
      layers: {},
      water: {}, // Add water textures
      plates: null
    };
    this.wallTextures = {
      wall: null,
      corner: null
    };
    this.doorTexture = null; // Add door sprite sheet
    this.isLoaded = false;
    this.floorSprites = [];
    this.wallSprites = []; // Store wall sprites separately
    this.visitedCells = new Set(); // Track visited cells
    this.darkOverlays = []; // Store dark overlays for visited cells
    
    // Door animation properties
    this.doorSprite = null;
    this.doorAnimationStarted = false;
    this.doorAnimationCompleted = false;
    this.doorCurrentFrame = 0;
    this.doorFrameTime = 0;
    this.doorFrameDuration = 0.5; // 0.5 seconds per frame
    this.doorTotalFrames = 4;
    
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
      
      // Load wall textures
      this.wallTextures.wall = await this.loadTexture(loader, './assets/environment/surrouding _wall_tile.PNG');
      this.wallTextures.corner = await this.loadTexture(loader, './assets/environment/surrouding _wall_corner_tile.PNG');
      
      // Load door sprite sheet
      this.doorTexture = await this.loadTexture(loader, './assets/environment/entrance_door.png');
      
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

  // Generate expanded matrix with 6 extra water rows at the top + wall padding
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
    let expandedGrid = [...waterRows, ...originalGrid];
    
    // Now add wall padding around the entire expanded grid
    const paddedWidth = width + 2; // Add 1 column on each side
    const paddedHeight = expandedGrid.length + 2; // Add 1 row on top and bottom
    
    const finalGrid = [];
    
    for (let i = 0; i < paddedHeight; i++) {
      const row = [];
      for (let j = 0; j < paddedWidth; j++) {
        // Special case for door position: first column of the last row before the knight's line (last water row)
        if (i === extraRows && j === 1) { // extraRows puts us at the first row of the original dungeon, j=1 is first column after left wall
          row.push(-555); // Special value for door
        }
        // Check if this is a wall position
        else if (i === 0 || i === paddedHeight - 1 || j === 0 || j === paddedWidth - 1) {
          // This is a wall border position
          if ((i === 0 && j === 0) || 
              (i === 0 && j === paddedWidth - 1) || 
              (i === paddedHeight - 1 && j === 0) || 
              (i === paddedHeight - 1 && j === paddedWidth - 1)) {
            // Corner positions
            row.push(-777); // Special value for wall corners
          } else {
            // Regular wall positions
            row.push(-888); // Special value for walls
          }
        } else {
          // This is an interior position, get from expanded grid
          const originalI = i - 1; // Adjust for top wall padding
          const originalJ = j - 1; // Adjust for left wall padding
          row.push(expandedGrid[originalI][originalJ]);
        }
      }
      finalGrid.push(row);
    }
    
    console.log(`� Generated expanded matrix with walls: ${finalGrid.length}x${paddedWidth} (added ${extraRows} water rows + wall padding)`);
    return finalGrid;
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

    // Check if this is a door cell
    if (roomValue === -555) {
      this.createDoorForCell(i, j, cellSize, scene, gridWidth, gridHeight);
      return;
    }

    // Check if this is a wall corner cell
    if (roomValue === -777) {
      this.createWallCornerForCell(i, j, cellSize, scene, gridWidth, gridHeight);
      return;
    }

    // Check if this is a wall cell
    if (roomValue === -888) {
      this.createWallForCell(i, j, cellSize, scene, gridWidth, gridHeight);
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

  createWallForCell(i, j, cellSize, scene, gridWidth, gridHeight) {
    if (!this.isLoaded) {
      console.warn('⚠️ Environment textures not loaded yet');
      return;
    }

    // Calculate base position
    const baseX = j * cellSize - (gridWidth * cellSize) / 2;
    const baseY = -i * cellSize + (gridHeight * cellSize) / 2;
    
    // Determine wall position and rotation based on location
    let x = baseX;
    let y = baseY;
    let rotation = 0;
    let scaleX = cellSize * 0.4;
    let scaleY = cellSize * 0.2;
    
    // Check which wall this is and adjust position to be close to the dungeon
    if (i === 0) {
      // Top wall - move down towards dungeon, rotate to horizontal
      y = baseY - cellSize * 0.3;
      rotation = 0; // Horizontal orientation
      scaleX = cellSize * 1.2; // Make wall segments wider to fill gaps
      scaleY = cellSize * 0.25;
    } else if (i === gridHeight - 1) {
      // Bottom wall - move up towards dungeon, rotate to horizontal
      y = baseY + cellSize * 0.3;
      rotation = 0; // Horizontal orientation
      scaleX = cellSize * 1.2; // Make wall segments wider to fill gaps
      scaleY = cellSize * 0.25;
    } else if (j === 0) {
      // Left wall - move right towards dungeon, keep vertical
      x = baseX + cellSize * 0.3;
      rotation = Math.PI / 2; // Vertical orientation
      scaleX = cellSize * 1.2; // Make wall segments wider to fill gaps
      scaleY = cellSize * 0.25;
    } else if (j === gridWidth - 1) {
      // Right wall - move left towards dungeon, keep vertical
      x = baseX - cellSize * 0.3;
      rotation = Math.PI / 2; // Vertical orientation
      scaleX = cellSize * 1.2; // Make wall segments wider to fill gaps
      scaleY = cellSize * 0.25;
    }
    
    // Create wall sprite
    const wallMaterial = new THREE.SpriteMaterial({
      map: this.wallTextures.wall,
      transparent: true,
      alphaTest: 0.1
    });
    
    const wallSprite = new THREE.Sprite(wallMaterial);
    wallSprite.scale.set(scaleX, scaleY, 1);
    
    // Apply rotation
    wallSprite.material.rotation = rotation;
    
    wallSprite.position.set(x, y, 0.1); // Wall in front of floors
    scene.add(wallSprite);
    this.wallSprites.push(wallSprite);
  }

  createWallCornerForCell(i, j, cellSize, scene, gridWidth, gridHeight) {
    if (!this.isLoaded) {
      console.warn('⚠️ Environment textures not loaded yet');
      return;
    }

    // Calculate base position
    const baseX = j * cellSize - (gridWidth * cellSize) / 2;
    const baseY = -i * cellSize + (gridHeight * cellSize) / 2;
    
    // Adjust corner position to be closer to the dungeon
    let x = baseX;
    let y = baseY;
    
    if (i === 0 && j === 0) {
      // Top-left corner: move down and right towards dungeon
      x = baseX + cellSize * 0.3;
      y = baseY - cellSize * 0.3;
    } else if (i === 0 && j === gridWidth - 1) {
      // Top-right corner: move down and left towards dungeon
      x = baseX - cellSize * 0.3;
      y = baseY - cellSize * 0.3;
    } else if (i === gridHeight - 1 && j === 0) {
      // Bottom-left corner: move up and right towards dungeon
      x = baseX + cellSize * 0.3;
      y = baseY + cellSize * 0.3;
    } else if (i === gridHeight - 1 && j === gridWidth - 1) {
      // Bottom-right corner: move up and left towards dungeon
      x = baseX - cellSize * 0.3;
      y = baseY + cellSize * 0.3;
    }
    
    // Determine which corner this is and set appropriate rotation
    let rotation = 0;
    if (i === 0 && j === 0) {
      // Top-left corner: rotate 90 degrees counterclockwise
      rotation = Math.PI / 2;
    } else if (i === 0 && j === gridWidth - 1) {
      // Top-right corner: rotate 180 degrees clockwise
      rotation = 0;
    } else if (i === gridHeight - 1 && j === 0) {
      // Bottom-left corner: original orientation (base image is for bottom-left)
      rotation = Math.PI;
    } else if (i === gridHeight - 1 && j === gridWidth - 1) {
      // Bottom-right corner: rotate 90 degrees counterclockwise (270 degrees clockwise)
      rotation = -Math.PI / 2;
    }
    
    // Create wall corner sprite
    const cornerMaterial = new THREE.SpriteMaterial({
      map: this.wallTextures.corner,
      transparent: true,
      alphaTest: 0.1
    });
    
    const cornerSprite = new THREE.Sprite(cornerMaterial);
    cornerSprite.scale.set(cellSize * 0.3, cellSize * 0.3, 1); // Smaller corners to match thin brick walls
    
    // Apply rotation
    cornerSprite.material.rotation = rotation;
    
    cornerSprite.position.set(x, y, 0.1); // Wall in front of floors
    scene.add(cornerSprite);
    this.wallSprites.push(cornerSprite);
  }

  createDoorForCell(i, j, cellSize, scene, gridWidth, gridHeight) {
    if (!this.isLoaded) {
      console.warn('⚠️ Environment textures not loaded yet');
      return;
    }

    // Calculate position
    const x = j * cellSize - (gridWidth * cellSize) / 2;
    const y = -i * cellSize + (gridHeight * cellSize) / 2;
    
    // Create door sprite with initial frame (top frame - frame 0, open door)
    const doorMaterial = new THREE.SpriteMaterial({
      map: this.doorTexture,
      transparent: false,
      alphaTest: 0.1
    });
    
    // Set up UV coordinates for sprite sheet animation
    // The sprite sheet has 4 frames in a vertical column (1 column, 4 rows)
    // We start with the top frame (frame 0, which is the open door)
    doorMaterial.map.repeat.set(1, 0.25); // Show 1/4 of the texture height
    doorMaterial.map.offset.set(0, 0.0); // Start at the top frame (0.0 offset for top quarter)
    
    const doorSprite = new THREE.Sprite(doorMaterial);
    doorSprite.scale.set(cellSize * 1.1, cellSize * 1.1, 1); // Slightly smaller than cell
    doorSprite.position.set(x, y, 0.2); // Door in front of floors and walls
    
    // Store the fixed position to prevent movement during animation
    doorSprite.userData = { fixedX: x, fixedY: y, fixedZ: 0.2 };
    
    scene.add(doorSprite);
    this.doorSprite = doorSprite; // Store reference for animation
    
    console.log('🚪 Door created at position:', { i, j, x, y });
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

  // Method to get floor and wall statistics
  getFloorStats() {
    const stats = {
      totalFloors: this.floorSprites.length,
      totalWalls: this.wallSprites.length,
      totalElements: this.floorSprites.length + this.wallSprites.length,
      isLoaded: this.isLoaded
    };
    return stats;
  }

  // Method to clear all floors and walls (useful for regenerating dungeon)
  clearFloors(scene) {
    // Clear floor sprites
    this.floorSprites.forEach(sprite => {
      scene.remove(sprite);
      if (sprite.material.map) {
        sprite.material.map.dispose();
      }
      sprite.material.dispose();
    });
    this.floorSprites = [];
    
    // Clear wall sprites
    this.wallSprites.forEach(sprite => {
      scene.remove(sprite);
      if (sprite.material.map) {
        sprite.material.map.dispose();
      }
      sprite.material.dispose();
    });
    this.wallSprites = [];
    
    // Clear door sprite
    if (this.doorSprite) {
      scene.remove(this.doorSprite);
      if (this.doorSprite.material.map) {
        this.doorSprite.material.map.dispose();
      }
      this.doorSprite.material.dispose();
      this.doorSprite = null;
    }
    
    // Also clear visited cells when clearing floors
    this.clearVisitedCells(scene);
    
    console.log('🧹 Cleared all floor and wall elements');
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

  // Method to start door closing animation
  startDoorAnimation() {
    if (!this.doorSprite || this.doorAnimationStarted) {
      return; // No door or animation already started
    }
    
    this.doorAnimationStarted = true;
    this.doorCurrentFrame = 0;
    this.doorFrameTime = 0;
    
    console.log('🚪 Door closing animation started!');
  }

  // Method to update door animation
  updateDoorAnimation(deltaTime) {
    if (!this.doorAnimationStarted || this.doorAnimationCompleted || !this.doorSprite) {
      return;
    }
    
    this.doorFrameTime += deltaTime;
    
    if (this.doorFrameTime >= this.doorFrameDuration) {
      this.doorFrameTime = 0;
      this.doorCurrentFrame++;
      
      if (this.doorCurrentFrame >= this.doorTotalFrames) {
        // Animation completed - door is now closed
        this.doorAnimationCompleted = true;
        this.doorCurrentFrame = this.doorTotalFrames - 1; // Stay at the last frame
        console.log('🚪 Door closing animation completed!');
      }
      
      // Update the UV offset to show the current frame (inverted order for closing)
      // Frame 0 = top (offset 0.0), Frame 1 = (offset 0.25), Frame 2 = (offset 0.5), Frame 3 = bottom (offset 0.75)
      const frameOffset = this.doorCurrentFrame * 0.25;
      this.doorSprite.material.map.offset.set(0, frameOffset);
      
      // Ensure position remains fixed during animation
      if (this.doorSprite.userData) {
        this.doorSprite.position.set(
          this.doorSprite.userData.fixedX,
          this.doorSprite.userData.fixedY,
          this.doorSprite.userData.fixedZ
        );
      }
      
      console.log(`🚪 Door frame: ${this.doorCurrentFrame}, offset: ${frameOffset}`);
    }
  }

  // Method to reset door animation (for dungeon reset)
  resetDoorAnimation() {
    if (this.doorSprite) {
      // Reset to initial frame (top frame - open door)
      this.doorSprite.material.map.offset.set(0, 0.0);
      
      // Ensure position is also reset to fixed position
      if (this.doorSprite.userData) {
        this.doorSprite.position.set(
          this.doorSprite.userData.fixedX,
          this.doorSprite.userData.fixedY,
          this.doorSprite.userData.fixedZ
        );
      }
    }
    
    this.doorAnimationStarted = false;
    this.doorAnimationCompleted = false;
    this.doorCurrentFrame = 0;
    this.doorFrameTime = 0;
    
    console.log('🚪 Door animation reset');
  }

  // Method to update floor animations (if needed in the future)
  update(deltaTime) {
    // Update door animation
    this.updateDoorAnimation(deltaTime);
    
    // Currently floors are static, but this method is here for future enhancements
    // like animated water floors, glowing magic circles, etc.
  }
}
