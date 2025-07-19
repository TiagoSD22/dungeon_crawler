/**
 * Dungeon Environment Manager
 * 
 * Generates rich, layered dungeon environments while preserving the original matrix structure.
 * The original matrix remains intact for knight movement and gameplay mechanics.
 * Environmental assets are placed around and within rooms without interfering with navigation.
 * 
 * Key Design Principles:
 * - Original matrix positions remain walkable
 * - Environmental assets enhance visuals without blocking gameplay
 * - Walls and obstacles are placed in expanded "buffer" areas around the core matrix
 * - Room interiors get floor decorations and objects that don't block movement
 * 
 * Layer System:
 * - Layer 0: Floor (base tiles, decorative patterns - walkable)
 * - Layer 1: Walls (placed in buffer zones around matrix)
 * - Layer 2: Wall-Mounted Objects (torches, decorations)
 * - Layer 3: Ground Objects (decorative only, don't block paths)
 * - Layer 4: Effects & Overlays (light glows, magical effects)
 */

import * as THREE from 'three';

export class DungeonEnvironmentManager {
  constructor() {
    this.scene = null;
    this.cellSize = 80;
    this.tileSize = 32; // Standard tile size for assets
    this.roomEnvironments = new Map(); // Map of room positions to environment data
    this.originalMatrix = null; // Store the original dungeon matrix
    this.expandedMatrix = null; // Expanded matrix with buffer zones for walls
    this.bufferSize = 1; // Buffer cells around original matrix for walls/obstacles
    
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
        primaryObjects: ['decorative_coffins', 'skull_piles', 'bone_fragments'],
        lighting: ['torches', 'candles'],
        wallDecor: ['scull_bas-relief'],
        floorSpecial: ['stone_patterns', 'decorative_grates'],
        mood: 'dark_mystical'
      },
      treasury: {
        description: 'A treasure room with valuables and guardians',
        primaryObjects: ['decorative_chests', 'coin_piles', 'gem_clusters'],
        lighting: ['torches'],
        wallDecor: ['ornate_relief'],
        floorSpecial: ['golden_patterns'],
        mood: 'rich_ornate'
      },
      temple: {
        description: 'A sacred chamber with religious artifacts',
        primaryObjects: ['prayer_altars', 'ritual_circles', 'holy_symbols'],
        lighting: ['candles', 'divine_lights'],
        wallDecor: ['sacred_relief'],
        floorSpecial: ['ritual_patterns'],
        mood: 'sacred_mystical'
      },
      prison: {
        description: 'A dungeon cell or holding area',
        primaryObjects: ['chain_remnants', 'old_shackles', 'prisoner_belongings'],
        lighting: ['dim_torches'],
        wallDecor: ['scull_bas-relief'],
        floorSpecial: ['worn_stone', 'water_stains'],
        mood: 'oppressive_dark'
      },
      neutral: {
        description: 'A standard dungeon corridor or chamber',
        primaryObjects: ['stone_debris', 'moss_patches', 'weathered_stones'],
        lighting: ['torches'],
        wallDecor: ['simple_relief'],
        floorSpecial: ['basic_patterns'],
        mood: 'standard_dungeon'
      }
    };
    
    // Layer definitions
    this.layers = {
      FLOOR: 0,           // Floor tiles, patterns (WALKABLE)
      WALLS: 1,           // Walls in buffer zones only
      WALL_MOUNTED: 2,    // Wall torches, bas-reliefs
      GROUND_OBJECTS: 3,  // Decorative objects (non-blocking)
      EFFECTS: 4          // Light glows, magical effects
    };
    
    console.log('🏰 DungeonEnvironmentManager initialized with matrix preservation');
  }

  async initialize(scene, cellSize = 80, originalMatrix = null) {
    this.scene = scene;
    this.cellSize = cellSize;
    this.originalMatrix = originalMatrix;
    
    console.log('🏰 Initializing dungeon environment manager...');
    
    // Create expanded matrix for wall placement if original matrix is provided
    if (this.originalMatrix) {
      this.createExpandedMatrix();
    }
    
    try {
      await this.loadAssetCatalogs();
      console.log('✅ All asset catalogs loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load asset catalogs:', error);
    }
  }

  /**
   * Create an expanded matrix with buffer zones around the original matrix
   * This allows placing walls and obstacles without interfering with gameplay
   */
  createExpandedMatrix() {
    const originalHeight = this.originalMatrix.length;
    const originalWidth = this.originalMatrix[0].length;
    
    const expandedHeight = originalHeight + (this.bufferSize * 2);
    const expandedWidth = originalWidth + (this.bufferSize * 2);
    
    // Initialize expanded matrix with walls (value: 'wall')
    this.expandedMatrix = Array(expandedHeight).fill().map(() => 
      Array(expandedWidth).fill('wall')
    );
    
    // Copy original matrix to center of expanded matrix
    for (let i = 0; i < originalHeight; i++) {
      for (let j = 0; j < originalWidth; j++) {
        const expandedI = i + this.bufferSize;
        const expandedJ = j + this.bufferSize;
        this.expandedMatrix[expandedI][expandedJ] = this.originalMatrix[i][j];
      }
    }
    
    console.log(`🗺️ Created expanded matrix: ${expandedWidth}x${expandedHeight} (original: ${originalWidth}x${originalHeight})`);
  }

  async loadAssetCatalogs() {
    console.log('🏰 Loading real dungeon assets from the floors folder...');
    
    const loader = new THREE.TextureLoader();
    
    // Define paths to actual asset files
    const assetPaths = {
      floor_base_1: './assets/environment/floors/floor_base_1.png',
      floor_base_2: './assets/environment/floors/floor_base_2.png',
      floor_layer_1: './assets/environment/floors/floor_layer_1.png',
      floor_layer_2: './assets/environment/floors/floor_layer_2.png',
      plates: './assets/environment/floors/plates.png'
    };

    // Load floor assets
    const loadPromises = Object.entries(assetPaths).map(([key, path]) => {
      return new Promise((resolve) => {
        loader.load(
          path,
          (texture) => {
            // Setup texture for pixel art
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            
            this.assetCatalogs[key] = texture;
            console.log(`📦 Loaded ${key} floor asset from ${path}`);
            resolve();
          },
          undefined,
          (error) => {
            console.warn(`⚠️ Could not load ${key} from ${path}, creating fallback`);
            // Create fallback if asset fails to load
            this.assetCatalogs[key] = this.createFallbackTexture(key);
            resolve();
          }
        );
      });
    });

    await Promise.all(loadPromises);
    
    // Create detailed textures for other elements using the canvas approach
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Create stone wall texture (like in the reference image)
    this.assetCatalogs.foundational = this.createStoneWallTexture(ctx);
    
    // Create decorative object textures
    this.assetCatalogs.objects = this.createObjectTexture(ctx);
    
    // Create torch textures
    this.assetCatalogs.torches = this.createTorchTexture(ctx);
    
    // Create barrel and chest textures
    this.assetCatalogs.coffins = this.createContainerTexture(ctx);
    
    // Set remaining catalogs to use stone texture as base or floor assets
    this.assetCatalogs.architectural = this.assetCatalogs.foundational;
    this.assetCatalogs.doors = this.assetCatalogs.foundational;
    this.assetCatalogs.candles = this.assetCatalogs.torches;
    this.assetCatalogs.wallDecor = this.assetCatalogs.foundational;
    this.assetCatalogs.statuesFire = this.assetCatalogs.objects;
    
    console.log('✅ All dungeon assets loaded successfully');
  }

  createFallbackTexture(assetKey) {
    // Create fallback textures if real assets fail to load
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    switch(assetKey) {
      case 'floor_base_1':
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(0, 0, 64, 64);
        break;
      case 'floor_base_2':
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, 0, 64, 64);
        break;
      case 'floor_layer_1':
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(0, 0, 64, 64);
        break;
      case 'floor_layer_2':
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(0, 0, 64, 64);
        break;
      case 'plates':
        ctx.fillStyle = '#8a8a8a';
        ctx.fillRect(0, 0, 64, 64);
        break;
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  createStoneWallTexture(ctx) {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, 512, 512);
    
    // Base stone color (darker gray like in reference)
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw stone brick pattern
    const brickWidth = 64;
    const brickHeight = 32;
    
    for (let y = 0; y < 512; y += brickHeight) {
      for (let x = 0; x < 512; x += brickWidth) {
        // Alternate brick offset for realistic pattern
        const offsetX = (y / brickHeight) % 2 === 0 ? 0 : brickWidth / 2;
        const drawX = (x + offsetX) % 512;
        
        // Draw brick outline
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, y, brickWidth, brickHeight);
        
        // Add highlight to make bricks look 3D
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(drawX + 2, y + 2, brickWidth - 4, 6);
        ctx.fillRect(drawX + 2, y + 2, 6, brickHeight - 4);
        
        // Add shadow for depth
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(drawX + brickWidth - 8, y + 8, 6, brickHeight - 8);
        ctx.fillRect(drawX + 8, y + brickHeight - 8, brickWidth - 8, 6);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  createObjectTexture(ctx) {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, 512, 512);
    
    // Draw barrels (like in reference image)
    this.drawBarrel(ctx, 64, 64, 48);
    this.drawBarrel(ctx, 192, 64, 48);
    
    // Draw chests
    this.drawChest(ctx, 320, 64, 48);
    
    // Draw skulls and bones
    this.drawSkull(ctx, 64, 192, 32);
    this.drawBones(ctx, 192, 192, 32);
    
    // Draw stone debris
    this.drawStoneDebris(ctx, 320, 192, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  drawBarrel(ctx, x, y, size) {
    // Barrel body (brown wood)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y + size * 0.1, size, size * 0.8);
    
    // Barrel hoops (metal bands)
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x, y + size * 0.2, size, 4);
    ctx.fillRect(x, y + size * 0.7, size, 4);
    
    // Barrel highlight
    ctx.fillStyle = '#cd853f';
    ctx.fillRect(x + 2, y + size * 0.1, 6, size * 0.8);
    
    // Barrel top
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.ellipse(x + size/2, y + size * 0.1, size/2, size * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawChest(ctx, x, y, size) {
    // Chest body (dark wood)
    ctx.fillStyle = '#4a3c28';
    ctx.fillRect(x, y + size * 0.3, size, size * 0.7);
    
    // Chest lid
    ctx.fillStyle = '#5a4c38';
    ctx.fillRect(x, y, size, size * 0.4);
    
    // Metal reinforcements
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + size * 0.1, y + size * 0.4, size * 0.8, 3);
    ctx.fillRect(x + size * 0.4, y + size * 0.1, 3, size * 0.3);
    
    // Lock
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x + size * 0.7, y + size * 0.6, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSkull(ctx, x, y, size) {
    // Skull (bone white)
    ctx.fillStyle = '#f5f5dc';
    ctx.beginPath();
    ctx.arc(x + size/2, y + size * 0.4, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye sockets
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(x + size * 0.35, y + size * 0.35, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size * 0.65, y + size * 0.35, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    // Nasal cavity
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + size * 0.45);
    ctx.lineTo(x + size * 0.45, y + size * 0.55);
    ctx.lineTo(x + size * 0.55, y + size * 0.55);
    ctx.fill();
  }

  drawBones(ctx, x, y, size) {
    ctx.fillStyle = '#f5f5dc';
    
    // Draw crossed bones
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-size * 0.4, -2, size * 0.8, 4);
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(-size * 0.4, -2, size * 0.8, 4);
    ctx.restore();
    
    // Bone ends
    ctx.beginPath();
    ctx.arc(x + size * 0.2, y + size * 0.2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size * 0.8, y + size * 0.8, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStoneDebris(ctx, x, y, size) {
    ctx.fillStyle = '#696969';
    
    // Draw random stone chunks
    for (let i = 0; i < 5; i++) {
      const stoneX = x + Math.random() * size;
      const stoneY = y + Math.random() * size;
      const stoneSize = 4 + Math.random() * 8;
      
      ctx.beginPath();
      ctx.arc(stoneX, stoneY, stoneSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  createTorchTexture(ctx) {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, 512, 512);
    
    // Draw torch handle (wood)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(64 + 12, 64, 8, 48);
    
    // Draw torch flame (animated frames)
    this.drawFlame(ctx, 64 + 8, 64 - 16, 16, 20, '#ff4500'); // Frame 0
    this.drawFlame(ctx, 192 + 8, 64 - 16, 16, 22, '#ff6500'); // Frame 1
    this.drawFlame(ctx, 320 + 8, 64 - 16, 16, 18, '#ff8500'); // Frame 2
    this.drawFlame(ctx, 64 + 8, 192 - 16, 16, 24, '#ffa500'); // Frame 3
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  drawFlame(ctx, x, y, width, height, color) {
    const gradient = ctx.createLinearGradient(x, y + height, x, y);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, '#ffff00');
    gradient.addColorStop(1, '#ffffff');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x + width/2, y);
    ctx.quadraticCurveTo(x + width, y + height/2, x + width * 0.8, y + height);
    ctx.lineTo(x + width * 0.2, y + height);
    ctx.quadraticCurveTo(x, y + height/2, x + width/2, y);
    ctx.fill();
  }

  createContainerTexture(ctx) {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, 512, 512);
    
    // Draw various containers (barrels, chests, coffins)
    this.drawBarrel(ctx, 64, 64, 56);
    this.drawChest(ctx, 192, 64, 56);
    this.drawCoffin(ctx, 320, 64, 56);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  drawCoffin(ctx, x, y, size) {
    // Coffin body (dark wood)
    ctx.fillStyle = '#2F2F2F';
    ctx.fillRect(x, y + size * 0.2, size, size * 0.8);
    
    // Coffin lid (slightly lighter)
    ctx.fillStyle = '#4F4F4F';
    ctx.fillRect(x + size * 0.1, y, size * 0.8, size * 0.3);
    
    // Metal handles
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + size * 0.2, y + size * 0.5, 6, 3);
    ctx.fillRect(x + size * 0.7, y + size * 0.5, 6, 3);
    
    // Cross decoration
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(x + size * 0.45, y + size * 0.6, 4, 16);
    ctx.fillRect(x + size * 0.35, y + size * 0.66, 16, 4);
  }

  createFloorTileTexture(ctx) {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, 512, 512);
    
    // Base floor color (stone gray)
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw stone tile pattern
    const tileSize = 64;
    for (let y = 0; y < 512; y += tileSize) {
      for (let x = 0; x < 512; x += tileSize) {
        // Tile outline
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);
        
        // Tile highlights
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(x + 2, y + 2, tileSize - 4, 4);
        ctx.fillRect(x + 2, y + 2, 4, tileSize - 4);
        
        // Worn areas
        if (Math.random() > 0.7) {
          ctx.fillStyle = '#4a4a4a';
          ctx.beginPath();
          ctx.arc(x + tileSize/2, y + tileSize/2, Math.random() * 8 + 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Generate environment for a specific room
   * @param {number} roomI - Room row index
   * @param {number} roomJ - Room column index
   * @param {number} roomValue - Room threat value
   * @param {object} gridData - Grid information
   */
  async generateRoomEnvironment(roomI, roomJ, roomValue, gridData) {
    // Generate environments for ALL rooms (including corridors with value 0)
    const roomKey = `${roomI},${roomJ}`;
    
    // Don't regenerate if already exists
    if (this.roomEnvironments.has(roomKey)) {
      console.log(`♻️ Environment already exists for room [${roomI},${roomJ}]`);
      return this.roomEnvironments.get(roomKey);
    }

    console.log(`🏰 Generating environment for room [${roomI},${roomJ}] with value ${roomValue}`);

    // Determine room theme based on room value and position
    const theme = this.determineRoomTheme(roomI, roomJ, roomValue);
    console.log(`🎨 Selected theme: ${theme} for room [${roomI},${roomJ}]`);
    
    // Generate room layout
    const roomLayout = this.generateRoomLayout(roomI, roomJ, theme, gridData);
    console.log(`🗺️ Generated layout with ${Object.values(roomLayout.layers).flat().length} total objects`);
    
    // Create 3D objects for the room
    const environmentObjects = await this.createEnvironmentObjects(roomLayout, roomI, roomJ);
    console.log(`🎯 Created ${environmentObjects.length} 3D objects for room [${roomI},${roomJ}]`);
    
    // Store environment data
    const environmentData = {
      theme,
      layout: roomLayout,
      objects: environmentObjects,
      position: { i: roomI, j: roomJ }
    };
    
    this.roomEnvironments.set(roomKey, environmentData);
    
    console.log(`✅ Generated ${theme} environment for room [${roomI},${roomJ}] - ${environmentObjects.length} objects created`);
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
    // Randomly choose base floor (floor_base1 or floor_base2)
    const baseFloorAsset = Math.random() > 0.5 ? 'floor_base_1' : 'floor_base_2';
    
    // Create base floor that covers the entire room
    layout.layers[this.layers.FLOOR].push({
      type: 'base_floor',
      position: { x: 0, y: 0 },
      asset: baseFloorAsset,
      frame: 0,
      fullRoom: true,
      priority: 0 // Base layer has lowest priority
    });

    // Randomly add floor layer (30% chance)
    if (Math.random() > 0.7) {
      const layerAsset = Math.random() > 0.5 ? 'floor_layer_1' : 'floor_layer_2';
      layout.layers[this.layers.FLOOR].push({
        type: 'floor_layer',
        position: { x: 0, y: 0 },
        asset: layerAsset,
        frame: 0,
        fullRoom: true,
        priority: 1, // Layer goes on top of base
        opacity: 0.7 // Make it semi-transparent to blend with base
      });
    }

    // Randomly place plates (40% chance per room)
    if (Math.random() > 0.6) {
      const plateCount = Math.floor(Math.random() * 3) + 1; // 1-3 plates
      
      for (let i = 0; i < plateCount; i++) {
        // Random positions for plates
        const platePositions = [
          { x: -0.3, y: -0.3 },
          { x: 0.3, y: -0.3 },
          { x: -0.3, y: 0.3 },
          { x: 0.3, y: 0.3 },
          { x: 0, y: 0 }
        ];
        
        const position = platePositions[i % platePositions.length];
        
        layout.layers[this.layers.FLOOR].push({
          type: 'floor_plate',
          position: position,
          asset: 'plates',
          frame: Math.floor(Math.random() * 4), // Random plate variant (assuming 4 variants in sprite sheet)
          fullRoom: false,
          priority: 2, // Plates go on top of layers
          size: 'small'
        });
      }
    }

    // Add themed floor decorations based on room type
    if (theme.floorSpecial.includes('ritual_patterns') || theme.mood === 'sacred_mystical') {
      layout.layers[this.layers.FLOOR].push({
        type: 'ritual_circle',
        position: { x: 0, y: 0 },
        asset: 'floor_layer_1', // Use layer asset for ritual patterns
        frame: 0,
        fullRoom: false,
        priority: 3,
        opacity: 0.8
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
    // Add more objects for rich dungeon atmosphere (like reference image)
    const objectCount = Math.floor(Math.random() * 4) + 3; // 3-6 objects per room
    
    // Add themed decorative objects
    for (let i = 0; i < objectCount; i++) {
      const objectType = this.selectRandomThemeObject(theme.primaryObjects);
      
      // Position objects with varied placement around the room
      const placementPatterns = [
        { x: -0.3, y: -0.3 }, // Top-left area
        { x: 0.3, y: -0.3 },  // Top-right area
        { x: -0.3, y: 0.3 },  // Bottom-left area
        { x: 0.3, y: 0.3 },   // Bottom-right area
        { x: 0, y: -0.4 },    // Top center
        { x: 0, y: 0.4 },     // Bottom center
        { x: -0.4, y: 0 },    // Left center
        { x: 0.4, y: 0 }      // Right center
      ];
      
      const position = placementPatterns[i % placementPatterns.length];
      
      layout.layers[this.layers.GROUND_OBJECTS].push({
        type: objectType,
        position: position,
        asset: this.getAssetForObjectType(objectType),
        frame: this.getFrameForObjectType(objectType),
        animated: this.isObjectAnimated(objectType),
        size: 'medium'
      });
    }

    // Always add at least one torch per room for lighting (like reference)
    layout.layers[this.layers.GROUND_OBJECTS].push({
      type: 'torches',
      position: { x: -0.35, y: -0.35 }, // Corner torch
      asset: 'torches',
      frame: 0,
      animated: true,
      size: 'medium'
    });

    // Add containers based on room type
    if (theme.primaryObjects.includes('decorative_chests')) {
      layout.layers[this.layers.GROUND_OBJECTS].push({
        type: 'decorative_chests',
        position: { x: 0.25, y: 0.25 },
        asset: 'coffins',
        frame: 1, // Chest frame
        animated: false,
        size: 'large'
      });
    }

    if (theme.primaryObjects.includes('decorative_coffins')) {
      layout.layers[this.layers.GROUND_OBJECTS].push({
        type: 'decorative_coffins',
        position: { x: 0, y: 0.2 },
        asset: 'coffins',
        frame: 2, // Coffin frame
        animated: false,
        size: 'large'
      });
    }

    // Add barrels for atmosphere
    if (Math.random() > 0.5) {
      layout.layers[this.layers.GROUND_OBJECTS].push({
        type: 'barrel',
        position: { x: 0.3, y: -0.25 },
        asset: 'objects',
        frame: 0, // Barrel frame
        animated: false,
        size: 'medium'
      });
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
    // Add simple glow effects for lighting objects instead of complex assets
    const lightingObjects = layout.layers[this.layers.GROUND_OBJECTS]
      .filter(obj => theme.lighting.includes(obj.type) || obj.type.includes('torch') || obj.type.includes('candle'));

    lightingObjects.forEach(lightSource => {
      // Add glow effect for each light source using foundational assets
      layout.layers[this.layers.EFFECTS].push({
        type: 'light_glow',
        position: lightSource.position,
        asset: 'foundational', // Use existing asset catalog
        frame: 0,
        animated: true,
        glowColor: 0xFFAA00, // Warm glow color
        intensity: 0.8,
        size: 'large'
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

    // Make environment objects properly sized based on type
    let objectSize;
    if (objData.type === 'base_floor' && objData.fullRoom) {
      // Base floor should completely cover the room
      objectSize = this.cellSize * 0.98;
    } else if (objData.type === 'floor_layer' && objData.fullRoom) {
      // Floor layer should also cover the room but be slightly smaller to show base
      objectSize = this.cellSize * 0.96;
    } else if (objData.type === 'floor_plate') {
      // Plates are small decorative elements
      objectSize = this.cellSize * 0.15;
    } else if (objData.type === 'wall') {
      // Walls should be thick and prominent
      objectSize = this.cellSize * 0.9;
    } else if (objData.size === 'large') {
      // Large objects like chests, coffins
      objectSize = this.cellSize * 0.35;
    } else if (objData.size === 'medium') {
      // Medium objects like barrels, torches
      objectSize = this.cellSize * 0.25;
    } else if (objData.size === 'small') {
      // Small decorative objects
      objectSize = this.cellSize * 0.15;
    } else {
      // Default size
      objectSize = this.cellSize * 0.2;
    }
    
    const geometry = new THREE.PlaneGeometry(objectSize, objectSize);
    
    const material = new THREE.MeshBasicMaterial({
      map: this.getAssetTexture(objData.asset, objData.frame || 0),
      transparent: true,
      alphaTest: 0.1,
      opacity: objData.opacity || 1.0
    });

    // Set up UV mapping for the specific frame
    this.setupUVMapping(material.map, objData.frame, objData.asset);

    const mesh = new THREE.Mesh(geometry, material);

    // Position the object with proper layering
    let finalX = roomCenterX;
    let finalY = roomCenterY;
    let finalZ = 0.5; // Higher base height to ensure visibility above room backgrounds
    
    // Set height based on priority for proper layering
    if (objData.priority !== undefined) {
      finalZ = 0.5 + (objData.priority * 0.1); // Each priority level adds 0.1 units (more separation)
    } else {
      finalZ = layer * 0.2 + 1.0; // Legacy layer system with higher positioning
    }
    
    if (objData.type === 'base_floor' || objData.type === 'floor_layer' || objData.type === 'floor_plate') {
      // Floor objects positioned exactly at room center or with offset
      if (objData.position && (objData.position.x !== 0 || objData.position.y !== 0)) {
        finalX += objData.position.x * this.cellSize * 0.35;
        finalY += objData.position.y * this.cellSize * 0.35;
      }
    } else if (objData.position && (objData.position.x !== undefined && objData.position.y !== undefined)) {
      // Handle relative positioning for other decorative objects
      if (Math.abs(objData.position.x) <= 1 && Math.abs(objData.position.y) <= 1) {
        // Relative positioning (values between -1 and 1)
        finalX += objData.position.x * this.cellSize * 0.35;
        finalY += objData.position.y * this.cellSize * 0.35;
        finalZ = 1.0 + (layer * 0.2); // Higher stacking for decorative objects
      }
    }
    
    mesh.position.set(finalX, finalY, finalZ);

    // Store object data for animation and interaction
    mesh.userData = {
      environmentObject: true,
      objData,
      layer,
      animated: objData.animated || false,
      roomPosition: { i: Math.floor((roomCenterY + (this.scene.userData.gridHeight * this.cellSize) / 2) / this.cellSize), 
                     j: Math.floor((roomCenterX + (this.scene.userData.gridWidth * this.cellSize) / 2) / this.cellSize) }
    };

    console.log(`🎨 Created ${objData.type} object at position (${mesh.position.x.toFixed(1)}, ${mesh.position.y.toFixed(1)}, ${mesh.position.z.toFixed(1)})`);
    
    return mesh;
  }

  /**
   * Set up UV mapping for a specific frame in an asset sheet
   */
  setupUVMapping(texture, frameIndex, assetType) {
    // Handle different frame layouts for different asset types
    if (assetType === 'torches' && frameIndex > 0) {
      // Animated torch frames are laid out horizontally
      const frameWidth = 1 / 4; // 4 animation frames
      texture.offset.set(frameIndex * frameWidth, 0);
      texture.repeat.set(frameWidth, 1);
    } else if (assetType === 'objects' || assetType === 'coffins') {
      // Object frames are laid out in a grid
      const framesPerRow = 3;
      const frameWidth = 1 / framesPerRow;
      const frameHeight = 1 / 2; // 2 rows
      
      const col = frameIndex % framesPerRow;
      const row = Math.floor(frameIndex / framesPerRow);
      
      texture.offset.set(col * frameWidth, row * frameHeight);
      texture.repeat.set(frameWidth, frameHeight);
    } else {
      // Default: use full texture
      texture.offset.set(0, 0);
      texture.repeat.set(1, 1);
    }
    
    texture.needsUpdate = true;
  }

  /**
   * Get texture for a specific asset
   */
  getAssetTexture(assetKey, frame = 0) {
    console.log(`🔍 Looking for asset key: '${assetKey}'`);
    console.log(`📚 Available asset catalogs:`, Object.keys(this.assetCatalogs));
    
    if (this.assetCatalogs[assetKey]) {
      console.log(`✅ Found asset '${assetKey}', creating clone`);
      return this.assetCatalogs[assetKey].clone();
    }
    
    console.warn(`⚠️ Asset '${assetKey}' not found in catalogs`);
    // Return a fallback texture
    return this.createFallbackTexture(assetKey);
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
      // Map object types to available asset catalogs
      'decorative_coffins': 'coffins',
      'skull_piles': 'objects',
      'bone_fragments': 'objects',
      'decorative_chests': 'objects',
      'coin_piles': 'objects',
      'gem_clusters': 'objects',
      'prayer_altars': 'architectural',
      'ritual_circles': 'plates',
      'holy_symbols': 'objects',
      'chain_remnants': 'objects',
      'old_shackles': 'objects',
      'prisoner_belongings': 'objects',
      'stone_debris': 'foundational',
      'moss_patches': 'foundational',
      'weathered_stones': 'foundational',
      'torches': 'torches',
      'candles': 'candles',
      'dim_torches': 'torches'
    };
    
    return assetMap[objectType] || 'foundational'; // Fallback to foundational
  }

  getFrameForObjectType(objectType) {
    // Return appropriate frame index for each object type
    const frameMap = {
      'decorative_coffins': 0,
      'skull_piles': 1,
      'bone_fragments': 2,
      'decorative_chests': 0,
      'coin_piles': 1,
      'gem_clusters': 2,
      'prayer_altars': 0,
      'ritual_circles': 0,
      'holy_symbols': 1,
      'chain_remnants': 0,
      'old_shackles': 1,
      'prisoner_belongings': 2,
      'stone_debris': 0,
      'moss_patches': 1,
      'weathered_stones': 2,
      'torches': 0,
      'candles': 0,
      'dim_torches': 0
    };
    
    return frameMap[objectType] || 0;
  }

  isObjectAnimated(objectType) {
    const animatedObjects = ['torches', 'candles', 'dim_torches', 'light_glow'];
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
    if (!object3D.userData.animationTime) {
      object3D.userData.animationTime = 0;
      object3D.userData.currentFrame = 0;
    }

    object3D.userData.animationTime += deltaTime;
    
    // Torch animation (4 frames, faster flicker)
    if (objData.type === 'torches' && object3D.userData.animationTime >= 0.15) {
      object3D.userData.currentFrame = (object3D.userData.currentFrame + 1) % 4;
      this.setupUVMapping(object3D.material.map, object3D.userData.currentFrame, objData.asset);
      object3D.userData.animationTime = 0;
    }
    // Other animated objects (slower animation)
    else if (object3D.userData.animationTime >= 0.3) {
      object3D.userData.currentFrame = (object3D.userData.currentFrame + 1) % 2;
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
