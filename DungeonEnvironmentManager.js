/**
 * Dungeon Environment Manager
 * 
 * Generates rich, layered dungeon environments using a comprehensive asset system.
 * Follows a strict layering order and grid-based placement rules for visual coherence.
 * 
 * Layer System:
 * - Layer 0: Floor (base tiles, grates, pressure plates)
 * - Layer 1: Walls (boundaries, doors, arches)
 * - Layer 2: Wall-Mounted Objects (torches, bas-reliefs)
 * - Layer 3: Ground Objects (coffins, statues, chests, columns)
 * - Layer 4: Effects & Overlays (light glows, magical effects)
 */

export class DungeonEnvironmentManager {
  constructor() {
    this.scene = null;
    this.cellSize = 80;
    this.tileSize = 32; // Standard tile size for assets
    this.roomEnvironments = new Map(); // Map of room positions to environment data
    
    // Asset catalogs
    this.assetCatalogs = {
      foundational: null,    // walls_floor.png
      architectural: null,   // Arches_columns.png
      doors: null,          // doors.png
      coffins: null,        // coffins.png
      objects: null,        // other_objects.png
      torches: null,        // torches.png
      candles: null,        // candles.png
      wallDecor: null,      // scull_bas-relief.png
      statuesFire: null,    // Statue_fire.png
      plates: null          // plates.png
    };
    
    // Room themes and their associated objects
    this.roomThemes = {
      crypt: {
        description: 'A burial chamber filled with ancient tombs',
        primaryObjects: ['coffins', 'skeletons', 'skulls'],
        lighting: ['torches', 'candles'],
        wallDecor: ['scull_bas-relief'],
        floorSpecial: ['grates'],
        mood: 'dark_mystical'
      },
      treasury: {
        description: 'A treasure room with valuables and guardians',
        primaryObjects: ['chests', 'statues', 'columns'],
        lighting: ['torches'],
        wallDecor: ['bas-relief'],
        floorSpecial: ['plates'],
        mood: 'rich_ornate'
      },
      temple: {
        description: 'A sacred chamber with religious artifacts',
        primaryObjects: ['statues', 'columns', 'altars'],
        lighting: ['candles', 'statue_fire'],
        wallDecor: ['bas-relief'],
        floorSpecial: ['ritual_plates'],
        mood: 'sacred_mystical'
      },
      prison: {
        description: 'A dungeon cell or holding area',
        primaryObjects: ['chains', 'skeletons', 'bones'],
        lighting: ['torches'],
        wallDecor: ['scull_bas-relief'],
        floorSpecial: ['grates'],
        mood: 'oppressive_dark'
      },
      library: {
        description: 'An ancient study or archive',
        primaryObjects: ['chests', 'statues', 'columns'],
        lighting: ['candles'],
        wallDecor: ['bas-relief'],
        floorSpecial: ['none'],
        mood: 'scholarly_dim'
      }
    };
    
    // Layer definitions
    this.layers = {
      FLOOR: 0,           // Floor tiles, grates, plates
      WALLS: 1,           // Walls, doors, arches
      WALL_MOUNTED: 2,    // Wall torches, bas-reliefs
      GROUND_OBJECTS: 3,  // Coffins, statues, chests
      EFFECTS: 4          // Light glows, magical effects
    };
    
    console.log('🏰 DungeonEnvironmentManager initialized');
  }

  async initialize(scene, cellSize = 80) {
    this.scene = scene;
    this.cellSize = cellSize;
    
    console.log('🏰 Initializing dungeon environment manager...');
    
    try {
      await this.loadAssetCatalogs();
      console.log('✅ All asset catalogs loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load asset catalogs:', error);
    }
  }

