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
    this.entranceTextures = {
      floorEntrance: null,
      highFloor: null,
      coffin: null,
      statue: null,
      arch: null
    };
    this.isLoaded = false;
    this.floorSprites = [];
    this.wallSprites = []; // Store wall sprites separately
    this.entranceSprites = []; // Store entrance environment sprites
    this.visitedCells = new Set(); // Track visited cells
    this.darkOverlays = []; // Store dark overlays for visited cells
    this.specialFinalRoomCoords = new Set(); // Track special final room coordinates
    this.specialRoomSprites = []; // Store special room sprites separately (not cleared with regular floors)
    
    // Door animation properties
    this.doorSprite = null;
    this.doorAnimationStarted = false;
    this.doorAnimationCompleted = false;
    this.doorCurrentFrame = 0;
    this.doorFrameTime = 0;
    this.doorFrameDuration = 0.5; // 0.5 seconds per frame
    this.doorTotalFrames = 4;
    
    // Statue animation properties
    this.statueSprite = null;
    this.statueCurrentFrame = 0;
    this.statueLastFrame = 0;
    this.statueAnimationSpeed = 300; // 300ms per frame
    this.statueFrameCount = 6;
    
    // Load all floor textures
    // Note: loadTextures() will be called from initialize() method
  }

  // Initialize method to properly await texture loading
  async initialize() {
    await this.loadTextures();
    return this.isLoaded;
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
      
      // Load entrance environment textures
      this.entranceTextures.floorEntrance = await this.loadTexture(loader, './assets/environment/floors/floor_entrance.PNG');
      this.entranceTextures.highFloor = await this.loadTexture(loader, './assets/environment/floors/high_floor.PNG');
      this.entranceTextures.coffin = await this.loadTexture(loader, './assets/environment/coffin.png');
      this.entranceTextures.statue = await this.loadTexture(loader, './assets/environment/statue.png');
      this.entranceTextures.arch = await this.loadTexture(loader, './assets/environment/entrance_arch.png');
      
      // Special room textures
      this.throneRoomTexture = await this.loadTexture(loader, './assets/environment/throne room.png');
      this.treasureRoomTexture = await this.loadTexture(loader, './assets/environment/treasure_room.png');
      
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

  // Generate expanded matrix with 3 extra water rows at the top + wall padding
  generateExpandedMatrix(originalGrid) {
    const width = originalGrid[0].length;
    const extraRows = 3;
    
    // Create 3 rows of water environment (using value -999 to identify as water)
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
        // Special case for statue position: first interior row (row 1)
        if (i === 1 && j === 1) { 
          row.push(-444); // Special value for statue
        }
        // Special case for knight starting position: second interior row (row 2)
        else if (i === 2 && j === 1) { 
          row.push(-333); // Special value for knight entrance environment
        }
        // Special case for door position: third interior row (row 3)
        else if (i === 3 && j === 1) { 
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
          
          // Check if coordinates are within expanded grid bounds
          if (originalI >= 0 && originalI < expandedGrid.length && 
              originalJ >= 0 && originalJ < expandedGrid[originalI].length) {
            row.push(expandedGrid[originalI][originalJ]);
          } else {
            // Coordinates are outside original grid - assign a normal room value for extension areas
            console.log(`🏰 Extended area at grid position [${i}, ${j}] (original [${originalI}, ${originalJ}]) - assigning room value 0`);
            row.push(0); // Normal room value for extended areas
          }
        }
      }
      finalGrid.push(row);
    }
    
    console.log(`📐 Generated expanded matrix with walls: ${finalGrid.length}x${paddedWidth} (added ${extraRows} water rows + wall padding)`);
    return finalGrid;
  }

  createWaterFloorForCell(i, j, cellSize, scene, gridWidth, gridHeight) {
    if (!this.isLoaded) {
      console.warn('⚠️ Environment textures not loaded yet');
      return;
    }

    // Water cells are now fully transparent - no assets added
    // This creates empty space where water would be
    console.log(`💧 Water cell at (${i},${j}) - transparent, no assets`);
  }

  createFloorForCell(i, j, cellSize, scene, gridWidth, gridHeight, roomValue = 0) {
    if (!this.isLoaded) {
      console.warn('⚠️ Environment textures not loaded yet');
      return;
    }

    // Check if this position is part of the special final room - skip regular floor creation
    const coordKey = `${i},${j}`;
    if (this.specialFinalRoomCoords.has(coordKey)) {
      console.log(`🏰 Skipping regular floor for special final room at (${i},${j})`);
      return;
    }

    // Check if this is a door cell
    if (roomValue === -555) {
      this.createDoorForCell(i, j, cellSize, scene, gridWidth, gridHeight);
      return;
    }

    // Check if this is knight entrance environment cell
    if (roomValue === -333) {
      this.createEntranceEnvironmentForCell(i, j, cellSize, scene, gridWidth, gridHeight);
      return;
    }

    // Check if this is statue cell
    if (roomValue === -444) {
      this.createStatueForCell(i, j, cellSize, scene, gridWidth, gridHeight);
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
      y = baseY - cellSize * 0.45; // Move much closer to entrance area
      rotation = 0; // Horizontal orientation
      scaleX = cellSize * 1.2; // Make wall segments wider to fill gaps
      scaleY = cellSize * 0.25;
    } else if (i === gridHeight - 1) {
      // Bottom wall - move up towards dungeon, rotate to horizontal
      y = baseY + cellSize * 0.45; // Move much closer to dungeon content
      rotation = 0; // Horizontal orientation
      scaleX = cellSize * 1.2; // Make wall segments wider to fill gaps
      scaleY = cellSize * 0.25;
    } else if (j === 0) {
      // Left wall - move right towards dungeon, keep vertical
      x = baseX + cellSize * 0.45; // Move much closer to entrance area
      rotation = Math.PI / 2; // Vertical orientation
      scaleX = cellSize * 1.2; // Make wall segments wider to fill gaps
      scaleY = cellSize * 0.25;
    } else if (j === gridWidth - 1) {
      // Right wall - move left towards dungeon, keep vertical
      x = baseX - cellSize * 0.45; // Move much closer to entrance area
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
      x = baseX + cellSize * 0.45; // Match wall positioning for tight enclosure
      y = baseY - cellSize * 0.45;
    } else if (i === 0 && j === gridWidth - 1) {
      // Top-right corner: move down and left towards dungeon
      x = baseX - cellSize * 0.45; // Match wall positioning for tight enclosure
      y = baseY - cellSize * 0.45;
    } else if (i === gridHeight - 1 && j === 0) {
      // Bottom-left corner: move up and right towards dungeon
      x = baseX + cellSize * 0.45; // Match wall positioning for tight enclosure
      y = baseY + cellSize * 0.45;
    } else if (i === gridHeight - 1 && j === gridWidth - 1) {
      // Bottom-right corner: move up and left towards dungeon
      x = baseX - cellSize * 0.45; // Match wall positioning for tight enclosure
      y = baseY + cellSize * 0.45;
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

  createEntranceEnvironmentForCell(i, j, cellSize, scene, gridWidth, gridHeight) {
    if (!this.isLoaded) {
      console.warn('⚠️ Environment textures not loaded yet');
      return;
    }

    // Calculate position
    const x = j * cellSize - (gridWidth * cellSize) / 2;
    const y = -i * cellSize + (gridHeight * cellSize) / 2;
    
    // Layer 1: Floor entrance base
    const floorEntranceMaterial = new THREE.SpriteMaterial({
      map: this.entranceTextures.floorEntrance,
      transparent: false,
      alphaTest: 0.9
    });
    
    const floorEntranceSprite = new THREE.Sprite(floorEntranceMaterial);
    floorEntranceSprite.scale.set(cellSize * 1.1, cellSize * 1.1, 1);
    floorEntranceSprite.position.set(x, y, -0.1); // Floor level
    scene.add(floorEntranceSprite);
    this.entranceSprites.push(floorEntranceSprite);
    
    // Layer 2: High floor above entrance floor
    const highFloorMaterial = new THREE.SpriteMaterial({
      map: this.entranceTextures.highFloor,
      transparent: true,
      alphaTest: 0.1
    });
    
    const highFloorSprite = new THREE.Sprite(highFloorMaterial);
    highFloorSprite.scale.set(cellSize * 1.0, cellSize * 1.0, 1);
    highFloorSprite.position.set(x, y, -0.05); // Above floor entrance
    scene.add(highFloorSprite);
    this.entranceSprites.push(highFloorSprite);
    
    // Layer 3: Coffin on top - moved up toward beginning of room
    const coffinMaterial = new THREE.SpriteMaterial({
      map: this.entranceTextures.coffin,
      transparent: false,
      alphaTest: 0.1
    });
    
    const coffinSprite = new THREE.Sprite(coffinMaterial);
    coffinSprite.scale.set(cellSize * 0.8, cellSize * 0.8, 1);
    coffinSprite.position.set(x, y + cellSize * 0.4, 0.15); // Moved up and positioned above statue (z=0.15 > statue's z=0.1)
    scene.add(coffinSprite);
    this.entranceSprites.push(coffinSprite);
    
    console.log('🏛️ Entrance environment created at position:', { i, j, x, y });
  }

  createStatueForCell(i, j, cellSize, scene, gridWidth, gridHeight) {
    if (!this.isLoaded) {
      console.warn('⚠️ Environment textures not loaded yet');
      return;
    }

    // Calculate position
    const x = j * cellSize - (gridWidth * cellSize) / 2;
    const y = -i * cellSize + (gridHeight * cellSize) / 2;
    
    // Add floor layer for statue cell using floor_entrance.PNG
    const statueFloorMaterial = new THREE.SpriteMaterial({
      map: this.entranceTextures.floorEntrance,
      transparent: false
    });
    
    const statueFloorSprite = new THREE.Sprite(statueFloorMaterial);
    statueFloorSprite.scale.set(cellSize * 1.1, cellSize * 1.1, 1); // Cover entire cell
    statueFloorSprite.position.set(x, y, -0.1); // Floor level, same as other floors
    scene.add(statueFloorSprite);
    this.entranceSprites.push(statueFloorSprite);
    
    // Add entrance arch behind the statue
    const archMaterial = new THREE.SpriteMaterial({
      map: this.entranceTextures.arch,
      transparent: false,
      alphaTest: 0.9,
      //color: 0x505050 // Darken the arch slightly
    });
    
    const archSprite = new THREE.Sprite(archMaterial);
    archSprite.scale.set(cellSize * 1.2, cellSize * 1.2, 1); // Slightly larger than statue
    archSprite.position.set(x, y, 0.05); // Behind statue (z=0.05 < statue's z=0.1)
    scene.add(archSprite);
    this.entranceSprites.push(archSprite);
    
    // Create animated statue sprite
    const statueMaterial = new THREE.SpriteMaterial({
      map: this.entranceTextures.statue,
      transparent: false,
      alphaTest: 1.0
    });
    
    // Set up UV coordinates for sprite sheet animation (6 frames in one row)
    statueMaterial.map.repeat.set(1/6, 1); // Show 1/6 of the texture width
    statueMaterial.map.offset.set(0, 0); // Start at the first frame
    
    const statueSprite = new THREE.Sprite(statueMaterial);
    statueSprite.scale.set(cellSize * 1.0, cellSize * 1.0, 1);
    statueSprite.position.set(x, y, 0.1); // Above floor (z=0.1) but below coffin (z=0.15)
    
    scene.add(statueSprite);
    this.statueSprite = statueSprite; // Store reference for animation
    this.entranceSprites.push(statueSprite);
    
    console.log('🗿 Statue created at position:', { i, j, x, y });
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
    
    // Clear special final room coordinates
    this.specialFinalRoomCoords.clear();
    
    // Note: Special room sprites (this.specialRoomSprites) are NOT cleared here
    // They should persist during rescue and only be cleared when regenerating dungeon
    
    console.log('🧹 Cleared all floor and wall elements (special rooms preserved)');
  }

  // Method to clear special room sprites (called only when regenerating dungeon)
  clearSpecialRooms(scene) {
    this.specialRoomSprites.forEach(sprite => {
      scene.remove(sprite);
      if (sprite.material.map) {
        sprite.material.map.dispose();
      }
      sprite.material.dispose();
    });
    this.specialRoomSprites = [];
    
    console.log('🧹 Cleared special room sprites');
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

  updateStatueAnimation() {
    if (this.statueSprite && this.statueSprite.material.map) {
      const now = Date.now();
      
      // Initialize lastFrame if not set
      if (this.statueLastFrame === 0) {
        this.statueLastFrame = now;
      }
      
      if (now - this.statueLastFrame > this.statueAnimationSpeed) {
        this.statueCurrentFrame = (this.statueCurrentFrame + 1) % this.statueFrameCount;
        
        // Update UV offset for horizontal sprite sheet
        const offsetX = this.statueCurrentFrame / this.statueFrameCount;
        this.statueSprite.material.map.offset.x = offsetX;
        
        this.statueLastFrame = now;
        
        console.log(`🗿 Statue frame: ${this.statueCurrentFrame}, offset: ${offsetX}`);
      }
    }
  }

  // Method to pre-register special final room coordinates to prevent regular floor creation
  preRegisterSpecialFinalRoom(originalGrid, path) {
    if (!path || path.length === 0) return;
    
    // Get the final room position
    const [finalI, finalJ] = path[path.length - 1];
    
    console.log(`🏰 Pre-registering special final room coordinates at [${finalI}, ${finalJ}]`);
    console.log(`🏰 Original grid dimensions: ${originalGrid.length} x ${originalGrid[0].length}`);
    
    // Calculate expanded grid dimensions (standard without extension)
    const expandedGridHeight = originalGrid.length + 3 + 2; // 3 water rows + 2 wall padding
    const expandedGridWidth = originalGrid[0].length + 2; // 2 wall padding
    console.log(`🏰 Expanded grid dimensions: ${expandedGridHeight} x ${expandedGridWidth}`);
    
    // Get the final room position in expanded coordinates
    const expandedFinalI = finalI + 3 + 1; // 3 water rows + 1 top wall padding
    const expandedFinalJ = finalJ + 1; // 1 left wall padding
    
    console.log(`🏰 Final room expanded position: [${expandedFinalI}, ${expandedFinalJ}]`);
    
    // For canvas approach, we only need to mark the original final room position
    const coordKey = `${expandedFinalI},${expandedFinalJ}`;
    this.specialFinalRoomCoords.add(coordKey);
    console.log(`🏰 Pre-registered special room coordinate: ${coordKey}`);
    
    return { expandedFinalI, expandedFinalJ, finalRoomWidth: 1 };
  }

  // Method to create special final room environment using canvas
  async createSpecialFinalRoom(originalGrid, cellSize, scene, path) {
    console.log('🏰 createSpecialFinalRoom called with:', { 
      gridSize: originalGrid ? `${originalGrid.length}x${originalGrid[0].length}` : 'null',
      cellSize, 
      sceneExists: !!scene, 
      pathLength: path ? path.length : 'null' 
    });
    
    if (!path || path.length === 0) {
      console.warn('🏰 No path provided, exiting createSpecialFinalRoom');
      return;
    }
    
    // Get the final room position
    const [finalI, finalJ] = path[path.length - 1];
    const finalRoomValue = originalGrid[finalI][finalJ];
    
    console.log(`🏰 Creating canvas-based special final room at [${finalI}, ${finalJ}] with value ${finalRoomValue}`);
    
    // Calculate expanded grid dimensions (standard)
    const expandedGridHeight = originalGrid.length + 3 + 2; // 3 water rows + 2 wall padding
    const expandedGridWidth = originalGrid[0].length + 2; // 2 wall padding
    
    // Get the final room position in expanded coordinates
    const expandedFinalI = finalI + 3 + 1; // 3 water rows + 1 top wall padding
    const expandedFinalJ = finalJ + 1; // 1 left wall padding
    
    console.log(`🏰 Final room expanded position: [${expandedFinalI}, ${expandedFinalJ}]`);
    
    // Calculate the position for the canvas following the yellow line path
    // Position the canvas to extend horizontally to the right from the final room
    const finalRoomX = expandedFinalJ * cellSize - (expandedGridWidth * cellSize) / 2;
    const finalRoomY = -expandedFinalI * cellSize + (expandedGridHeight * cellSize) / 2;
    
    // Create a large canvas for the special final room
    const canvasWidth = cellSize * 7; // 7 rooms wide
    const canvasHeight = cellSize * 2; // 2 rooms tall
    
    // Position canvas to start from the final room and extend to the right (following yellow line)
    const canvasX = finalRoomX + cellSize * 2.0; // Start 1.5 cells to the right of final room
    const canvasY = finalRoomY + 0.5 * cellSize; // Same Y level as final room
    
    console.log(`🏰 Creating special room canvas at (${canvasX}, ${canvasY}) with size ${canvasWidth}x${canvasHeight}`);
    console.log(`🏰 Final room is at (${finalRoomX}, ${finalRoomY}), canvas extends horizontally to the right`);
    
    // Create the canvas and draw the special room background
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    // Create a beautiful special room background (now async)
    await this.drawSpecialRoomBackground(ctx, canvasWidth, canvasHeight, cellSize, finalRoomValue);
    
    // Convert canvas to texture
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.magFilter = THREE.NearestFilter;
    canvasTexture.minFilter = THREE.NearestFilter;
    
    // Create sprite material
    const canvasMaterial = new THREE.SpriteMaterial({
      map: canvasTexture,
      transparent: true,
      alphaTest: 0.1
    });
    
    // Create the special room sprite
    const specialRoomSprite = new THREE.Sprite(canvasMaterial);
    specialRoomSprite.scale.set(canvasWidth, canvasHeight, 1);
    specialRoomSprite.position.set(canvasX, canvasY, -0.05); // Floor level, same as other special floors
    
    scene.add(specialRoomSprite);
    this.specialRoomSprites.push(specialRoomSprite); // Store separately so it doesn't get cleared with regular floors
    
    console.log(`✅ Created canvas-based special final room at position (${canvasX}, ${canvasY})`);
    console.log(`✅ Canvas positioned to follow yellow line path extending horizontally from final room`);
    console.log(`✅ Canvas stored in specialRoomSprites to prevent clearing during rescue`);
    
    return { 
      finalI: expandedFinalI, 
      finalJ: expandedFinalJ, 
      finalRoomWidth: 7, // Canvas spans 7 rooms
      canvasSprite: specialRoomSprite,
      canvasPosition: { x: canvasX, y: canvasY }
    };
  }
  
  // Helper method to draw special room background on canvas
  async drawSpecialRoomBackground(ctx, width, height, cellSize, finalRoomValue = -1) {
    console.log(`🎨 Drawing special room background on ${width}x${height} canvas, room value: ${finalRoomValue}`);
    
    // Clear entire canvas with transparency
    ctx.clearRect(0, 0, width, height);
    
    // Calculate column width (7 columns total)
    const columnWidth = width / 7;
    
    // First 2 columns: fully transparent (do nothing)
    console.log(`🎨 First 2 columns (${columnWidth * 2}px) will be transparent`);
    
    // Remaining 5 columns: use appropriate room texture based on final room value
    const backgroundRoomStartX = columnWidth * 2;
    const backgroundRoomWidth = columnWidth * 5;
    
    // Choose texture based on whether final room is a threat room
    const isThreatRoom = finalRoomValue < 0;
    const backgroundTexture = isThreatRoom ? this.throneRoomTexture : this.treasureRoomTexture;
    const roomType = isThreatRoom ? 'throne room' : 'treasure room';
    
    if (backgroundTexture && backgroundTexture.image) {
      console.log(`🎨 Drawing ${roomType} texture from x=${backgroundRoomStartX} to ${backgroundRoomStartX + backgroundRoomWidth}`);
      
      // Draw the background texture in the last 5 columns
      ctx.drawImage(
        backgroundTexture.image,
        backgroundRoomStartX, 0, // destination x, y
        backgroundRoomWidth, height // destination width, height
      );
    } else {
      console.warn(`⚠️ ${roomType} texture not available, using fallback pattern`);
      
      // Fallback: draw a patterned background for the last 5 columns
      const fallbackColor = isThreatRoom ? '#4a4a4a' : '#6b5b73'; // Different colors for different room types
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(backgroundRoomStartX, 0, backgroundRoomWidth, height);
      
      // Add some decorative pattern
      for (let x = backgroundRoomStartX; x < backgroundRoomStartX + backgroundRoomWidth; x += cellSize) {
        for (let y = 0; y < height; y += cellSize) {
          const isEven = (((x - backgroundRoomStartX) / cellSize) + (y / cellSize)) % 2 === 0;
          const lightColor = isThreatRoom ? '#5a5a5a' : '#7b6b83';
          ctx.fillStyle = isEven ? lightColor : fallbackColor;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }
    
    // Add decorative elements only to the throne room area
    //this.addCanvasDecorations(ctx, width, height, cellSize, throneRoomStartX);
    
    console.log('🎨 Special room background drawing completed');
  }
  
  // Helper method to add decorative elements to the canvas
  addCanvasDecorations(ctx, width, height, cellSize, throneRoomStartX = 0) {
    // Only add decorations in the throne room area (last 5 columns)
    const throneRoomWidth = width - throneRoomStartX;
    
    // Add some pillars/columns in the throne room area
    const pillarWidth = cellSize * 0.3;
    const pillarHeight = height * 0.8;
    
    // Left pillar (in throne room area)
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(throneRoomStartX + cellSize * 0.5, (height - pillarHeight) / 2, pillarWidth, pillarHeight);
    
    // Right pillar (in throne room area)
    ctx.fillRect(throneRoomStartX + throneRoomWidth - cellSize * 0.8, (height - pillarHeight) / 2, pillarWidth, pillarHeight);
    
    // Add decorative arches in throne room
    const archCenterX = throneRoomStartX + throneRoomWidth / 2;
    ctx.beginPath();
    ctx.arc(archCenterX, height * 0.2, cellSize * 0.5, 0, Math.PI, false);
    ctx.fillStyle = '#9a9a9a';
    ctx.fill();
    
    // Add some mystical symbols or patterns in throne room
    ctx.fillStyle = '#aaaaaa';
    ctx.font = `${cellSize * 0.4}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText('♦', throneRoomStartX + throneRoomWidth * 0.25, height * 0.7);
    ctx.fillText('♦', throneRoomStartX + throneRoomWidth * 0.75, height * 0.7);
    
    // Add a central focal point for the princess area (far right of throne room)
    const princessX = throneRoomStartX + throneRoomWidth * 0.85;
    const princessY = height * 0.5;
    ctx.beginPath();
    ctx.arc(princessX, princessY, cellSize * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffddaa';
    ctx.fill();
    ctx.strokeStyle = '#dda500';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    console.log(`🎨 Added decorations to throne room area starting at x=${throneRoomStartX}`);
  }
  
  // Legacy method - kept for compatibility but canvas approach is preferred
  createSpecialFloorTile(x, y, cellSize, scene, textureType) {
    console.log(`🏰 Legacy createSpecialFloorTile called - canvas approach is now preferred`);
    return null;
  }

  // Method to update floor animations (if needed in the future)
  update(deltaTime) {
    // Update door animation
    this.updateDoorAnimation(deltaTime);
    
    // Update statue animation
    this.updateStatueAnimation();
    
    // Currently floors are static, but this method is here for future enhancements
    // like animated water floors, glowing magic circles, etc.
  }
}