  async loadAssetCatalogs() {
    const loader = new THREE.TextureLoader();
    
    const assetPaths = {
      foundational: './assets/environment/walls_floor.png',
      architectural: './assets/environment/Arches_columns.png',
      doors: './assets/environment/doors.png',
      coffins: './assets/environment/coffins.png',
      objects: './assets/environment/other_objects.png',
      torches: './assets/environment/torches.png',
      candles: './assets/environment/candles.png',
      wallDecor: './assets/environment/scull_bas-relief.png',
      statuesFire: './assets/environment/Statue_fire.png',
      plates: './assets/environment/plates.png'
    };

    // Load all asset catalogs
    const loadPromises = Object.entries(assetPaths).map(([key, path]) => {
      return new Promise((resolve, reject) => {
        loader.load(
          path,
          (texture) => {
            // Setup texture for pixel art
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            
            this.assetCatalogs[key] = texture;
            console.log(`📦 Loaded ${key} asset catalog`);
            resolve();
          },
          undefined,
          (error) => {
            console.warn(`⚠️ Could not load ${key} assets: ${path}`, error);
            resolve(); // Don't reject, just continue without this asset
          }
        );
      });
    });

    await Promise.all(loadPromises);
  }

  /**
   * Generate environment for a specific room
   * @param {number} roomI - Room row index
   * @param {number} roomJ - Room column index
   * @param {number} roomValue - Room threat value
   * @param {object} gridData - Grid information
   */
  async generateRoomEnvironment(roomI, roomJ, roomValue, gridData) {
    // Only generate environments for rooms (negative values are threats, positive could be special rooms)
    if (roomValue === 0) return; // Skip empty spaces
    
    const roomKey = `${roomI},${roomJ}`;
    
    // Don't regenerate if already exists
    if (this.roomEnvironments.has(roomKey)) {
      return this.roomEnvironments.get(roomKey);
    }

    console.log(`🏰 Generating environment for room [${roomI},${roomJ}] with value ${roomValue}`);

    // Determine room theme based on room value and position
    const theme = this.determineRoomTheme(roomI, roomJ, roomValue);
    
    // Generate room layout
    const roomLayout = this.generateRoomLayout(roomI, roomJ, theme, gridData);
    
    // Create 3D objects for the room
    const environmentObjects = await this.createEnvironmentObjects(roomLayout, roomI, roomJ);
    
    // Store environment data
    const environmentData = {
      theme,
      layout: roomLayout,
      objects: environmentObjects,
      position: { i: roomI, j: roomJ }
    };
    
    this.roomEnvironments.set(roomKey, environmentData);
    
    console.log(`✅ Generated ${theme} environment for room [${roomI},${roomJ}]`);
    return environmentData;
  }

  /**
   * Determine room theme based on position and value
   */
  determineRoomTheme(roomI, roomJ, roomValue) {
    const themes = Object.keys(this.roomThemes);
    
    // Use position-based seeding for consistent room themes
    const seed = (roomI * 17 + roomJ * 23 + Math.abs(roomValue) * 7) % themes.length;
    
    // Bias certain themes based on room characteristics
    if (roomValue < -5) {
      // High threat rooms are more likely to be crypts or prisons
      return Math.random() < 0.6 ? 'crypt' : 'prison';
    } else if (roomValue > 0) {
      // Positive values might be special rooms like treasuries or temples
      return Math.random() < 0.5 ? 'treasury' : 'temple';
    }
    
    return themes[seed];
  }

  /**
   * Generate the complete layout for a room including all layers
   */
  generateRoomLayout(roomI, roomJ, themeName, gridData) {
    const theme = this.roomThemes[themeName];
    const roomSize = { width: 5, height: 5 }; // Standard room size in tiles
    
    const layout = {
      theme: themeName,
      size: roomSize,
      layers: {
        [this.layers.FLOOR]: [],
        [this.layers.WALLS]: [],
        [this.layers.WALL_MOUNTED]: [],
        [this.layers.GROUND_OBJECTS]: [],
        [this.layers.EFFECTS]: []
      }
    };

    // Generate floor layer
    this.generateFloorLayer(layout, theme);
    
    // Generate walls and doors
    this.generateWallLayer(layout, theme, gridData, roomI, roomJ);
    
    // Place ground objects
    this.placeGroundObjects(layout, theme);
    
    // Add wall-mounted objects
    this.placeWallMountedObjects(layout, theme);
    
    // Add lighting and effects
    this.addLightingEffects(layout, theme);

    return layout;
  }

  /**
   * Generate floor layer with base tiles and special floor elements
   */
  generateFloorLayer(layout, theme) {
    const { width, height } = layout.size;
    
    // Fill with basic floor tiles
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        layout.layers[this.layers.FLOOR].push({
          type: 'floor_tile',
          position: { x, y },
          asset: 'foundational',
          frame: 0 // Base floor tile frame
        });
      }
    }

    // Add special floor elements based on theme
    if (theme.floorSpecial.includes('grates')) {
      // Add some floor grates
      const gratePositions = this.selectRandomPositions(layout.size, 2);
      gratePositions.forEach(pos => {
        layout.layers[this.layers.FLOOR].push({
          type: 'floor_grate',
          position: pos,
          asset: 'foundational',
          frame: 5 // Grate frame index
        });
      });
    }

    if (theme.floorSpecial.includes('plates')) {
      // Add pressure plates or ritual circles
      const platePos = this.getCenterPosition(layout.size);
      layout.layers[this.layers.FLOOR].push({
        type: 'floor_plate',
        position: platePos,
        asset: 'plates',
        frame: 0, // 5x5 pattern
        size: { width: 3, height: 3 }
      });
    }
  }

  /**
   * Generate wall layer with proper boundaries and doors
   */
  generateWallLayer(layout, theme, gridData, roomI, roomJ) {
    const { width, height } = layout.size;
    
    // Create wall boundaries
    for (let x = 0; x < width; x++) {
      // Top and bottom walls
      layout.layers[this.layers.WALLS].push({
        type: 'wall',
        position: { x, y: 0 },
        asset: 'foundational',
        frame: 10, // Top wall frame
        orientation: 'horizontal'
      });
      layout.layers[this.layers.WALLS].push({
        type: 'wall',
        position: { x, y: height - 1 },
        asset: 'foundational',
        frame: 12, // Bottom wall frame
        orientation: 'horizontal'
      });
    }

    for (let y = 1; y < height - 1; y++) {
      // Left and right walls
      layout.layers[this.layers.WALLS].push({
        type: 'wall',
        position: { x: 0, y },
        asset: 'foundational',
        frame: 11, // Left wall frame
        orientation: 'vertical'
      });
      layout.layers[this.layers.WALLS].push({
        type: 'wall',
        position: { x: width - 1, y },
        asset: 'foundational',
        frame: 13, // Right wall frame
        orientation: 'vertical'
      });
    }

    // Add doors based on adjacent rooms
    this.addDoorsToLayout(layout, gridData, roomI, roomJ);
  }

  /**
   * Place ground objects based on theme
   */
  placeGroundObjects(layout, theme) {
    const objectCount = Math.floor(Math.random() * 4) + 2; // 2-5 objects
    const availablePositions = this.getAvailableFloorPositions(layout);
    
    for (let i = 0; i < Math.min(objectCount, availablePositions.length); i++) {
      const position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
      const objectType = this.selectRandomThemeObject(theme.primaryObjects);
      
      layout.layers[this.layers.GROUND_OBJECTS].push({
        type: objectType,
        position,
        asset: this.getAssetForObjectType(objectType),
        frame: this.getFrameForObjectType(objectType),
        animated: this.isObjectAnimated(objectType)
      });

      // Remove used position
      const index = availablePositions.indexOf(position);
      if (index > -1) availablePositions.splice(index, 1);
    }
  }

  /**
   * Place wall-mounted objects
   */
  placeWallMountedObjects(layout, theme) {
    if (theme.wallDecor.length === 0) return;

    const wallPositions = this.getWallPositions(layout);
    const decorCount = Math.floor(Math.random() * 3) + 1; // 1-3 wall decorations
    
    for (let i = 0; i < Math.min(decorCount, wallPositions.length); i++) {
      const position = wallPositions[Math.floor(Math.random() * wallPositions.length)];
      const decorType = theme.wallDecor[Math.floor(Math.random() * theme.wallDecor.length)];
      
      layout.layers[this.layers.WALL_MOUNTED].push({
        type: decorType,
        position,
        asset: 'wallDecor',
        frame: 0,
        animated: true
      });
    }
  }

  /**
   * Add lighting effects
   */
  addLightingEffects(layout, theme) {
    const lightingObjects = layout.layers[this.layers.GROUND_OBJECTS]
      .concat(layout.layers[this.layers.WALL_MOUNTED])
      .filter(obj => theme.lighting.includes(obj.type) || obj.type.includes('torch') || obj.type.includes('candle'));

    lightingObjects.forEach(lightSource => {
      // Add glow effect for each light source
      layout.layers[this.layers.EFFECTS].push({
        type: 'light_glow',
        position: lightSource.position,
        asset: 'effects',
        frame: 0,
        animated: true,
        glowColor: 0x00ffff, // Cyan glow as specified
        intensity: 0.8
      });
    });
  }

  /**
   * Create actual 3D objects from the layout
   */
  async createEnvironmentObjects(layout, roomI, roomJ) {
    const objects = [];
    const roomCenterX = roomJ * this.cellSize - (this.scene.userData.gridWidth * this.cellSize) / 2;
    const roomCenterY = -roomI * this.cellSize + (this.scene.userData.gridHeight * this.cellSize) / 2;

    // Create objects for each layer
    for (const [layerIndex, layerObjects] of Object.entries(layout.layers)) {
      for (const objData of layerObjects) {
        const object3D = await this.createObject3D(objData, roomCenterX, roomCenterY, parseInt(layerIndex));
        if (object3D) {
          objects.push({
            object3D,
            data: objData,
            layer: parseInt(layerIndex)
          });
          this.scene.add(object3D);
        }
      }
    }

    return objects;
  }

  /**
   * Create a 3D object from object data
   */
  async createObject3D(objData, roomCenterX, roomCenterY, layer) {
    if (!this.assetCatalogs[objData.asset]) {
      console.warn(`⚠️ Asset catalog '${objData.asset}' not available`);
      return null;
    }

    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    const material = new THREE.MeshBasicMaterial({
      map: this.assetCatalogs[objData.asset].clone(),
      transparent: true,
      alphaTest: 0.1
    });

    // Set up UV mapping for the specific frame
    this.setupUVMapping(material.map, objData.frame, objData.asset);

    const mesh = new THREE.Mesh(geometry, material);

    // Position the object
    const tileOffsetX = (objData.position.x - 2) * this.tileSize; // Center in 5x5 grid
    const tileOffsetY = (objData.position.y - 2) * this.tileSize;
    
    mesh.position.set(
      roomCenterX + tileOffsetX,
      roomCenterY - tileOffsetY,
      layer * 0.1 // Layer separation for proper rendering order
    );

    // Store object data for animation and interaction
    mesh.userData = {
      environmentObject: true,
      objData,
      layer,
      animated: objData.animated || false
    };

    return mesh;
  }

  /**
   * Set up UV mapping for a specific frame in an asset sheet
   */
  setupUVMapping(texture, frameIndex, assetType) {
    // This would need to be customized based on your actual sprite sheet layouts
    // For now, assuming a standard grid layout
    const framesPerRow = 8; // Adjust based on actual sprite sheets
    const frameWidth = 1 / framesPerRow;
    const frameHeight = 1 / framesPerRow;

    const col = frameIndex % framesPerRow;
    const row = Math.floor(frameIndex / framesPerRow);

    texture.offset.set(col * frameWidth, 1 - (row + 1) * frameHeight);
    texture.repeat.set(frameWidth, frameHeight);
    texture.needsUpdate = true;
  }

  // Utility methods
  selectRandomPositions(size, count) {
    const positions = [];
    const available = [];
    
    // Generate all interior positions (not on edges where walls are)
    for (let y = 1; y < size.height - 1; y++) {
      for (let x = 1; x < size.width - 1; x++) {
        available.push({ x, y });
      }
    }

    // Select random positions
    for (let i = 0; i < Math.min(count, available.length); i++) {
      const index = Math.floor(Math.random() * available.length);
      positions.push(available.splice(index, 1)[0]);
    }

    return positions;
  }

  getCenterPosition(size) {
    return {
      x: Math.floor(size.width / 2),
      y: Math.floor(size.height / 2)
    };
  }

  getAvailableFloorPositions(layout) {
    const positions = [];
    const { width, height } = layout.size;
    
    // Get interior positions not occupied by walls
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        positions.push({ x, y });
      }
    }
    
    return positions;
  }

  getWallPositions(layout) {
    const positions = [];
    const { width, height } = layout.size;
    
    // Get wall positions suitable for mounting objects
    for (let x = 1; x < width - 1; x++) {
      positions.push({ x, y: 0 }); // Top wall
      positions.push({ x, y: height - 1 }); // Bottom wall
    }
    
    for (let y = 1; y < height - 1; y++) {
      positions.push({ x: 0, y }); // Left wall
      positions.push({ x: width - 1, y }); // Right wall
    }
    
    return positions;
  }

  selectRandomThemeObject(objectTypes) {
    return objectTypes[Math.floor(Math.random() * objectTypes.length)];
  }

  getAssetForObjectType(objectType) {
    const assetMap = {
      'coffins': 'coffins',
      'skeletons': 'objects',
      'skulls': 'objects',
      'chests': 'objects',
      'statues': 'objects',
      'columns': 'architectural',
      'torches': 'torches',
      'candles': 'candles'
    };
    
    return assetMap[objectType] || 'objects';
  }

  getFrameForObjectType(objectType) {
    // Return appropriate frame index for each object type
    // This would need to be mapped to your actual sprite sheets
    const frameMap = {
      'coffins': 0,
      'skeletons': 10,
      'skulls': 15,
      'chests': 5,
      'statues': 20,
      'columns': 0,
      'torches': 0,
      'candles': 0
    };
    
    return frameMap[objectType] || 0;
  }

  isObjectAnimated(objectType) {
    const animatedObjects = ['torches', 'candles', 'statue_fire', 'scull_bas-relief'];
    return animatedObjects.includes(objectType);
  }

  addDoorsToLayout(layout, gridData, roomI, roomJ) {
    // Check adjacent rooms and add doors accordingly
    // This would integrate with your existing dungeon generation logic
    const doorPosition = { x: 2, y: 0 }; // Example: door in center of top wall
    
    layout.layers[this.layers.WALLS].push({
      type: 'door',
      position: doorPosition,
      asset: 'doors',
      frame: 0, // Closed door
      animated: true,
      state: 'closed'
    });
  }

  /**
   * Update animated objects in all rooms
   */
  updateEnvironments(deltaTime) {
    for (const [roomKey, environmentData] of this.roomEnvironments.entries()) {
      this.updateRoomAnimations(environmentData, deltaTime);
    }
  }

  updateRoomAnimations(environmentData, deltaTime) {
    environmentData.objects.forEach(objWrapper => {
      if (objWrapper.data.animated) {
        this.updateObjectAnimation(objWrapper.object3D, objWrapper.data, deltaTime);
      }
    });
  }

  updateObjectAnimation(object3D, objData, deltaTime) {
    // Handle animation frame updates for torches, candles, etc.
    // This would cycle through animation frames for flickering effects
    if (!object3D.userData.animationTime) {
      object3D.userData.animationTime = 0;
      object3D.userData.currentFrame = 0;
    }

    object3D.userData.animationTime += deltaTime;
    
    if (object3D.userData.animationTime >= 0.2) { // 200ms per frame
      object3D.userData.currentFrame = (object3D.userData.currentFrame + 1) % 4; // Assume 4 frames
      this.setupUVMapping(object3D.material.map, object3D.userData.currentFrame, objData.asset);
      object3D.userData.animationTime = 0;
    }
  }

  /**
   * Get room environment info for debugging
   */
  getRoomEnvironmentInfo(roomI, roomJ) {
    const roomKey = `${roomI},${roomJ}`;
    const environmentData = this.roomEnvironments.get(roomKey);
    
    if (!environmentData) return null;

    return {
      theme: environmentData.theme,
      objectCount: environmentData.objects.length,
      layerCounts: Object.fromEntries(
        Object.entries(environmentData.layout.layers).map(([layer, objects]) => [layer, objects.length])
      )
    };
  }

  /**
   * Clean up environment objects
   */
  dispose() {
    for (const [roomKey, environmentData] of this.roomEnvironments.entries()) {
      environmentData.objects.forEach(objWrapper => {
        if (objWrapper.object3D.parent) {
          objWrapper.object3D.parent.remove(objWrapper.object3D);
        }
        if (objWrapper.object3D.material) {
          objWrapper.object3D.material.dispose();
        }
        if (objWrapper.object3D.geometry) {
          objWrapper.object3D.geometry.dispose();
        }
      });
    }
    
    this.roomEnvironments.clear();
    
    // Dispose asset catalogs
    Object.values(this.assetCatalogs).forEach(texture => {
      if (texture) texture.dispose();
    });
  }
}
