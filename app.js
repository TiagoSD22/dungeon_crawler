import * as THREE from 'three';
import dungeonData from './dungeon.json';
import { DirectionalSpriteKnight } from './DirectionalSpriteKnight.js';
import { PowerUpManager } from './PowerUpManager.js';
import { SpellEffectManager } from './SpellEffectManager.js';
import { EnemyManager } from './EnemyManager.js';
import { BossManager } from './BossManager.js';
import { FightManager } from './FightManager.js';
import { EnvironmentManager } from './EnvironmentManager.js';
import { AnimatedPrincess } from './AnimatedPrincess.js';

const cellSize = 120;
const WATER_ROWS_OFFSET = 3; // Number of water rows added above the original dungeon
const WALL_PADDING = 1; // Wall padding on all sides
let scene, camera, renderer;

// Helper function to convert original grid coordinates to expanded grid coordinates (with walls)
function getExpandedPosition(originalI, originalJ, originalGridWidth, expandedGridHeight) {
  const expandedI = originalI + WATER_ROWS_OFFSET + WALL_PADDING; // Add offset for water rows and top wall
  const expandedJ = originalJ + WALL_PADDING; // Add offset for left wall
  const expandedGridWidth = originalGridWidth + (2 * WALL_PADDING); // Account for left and right walls
  const x = expandedJ * cellSize - (expandedGridWidth * cellSize) / 2;
  const y = -expandedI * cellSize + (expandedGridHeight * cellSize) / 2;
  return { x, y, expandedI, expandedJ };
}

let knight, princess;
let powerUpManager;
let spellEffectManager;
let enemyManager;
let bossManager;
let fightManager;
let environmentManager;
let isAnimating = false;
let zoomLevel = 1;
let cameraPosition = { x: 0, y: 0 };
let isDragging = false;
let lastMousePosition = { x: 0, y: 0 };

// HP Tracking System
let knightCurrentHP = 0;
let knightMaxHP = 0;
let hpNotifications = []; // Array to store active HP notifications

init();

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Add lighting for better 3D model visualization
  const ambientLight = new THREE.AmbientLight(0x404040, 1.0); // Brighter ambient light
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(100, 100, 200);
  directionalLight.castShadow = true;
  // Configure shadow properties for better quality
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  scene.add(directionalLight);
  
  // Add a fill light from the opposite direction
  const fillLight = new THREE.DirectionalLight(0x8080ff, 0.4);
  fillLight.position.set(-100, -100, 100);
  scene.add(fillLight);

  // Calculate dungeon dimensions for proper camera setup (including water rows and walls)
  const originalWidth = dungeonData.input[0].length;
  const originalHeight = dungeonData.input.length;
  const expandedWidth = originalWidth + (2 * WALL_PADDING); // Add walls on left and right
  const expandedHeight = originalHeight + WATER_ROWS_OFFSET + (2 * WALL_PADDING); // Add water rows and walls on top and bottom
  
  const dungeonWidth = expandedWidth * cellSize;
  const expandedDungeonHeight = expandedHeight * cellSize;
  const maxDimension = Math.max(dungeonWidth, expandedDungeonHeight);
  
  // Set up orthographic camera with proper bounds
  const aspect = window.innerWidth / window.innerHeight;
  const cameraSize = maxDimension * 1.2; // Increase padding to zoom out more and show expanded dungeon
  
  camera = new THREE.OrthographicCamera(
    -cameraSize * aspect / 2, cameraSize * aspect / 2,
    cameraSize / 2, -cameraSize / 2,
    0.1, 1000
  );
  camera.position.z = 500;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  document.getElementById('minHp').textContent = `Minimum HP Required: ${dungeonData.min_hp}`;
  document.getElementById('dungeonSize').textContent = `Dungeon Size: ${dungeonData.input.length} x ${dungeonData.input[0].length}`;

  createDungeon(dungeonData.input);
  // createGridLines(dungeonData.input); // Disabled grid lines to show floor textures clearly
  
  // Initialize environment manager
  environmentManager = new EnvironmentManager();
  await environmentManager.initialize(); // Load textures before using them
  
  // Pre-register special final room coordinates before creating floors
  environmentManager.preRegisterSpecialFinalRoom(dungeonData.input, dungeonData.path);
  
  // Create floors (will skip special final room coordinates)
  environmentManager.createFloorsForDungeon(dungeonData.input, cellSize, scene);
  
  await createPrincess(dungeonData.input);
  
  // Initialize power-up manager
  powerUpManager = new PowerUpManager();
  await createPowerUps(dungeonData.input);
  
  // Initialize enemy manager
  enemyManager = new EnemyManager();
  await enemyManager.initialize(scene);
  
  // Initialize boss manager
  bossManager = new BossManager();
  await bossManager.initialize(scene, cellSize);
  
  // Store grid dimensions for enemy positioning (use expanded dimensions with walls)
  scene.userData.gridWidth = dungeonData.input[0].length + (2 * WALL_PADDING);
  scene.userData.gridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
  
  await createEnemies(dungeonData.input);
  
  // Show loading message
  document.getElementById('playBtn').textContent = '🔄 Loading Knight Animations...';
  document.getElementById('playBtn').disabled = true;
  
  // Wait for Knight animations to load before enabling play button
  await createKnight();
  
  // Initialize HP tracking system
  initializeHPTracker();
  
  // Initialize spell effect manager
  spellEffectManager = new SpellEffectManager();
  await spellEffectManager.initialize(scene);
  
  // Initialize fight manager
  fightManager = new FightManager(scene, cellSize);
  
  // Connect knight with spell effect manager
  knight.characterController.setSpellEffectManager(spellEffectManager);
  
  // Sync knight's power-up with power-up manager
  const currentPowerUp = powerUpManager.getCurrentPowerUp();
  knight.characterController.setCurrentPowerUp(currentPowerUp);
  
  // Enable play button once Knight animations are loaded
  document.getElementById('playBtn').textContent = '▶️ Start Rescue';
  document.getElementById('playBtn').disabled = false;
  
  // Add event listeners
  document.getElementById('playBtn').addEventListener('click', startAnimation);
  setupCameraControls();
  
  animate();
}

function createDungeon(grid) {
  // Get expanded matrix from environment manager
  const expandedGrid = environmentManager ? environmentManager.getExpandedMatrix(grid) : grid;
  
  const materialNeutral = new THREE.MeshBasicMaterial({ color: 0x444444, opacity: 0.0, transparent: true });
  const materialPower = new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.0, transparent: true });
  const materialThreat = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.0, transparent: true });
  const materialWater = new THREE.MeshBasicMaterial({ color: 0x0066cc, opacity: 0.0, transparent: true });

  for (let i = 0; i < expandedGrid.length; i++) {
    for (let j = 0; j < expandedGrid[i].length; j++) {
      let val = expandedGrid[i][j];
      let mat;
      
      // Handle different room types
      if (val === -999) {
        mat = materialWater; // Water environment
      } else {
        mat = val === 0 ? materialNeutral : val > 0 ? materialPower : materialThreat;
      }

      let room = new THREE.Mesh(new THREE.BoxGeometry(cellSize, cellSize, 1), mat);
      room.position.x = j * cellSize - (expandedGrid[0].length * cellSize) / 2;
      room.position.y = -i * cellSize + (expandedGrid.length * cellSize) / 2;
      scene.add(room);
    }
  }
}

async function createPowerUps(grid) {
  console.log('🔮 Creating power-ups for power rooms...');
  
  const expandedGridHeight = grid.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
  
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const roomValue = grid[i][j];
      if (roomValue > 0) {
        // Use expanded coordinates for power-up positioning with wall padding
        const expandedPos = getExpandedPosition(i, j, grid[0].length, expandedGridHeight);
        await powerUpManager.createPowerUpForRoom(expandedPos.expandedI, expandedPos.expandedJ, roomValue, cellSize, scene, grid[0].length + (2 * WALL_PADDING), expandedGridHeight);
      }
    }
  }
  
  console.log('✅ Power-ups created successfully!');
}

async function createEnemies(grid) {
  console.log('👻 Creating enemies for threat rooms...');
  
  const expandedGridHeight = grid.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
  const path = dungeonData.path;
  const lastPosition = path[path.length - 1];
  const [finalI, finalJ] = lastPosition;
  const finalRoomValue = grid[finalI][finalJ];
  
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const roomValue = grid[i][j];
      if (roomValue < 0) {
        // Check if this is the final room with a threat
        if (i === finalI && j === finalJ && finalRoomValue < 0) {
          // Special positioning for final room boss (moved one cell left from previous position)
          const expandedFinalI = finalI + WATER_ROWS_OFFSET + WALL_PADDING;
          const expandedFinalJ = finalJ + WALL_PADDING + 4; // Position 4 rooms from the left (one cell left of previous position)
          
          console.log(`👹 Creating final room BOSS at special position [${expandedFinalI}, ${expandedFinalJ}]`);
          await bossManager.createBossForRoom(expandedFinalI, expandedFinalJ, roomValue, cellSize, scene, grid[0].length + (2 * WALL_PADDING), expandedGridHeight, 1); // Boss ID 1
        } else {
          // Use standard positioning for regular threat rooms
          const expandedPos = getExpandedPosition(i, j, grid[0].length, expandedGridHeight);
          await enemyManager.createEnemyForRoom(expandedPos.expandedI, expandedPos.expandedJ, roomValue, cellSize, scene, grid[0].length + (2 * WALL_PADDING), expandedGridHeight);
        }
      }
    }
  }

  // Log enemy distribution
  const enemyStats = enemyManager.getEnemyCountByType();
  console.log('✅ Enemies created successfully!');
  console.log('📊 Enemy Distribution:', enemyStats);
}function createGridLines(grid) {
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true });
  
  // Horizontal lines
  for (let i = 0; i <= grid.length; i++) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-(grid[0].length * cellSize) / 2, -i * cellSize + (grid.length * cellSize) / 2, 2),
      new THREE.Vector3((grid[0].length * cellSize) / 2, -i * cellSize + (grid.length * cellSize) / 2, 2)
    ]);
    const line = new THREE.Line(geometry, lineMaterial);
    scene.add(line);
  }
  
  // Vertical lines
  for (let j = 0; j <= grid[0].length; j++) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(j * cellSize - (grid[0].length * cellSize) / 2, (grid.length * cellSize) / 2, 2),
      new THREE.Vector3(j * cellSize - (grid[0].length * cellSize) / 2, -(grid.length * cellSize) / 2, 2)
    ]);
    const line = new THREE.Line(geometry, lineMaterial);
    scene.add(line);
  }
}

async function createPrincess(grid) {
  console.log('👸 createPrincess function called');
  
  // Place princess at the end of the path
  const path = dungeonData.path;
  const lastPosition = path[path.length - 1];
  const [i, j] = lastPosition;
  const finalRoomValue = grid[i][j];
  
  console.log('👸 Princess path info:', { path, lastPosition, finalRoomValue });
  console.log('👸 About to call createSpecialFinalRoom...');
  
  // Create special final room environment
  const specialRoom = await environmentManager.createSpecialFinalRoom(grid, cellSize, scene, path);
  
  console.log('👸 Special room result:', specialRoom);
  
  // Create the animated princess
  const animatedPrincess = new AnimatedPrincess(cellSize);
  
  try {
    console.log('👸 Loading princess animations...');
    await animatedPrincess.initialize();
    
    princess = animatedPrincess.getObject3D();
    princess.princessController = animatedPrincess; // Store reference for updates
    
    // Position princess at the right end of the special final room
    const expandedGridHeight = grid.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
    const expandedGridWidth = grid[0].length + (2 * WALL_PADDING);
    
    if (specialRoom) {
      // Place princess at the rightmost part of the special final room, moved one cell left
      const princessJ = specialRoom.finalJ + specialRoom.finalRoomWidth - 2; // One cell left from rightmost
      const princessX = princessJ * cellSize - (expandedGridWidth * cellSize) / 2;
      const princessY = -specialRoom.finalI * cellSize + (expandedGridHeight * cellSize) / 2 + 10; // Slightly above the floor
      
      princess.position.x = princessX;
      princess.position.y = princessY;
      princess.position.z = 15; // Same Z level as knight
      
      console.log(`👸 Princess positioned at special final room: (${princessX}, ${princessY})`);
    } else {
      // Fallback to original positioning
      const expandedPos = getExpandedPosition(i, j, grid[0].length, expandedGridHeight);
      princess.position.x = expandedPos.x;
      princess.position.y = expandedPos.y;
      princess.position.z = 15;
    }
    
    scene.add(princess);
    console.log('✅ Animated princess created successfully!');
    
  } catch (error) {
    console.error('❌ Failed to load animated princess:', error);
    
    // Fallback to original triangle if sprite fails to load
    console.log('Using fallback geometry for princess');
    princess = new THREE.Mesh(
      new THREE.ConeGeometry(cellSize / 3, cellSize / 2, 8),
      new THREE.MeshBasicMaterial({ color: 0xff69b4 })
    );
    
    // Use same positioning logic as above
    const expandedGridHeight = grid.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
    const expandedGridWidth = grid[0].length + (2 * WALL_PADDING);
    
    if (specialRoom) {
      const princessJ = specialRoom.finalJ + specialRoom.finalRoomWidth - 2; // One cell left from rightmost  
      const princessX = princessJ * cellSize - (expandedGridWidth * cellSize) / 2;
      const princessY = -specialRoom.finalI * cellSize + (expandedGridHeight * cellSize) / 2;
      
      princess.position.x = princessX;
      princess.position.y = princessY;
      princess.position.z = 10;
    } else {
      const expandedPos = getExpandedPosition(i, j, grid[0].length, expandedGridHeight);
      princess.position.x = expandedPos.x;
      princess.position.y = expandedPos.y;
      princess.position.z = 10;
    }
    
    scene.add(princess);
    console.log('Using fallback princess geometry');
    scene.add(princess);
    console.log('Using fallback princess geometry');
  }
}

async function createKnight() {
  // Create the Directional Sprite Knight character
  const directionalKnight = new DirectionalSpriteKnight();
  
  try {
    console.log('Loading directional knight sprites...');
    // Load all directional animations
    await directionalKnight.loadAllAnimations();
    
    knight = directionalKnight.getObject3D();
    console.log('Directional knight sprite created:', knight);
    
    // Position knight one row above the door cell, facing Front
    // Door is at position (6, 1) in expanded matrix, so knight starts at (5, 1)
    const doorRow = WATER_ROWS_OFFSET; // 6 (where door is placed)
    const doorCol = 1; // First column after left wall
    const knightStartRow = doorRow - 1; // One row above door
    const knightStartCol = doorCol; // Same column as door
    
    // Get expanded grid dimensions
    const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
    const expandedGridWidth = dungeonData.input[0].length + (2 * WALL_PADDING);
    
    // Calculate knight's starting position
    const knightX = knightStartCol * cellSize - (expandedGridWidth * cellSize) / 2;
    const knightY = -knightStartRow * cellSize + (expandedGridHeight * cellSize) / 2;
    
    knight.position.x = knightX;
    knight.position.y = knightY;
    knight.position.z = 15;
    
    // Store the character controller and positions for animations
    knight.characterController = directionalKnight;
    
    // Set initial Front orientation
    knight.characterController.goIdle('Front');
    
    // Calculate target position (first room of original matrix)
    const path = dungeonData.path;
    const [startI, startJ] = path[0];
    const expandedPos = getExpandedPosition(startI, startJ, dungeonData.input[0].length, expandedGridHeight);
    knight.startingPosition = { x: expandedPos.x, y: expandedPos.y, z: 15 };
    
    // Store intermediate position (door position) for the entrance sequence
    const doorX = doorCol * cellSize - (expandedGridWidth * cellSize) / 2;
    const doorY = -doorRow * cellSize + (expandedGridHeight * cellSize) / 2;
    knight.doorPosition = { x: doorX, y: doorY, z: 15 };
    
    scene.add(knight);
    
    console.log('Directional knight sprite loaded and added to scene successfully!');
    console.log('Knight entrance position:', knight.position);
    console.log('Knight target position:', knight.startingPosition);
  } catch (error) {
    console.error('Failed to load Directional Knight sprite:', error);
    
    // Fallback to a simple geometry if sprite fails to load
    console.log('Using fallback geometry for knight');
    knight = new THREE.Mesh(
      new THREE.CylinderGeometry(cellSize / 3, cellSize / 3, cellSize / 2, 8),
      new THREE.MeshPhongMaterial({ 
        color: 0x4169E1,
        emissive: 0x111111 // Add slight glow to fallback
      })
    );
    
    const path = dungeonData.path;
    const [i, j] = path[0];
    
    // Get expanded grid dimensions
    const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
    const expandedPos = getExpandedPosition(i, j, dungeonData.input[0].length, expandedGridHeight);
    
    knight.position.x = expandedPos.x;
    knight.position.y = expandedPos.y;
    knight.position.z = 10;
    
    scene.add(knight);
    console.log('Using fallback knight geometry');
  }
}

// HP Tracking System Functions
function initializeHPTracker() {
  // Initialize knight's HP from dungeon data
  knightMaxHP = dungeonData.min_hp;
  knightCurrentHP = knightMaxHP;
  
  console.log(`🏥 Knight HP initialized: ${knightCurrentHP}/${knightMaxHP}`);
  
  // Update UI display
  updateHPDisplay();
}

function updateHPDisplay() {
  // Update HP in UI if there's an HP display element
  const hpDisplay = document.getElementById('knightHP');
  if (hpDisplay) {
    hpDisplay.textContent = `HP: ${knightCurrentHP}/${knightMaxHP}`;
  }
}

function updateKnightHP(hpChange, roomValue) {
  // Update current HP
  knightCurrentHP += hpChange;
  
  // Ensure HP doesn't go below 0
  if (knightCurrentHP < 0) {
    knightCurrentHP = 0;
  }
  
  console.log(`🏥 Knight HP updated: ${hpChange > 0 ? '+' : ''}${hpChange} = ${knightCurrentHP}/${knightMaxHP}`);
  
  // Update display
  updateHPDisplay();
  
  // Show HP notification
  showHPNotification(hpChange, roomValue);
  
  // Check for game over
  if (knightCurrentHP <= 0) {
    console.log('💀 Knight has died!');
    // Could add game over logic here
  }
}

function showHPNotification(hpChange, roomValue) {
  if (!knight) return;
  
  // Create text sprite for HP notification
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 128;
  
  // Set up text style
  context.font = 'Bold 48px Arial';
  context.textAlign = 'center';
  
  // Choose color based on HP change
  const isPositive = hpChange > 0;
  context.fillStyle = isPositive ? '#00ff00' : '#ff0000'; // Green for positive, red for negative
  
  // Draw text with room value (show actual value with proper sign)
  const text = `${isPositive ? '+' : ''}${roomValue}`;
  context.fillText(text, 128, 80);
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  
  // Create sprite material
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1.0
  });
  
  // Create sprite
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(cellSize * 0.8, cellSize * 0.4, 1);
  
  // Position sprite above the knight
  sprite.position.set(
    knight.position.x + (Math.random() - 0.5) * cellSize * 0.3, // Small random offset
    knight.position.y + cellSize * 0.8,
    knight.position.z + 10
  );
  
  scene.add(sprite);
  
  // Animate the notification
  const startTime = Date.now();
  const duration = 2000; // 2 seconds
  const startY = sprite.position.y;
  const targetY = startY + cellSize * 0.5; // Float upwards
  
  function animateNotification() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;
    
    if (progress < 1) {
      // Move upwards and fade out
      sprite.position.y = startY + (targetY - startY) * progress;
      sprite.material.opacity = 1 - progress;
      
      requestAnimationFrame(animateNotification);
    } else {
      // Remove sprite when animation is complete
      scene.remove(sprite);
      sprite.material.dispose();
      sprite.material.map.dispose();
      
      // Remove from notifications array
      const index = hpNotifications.indexOf(sprite);
      if (index > -1) {
        hpNotifications.splice(index, 1);
      }
    }
  }
  
  // Store reference and start animation
  hpNotifications.push(sprite);
  animateNotification();
}

function resetHPTracker() {
  // Clear all active notifications
  hpNotifications.forEach(sprite => {
    scene.remove(sprite);
    sprite.material.dispose();
    sprite.material.map.dispose();
  });
  hpNotifications = [];
  
  // Reset HP to initial values
  knightCurrentHP = knightMaxHP;
  updateHPDisplay();
  
  console.log('🏥 HP Tracker reset');
}

// Enemy Tracking System Functions
function showCurrentEnemy(enemy, roomValue) {
  console.log('👻 Showing current enemy in tracker');
  
  // Show the enemy tracker
  document.getElementById('currentEnemy').style.display = 'block';
  document.getElementById('emptyEnemySlot').style.display = 'none';
  
  // Extract first frame from enemy's Three.js texture
  extractEnemyIcon(enemy);
  
  // Set enemy name (use the name attribute from the enemy)
  const enemyName = enemy.name || 'Unknown';
  document.getElementById('enemyName').textContent = enemyName;
  
  // Set enemy damage (use absolute value of room value as enemy damage)
  const enemyDamage = Math.abs(roomValue);
  document.getElementById('enemyDMG').textContent = `DMG: ${enemyDamage}`;
  
  const enemyType = getEnemyTypeFromInstance(enemy);
  const enemySubType = getEnemySubTypeFromInstance(enemy);
  console.log(`👻 Enemy tracker updated: ${enemyName} (${enemyType} ${enemySubType}) with ${enemyDamage} DMG`);
}

function extractEnemyIcon(enemy) {
  // Wait for enemy sprite to be loaded, then extract first frame
  if (enemy.sprite && enemy.sprite.material && enemy.sprite.material.map) {
    const texture = enemy.sprite.material.map;
    if (texture.image && texture.image.complete) {
      // Create a canvas to extract the first frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Get frame information from the enemy instance
      const framesPerRow = enemy.framesPerRow || enemy.animationFrames?.idle || 4; // Use enemy's framesPerRow or idle frames as fallback
      const totalRows = 4; // All enemies have 4 rows for directions
      
      // Calculate frame dimensions
      const frameWidth = texture.image.width / framesPerRow;
      const frameHeight = texture.image.height / totalRows;
      
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      
      try {
        // Draw the first frame (top-left corner)
        ctx.drawImage(
          texture.image,
          0, 0, frameWidth, frameHeight, // Source: first frame
          0, 0, frameWidth, frameHeight  // Destination: entire canvas
        );
        
        // Convert canvas to data URL and set as enemy icon
        const dataURL = canvas.toDataURL();
        const enemyIcon = document.getElementById('enemyIcon');
        enemyIcon.src = dataURL;
        enemyIcon.alt = 'Enemy';
        
        console.log(`👻 Successfully extracted enemy icon from texture (${framesPerRow} columns, ${totalRows} rows)`);
      } catch (error) {
        console.warn('⚠️ Failed to extract enemy icon from texture, using fallback', error);
        useEnemyIconFallback(enemy);
      }
    } else {
      // Image not ready yet, try again
      setTimeout(() => extractEnemyIcon(enemy), 100);
    }
  } else {
    // Sprite not ready yet, try again
    setTimeout(() => extractEnemyIcon(enemy), 100);
  }
}

function useEnemyIconFallback(enemy) {
  // Fallback: use the asset path directly
  const enemyType = getEnemyTypeFromInstance(enemy);
  const enemySubType = getEnemySubTypeFromInstance(enemy);
  
  let iconPath;
  if (enemyType === 'boss') {
    iconPath = `./assets/boss/${enemySubType}/Idle1.png`;
  } else {
    iconPath = `./assets/enemies/${enemyType}/${enemySubType}/idle/full.png`;
  }
  
  const enemyIcon = document.getElementById('enemyIcon');
  enemyIcon.src = iconPath;
  enemyIcon.alt = `${enemyType} ${enemySubType}`;
  
  console.log(`👻 Using fallback icon path: ${iconPath}`);
}

function hideCurrentEnemy() {
  console.log('👻 Hiding current enemy from tracker');
  
  // Hide the enemy tracker
  document.getElementById('currentEnemy').style.display = 'none';
  document.getElementById('emptyEnemySlot').style.display = 'flex';
}

function getEnemyTypeFromInstance(enemy) {
  // Determine enemy type from the enemy instance
  if (enemy.constructor.name.includes('Boss')) return 'boss';
  if (enemy.constructor.name.includes('Ghost')) return 'ghost';
  if (enemy.constructor.name.includes('Beholder')) return 'beholder';
  if (enemy.constructor.name.includes('Demon')) return 'demon';
  if (enemy.constructor.name.includes('Lich')) return 'lich';
  return 'ghost'; // Default fallback
}

function getEnemySubTypeFromInstance(enemy) {
  // Get the sub-type number from the enemy instance
  if (enemy.bossId) return enemy.bossId;
  if (enemy.ghostType) return enemy.ghostType;
  if (enemy.beholderType) return enemy.beholderType;
  if (enemy.demonType) return enemy.demonType;
  if (enemy.lichType) return enemy.lichType;
  return '1'; // Default fallback
}

function resetEnemyTracker() {
  hideCurrentEnemy();
  console.log('👻 Enemy Tracker reset');
}

function startAnimation() {
  if (isAnimating) return;
  
  isAnimating = true;
  document.getElementById('playBtn').disabled = true;
  document.getElementById('playBtn').textContent = '⏳ Rescue in Progress...';
  
  // Reset HP tracker
  resetHPTracker();
  
  // Reset enemy tracker
  resetEnemyTracker();
  
  // Reset knight to initial state (facing Front) and position
  if (knight.characterController) {
    knight.characterController.resetToInitialState();
    knight.characterController.goIdle('Front');
  }
  
  // Reset power-up manager
  powerUpManager.clearInventory();
  
  // Reset floors
  if (environmentManager) {
    environmentManager.clearFloors(scene);
    // Pre-register special final room coordinates again before recreating floors
    environmentManager.preRegisterSpecialFinalRoom(dungeonData.input, dungeonData.path);
    environmentManager.createFloorsForDungeon(dungeonData.input, cellSize, scene);
    // Reset door animation
    environmentManager.resetDoorAnimation();
  }
  
  // Reset power-ups (recreate them)
  powerUpManager.dispose();
  powerUpManager = new PowerUpManager();
  createPowerUps(dungeonData.input);
  
  // Reset enemies (recreate them)
  enemyManager.removeFromScene(scene);
  enemyManager.dispose();
  enemyManager = new EnemyManager();
  enemyManager.initialize(scene, cellSize);
  
  // Reset bosses (recreate them)
  bossManager.removeFromScene(scene);
  bossManager.dispose();
  bossManager = new BossManager();
  bossManager.initialize(scene, cellSize);
  
  // Reset fight manager
  if (fightManager) {
    fightManager.dispose();
  }
  fightManager = new FightManager(scene, cellSize);
  
  // Restore grid dimensions for enemy positioning (use expanded dimensions with walls)
  scene.userData.gridWidth = dungeonData.input[0].length + (2 * WALL_PADDING);
  scene.userData.gridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
  
  createEnemies(dungeonData.input);
  
  // Reset knight's power-up
  if (knight.characterController) {
    knight.characterController.setCurrentPowerUp(null);
  }
  
  // Position knight one row above the door cell, facing Front
  // Door is at position (6, 1) in expanded matrix, so knight starts at (5, 1)
  const doorRow = WATER_ROWS_OFFSET; // 6 (where door is placed)
  const doorCol = 1; // First column after left wall
  const knightStartRow = doorRow - 1; // One row above door
  const knightStartCol = doorCol; // Same column as door
  
  // Get expanded grid dimensions
  const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
  const expandedGridWidth = dungeonData.input[0].length + (2 * WALL_PADDING);
  
  // Calculate knight's starting position
  const knightX = knightStartCol * cellSize - (expandedGridWidth * cellSize) / 2;
  const knightY = -knightStartRow * cellSize + (expandedGridHeight * cellSize) / 2;
  
  knight.position.x = knightX;
  knight.position.y = knightY;
  knight.position.z = 15;
  
  // Calculate target position (first room of original matrix)
  const path = dungeonData.path;
  const [startI, startJ] = path[0];
  const expandedPos = getExpandedPosition(startI, startJ, dungeonData.input[0].length, expandedGridHeight);
  knight.startingPosition = { x: expandedPos.x, y: expandedPos.y, z: 15 };
  
  // Store intermediate position (door position) for the entrance sequence
  const doorX = doorCol * cellSize - (expandedGridWidth * cellSize) / 2;
  const doorY = -doorRow * cellSize + (expandedGridHeight * cellSize) / 2;
  knight.doorPosition = { x: doorX, y: doorY, z: 15 };
  
  // Start entrance animation
  animateEntrance();
}

function animateEntrance() {
  console.log('🚪 Knight starting entrance sequence...');
  
  // Reset knight to face Front initially
  if (knight.characterController) {
    knight.characterController.resetToInitialState();
    knight.characterController.goIdle('Front');
  }
  
  // Stage 1: Move from current position to door position (moving down, facing Front)
  animateToPosition(
    knight.doorPosition,
    'Front',
    800,
    () => {
      console.log('🚪 Knight reached door position, moving to first room...');
      
      // Stage 2: Move from door position to starting room (still facing Front)
      animateToPosition(
        knight.startingPosition,
        'Front',
        800,
        () => {
          console.log('🚪 Knight reached starting room - triggering door animation!');
          
          // Now start door closing animation when knight reaches the first room
          if (environmentManager) {
            environmentManager.startDoorAnimation();
          }
          
          // Brief pause before starting the main path
          setTimeout(() => {
            animatePath();
          }, 500);
        }
      );
    }
  );
}

// Helper function to animate knight to a specific position
function animateToPosition(targetPosition, direction, duration, onComplete) {
  // Start movement animation in the specified direction
  if (knight.characterController) {
    knight.characterController.startRunning(direction);
  }
  
  const startX = knight.position.x;
  const startY = knight.position.y;
  const startTime = Date.now();
  
  function animateMove() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-in-out animation
    const easeProgress = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    knight.position.x = startX + (targetPosition.x - startX) * easeProgress;
    knight.position.y = startY + (targetPosition.y - startY) * easeProgress;
    knight.position.z = targetPosition.z + Math.sin(progress * Math.PI) * 2;
    
    if (progress < 1) {
      requestAnimationFrame(animateMove);
    } else {
      // Movement complete
      knight.position.x = targetPosition.x;
      knight.position.y = targetPosition.y;
      knight.position.z = targetPosition.z;
      
      if (onComplete) {
        onComplete();
      }
    }
  }
  
  animateMove();
}

function animatePath() {
  const path = dungeonData.path;
  let step = 0;

  function moveKnight() {
    if (step < path.length) {
      const [i, j] = path[step];
      
      // Check if entering a room (non-zero value)
      const roomValue = dungeonData.input[i][j];
      const isEnteringRoom = roomValue !== 0;
      const isThreatRoom = roomValue < 0;
      
      // Determine movement direction based on path
      let direction = 'Front'; // Default to Front for first movement and vertical movements
      if (step > 0) {
        const prevPos = path[step - 1];
        direction = knight.characterController.getDirectionFromMovement(prevPos, [i, j]);
        
        // Override direction logic to prefer Front for vertical movements
        const deltaI = i - prevPos[0]; // Positive = moving down, Negative = moving up
        const deltaJ = j - prevPos[1]; // Positive = moving right, Negative = moving left
        
        if (Math.abs(deltaI) > Math.abs(deltaJ)) {
          // Vertical movement is dominant, use Front
          direction = 'Front';
        } else if (deltaJ > 0) {
          // Horizontal movement to the right
          direction = 'Right';
        } else if (deltaJ < 0) {
          // Horizontal movement to the left, use Front (since we don't have Left)
          direction = 'Front';
        }
      }
      
      // Start running animation for movement in the determined direction
      if (knight.characterController) {
        knight.characterController.startRunning(direction);
      }
      
      // Animate knight movement
      const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
      const expandedPos = getExpandedPosition(i, j, dungeonData.input[0].length, expandedGridHeight);
      const targetX = expandedPos.x;
      const targetY = expandedPos.y;
      
      // Smooth movement animation
      const startX = knight.position.x;
      const startY = knight.position.y;
      const duration = 400; // ms
      const startTime = Date.now();
      
      function animateMove() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-in-out animation
        const easeProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        knight.position.x = startX + (targetX - startX) * easeProgress;
        knight.position.y = startY + (targetY - startY) * easeProgress;
        
        // Add a very subtle bounce effect
        knight.position.z = 15 + Math.sin(progress * Math.PI) * 2;
        
        if (progress < 1) {
          requestAnimationFrame(animateMove);
        } else {
          // Movement complete
          step++;
          
          // Mark the previous cell as visited (if there was a previous step)
          if (step > 1) {
            const [prevI, prevJ] = path[step - 2];
            if (environmentManager) {
              const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
              const expandedPrevPos = getExpandedPosition(prevI, prevJ, dungeonData.input[0].length, expandedGridHeight);
              environmentManager.markCellAsVisited(
                expandedPrevPos.expandedI, 
                expandedPrevPos.expandedJ, 
                cellSize, 
                scene, 
                dungeonData.input[0].length + (2 * WALL_PADDING), 
                expandedGridHeight
              );
            }
          }
          
          // Handle room entry
          if (isEnteringRoom) {
            console.log(`🏠 Knight entered room with value: ${roomValue}`);
            
            // Convert original coordinates to expanded coordinates for enemy system (including wall padding)
            const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
            const expandedPos = getExpandedPosition(i, j, dungeonData.input[0].length, expandedGridHeight);
            
            // For power rooms (positive values), update HP immediately
            if (!isThreatRoom) {
              updateKnightHP(roomValue, roomValue);
            }
            
            // Notify enemy manager if entering a threat room
            if (isThreatRoom) {
              enemyManager.onKnightEntersRoom(expandedPos.expandedI, expandedPos.expandedJ, direction);
            }
            
            if (isThreatRoom) {
              // Threat room - check for enemy and start fight
              console.log('⚔️ Threat room detected - checking for enemy!');
              
              const enemy = enemyManager.getEnemyAt(expandedPos.expandedI, expandedPos.expandedJ);
              
              if (enemy && !enemy.isDead) {
                console.log(`👻 Knight encounters enemy at expanded coordinates (${expandedPos.expandedI}, ${expandedPos.expandedJ})! Original: (${i}, ${j})`);
                
                // Show enemy in tracker
                showCurrentEnemy(enemy, roomValue);
                
                // Start fight
                fightManager.startFight(
                  knight.characterController,
                  enemy,
                  direction,
                  () => {
                    // Fight completed callback
                    enemy.isDead = true;
                    console.log(`✅ Fight completed! Enemy defeated.`);
                    
                    // Hide enemy from tracker
                    hideCurrentEnemy();
                    
                    // Continue movement after fight
                    setTimeout(() => {
                      knight.characterController.goIdle(direction);
                      setTimeout(() => {
                        moveKnight(); // Continue after fight
                      }, 1000);
                    }, 500);
                  },
                  () => {
                    // First enemy attack completed callback - trigger HP notification
                    updateKnightHP(roomValue, roomValue);
                  }
                );
              } else {
                // No enemy or already dead - just continue but still apply HP damage
                updateKnightHP(roomValue, roomValue);
                
                knight.characterController.goIdle(direction);
                setTimeout(() => {
                  moveKnight(); // Continue after pause
                }, 1000);
              }
              
            } else {
              // Power room - collect power-up and idle
              console.log('💪 Power room detected - collecting power-up');
              
              // Convert original coordinates to expanded coordinates for power-up system (including wall padding)
              const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
              const expandedPos = getExpandedPosition(i, j, dungeonData.input[0].length, expandedGridHeight);
              
              // Collect power-up
              const collectedPowerUp = powerUpManager.collectPowerUp(expandedPos.expandedI, expandedPos.expandedJ);
              
              if (collectedPowerUp) {
                console.log(`💎 Collected power-up at expanded coordinates (${expandedPos.expandedI}, ${expandedPos.expandedJ})! Original: (${i}, ${j})`);
                // Update knight's current power-up
                knight.characterController.setCurrentPowerUp(collectedPowerUp);
                
                // Celebration animation
                knight.characterController.celebratePowerUp(direction);
                
                // Pause for celebration then continue
                setTimeout(() => {
                  knight.characterController.goIdle(direction);
                  setTimeout(() => {
                    moveKnight(); // Continue after pause
                  }, 1500);
                }, 800);
              } else {
                // No power-up to collect, just idle
                knight.characterController.goIdle(direction);
                setTimeout(() => {
                  moveKnight(); // Continue after pause
                }, 2000);
              }
            }
          } else {
            // Normal pause between moves (corridor movement)
            setTimeout(moveKnight, 200);
          }
        }
      }
      
      animateMove();
    } else {
      // Animation complete - mark final cell as visited and start special final room sequence
      if (path.length > 0) {
        const [finalI, finalJ] = path[path.length - 1];
        if (environmentManager) {
          const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
          const expandedFinalPos = getExpandedPosition(finalI, finalJ, dungeonData.input[0].length, expandedGridHeight);
          environmentManager.markCellAsVisited(
            expandedFinalPos.expandedI, 
            expandedFinalPos.expandedJ, 
            cellSize, 
            scene, 
            dungeonData.input[0].length + (2 * WALL_PADDING), 
            expandedGridHeight
          );
        }
        
        // Start special final room sequence: turn right and move into special room
        startFinalRoomSequence();
      } else {
        // Fallback if no path
        setTimeout(() => {
          document.getElementById('playBtn').disabled = false;
          document.getElementById('playBtn').textContent = '🔄 Restart Rescue Mission';
          isAnimating = false;
        }, 1000);
      }
    }
  }

  moveKnight();
}

// Special final room sequence
function startFinalRoomSequence() {
  console.log('🏰 Starting special final room sequence...');
  
  // Get final room value to determine if it's a threat room
  const path = dungeonData.path;
  const [finalI, finalJ] = path[path.length - 1];
  const finalRoomValue = dungeonData.input[finalI][finalJ];
  const isThreatRoom = finalRoomValue < 0;
  
  console.log(`🏰 Final room value: ${finalRoomValue}, is threat room: ${isThreatRoom}`);
  
  // Step 1: Turn knight to face Right
  if (knight.characterController) {
    knight.characterController.goIdle('Right');
  }
  
  // Step 2: After a brief pause, start moving right into the special room
  setTimeout(() => {
    if (knight.characterController) {
      knight.characterController.startRunning('Right');
    }
    
    // Calculate target position: 2 cells to the right
    const targetX = knight.position.x + (cellSize * 2);
    const targetY = knight.position.y;
    
    // Animate movement to special room
    animateToPosition(
      { x: targetX, y: targetY, z: 15 },
      'Right',
      1000, // 1 second movement
      () => {
        console.log('🏰 Knight reached special final room position');
        
        // Stop at idle position
        if (knight.characterController) {
          knight.characterController.goIdle('Right');
        }
        
        // Branch based on room type
        if (isThreatRoom) {
          // Threat room: Start queen blessing sequence (leads to boss fight)
          setTimeout(() => {
            startQueenBlessing();
          }, 500);
        } else {
          // Non-threat room: Go directly to princess (treasure room)
          setTimeout(() => {
            moveKnightToPrincess();
          }, 500);
        }
      }
    );
  }, 500);
}

// Queen blessing system
function startQueenBlessing() {
  console.log('👑 Starting queen blessing sequence...');
  
  // Start queen blessing animation
  if (princess && princess.princessController) {
    princess.princessController.startBlessingAnimation();
  }
  
  // Show blessing dialog after animation completes
  setTimeout(() => {
    showBlessingDialog();
  }, 2000); // Adjust timing based on animation length
}

function showBlessingDialog() {
  // Create blessing dialog
  const dialog = document.createElement('div');
  dialog.className = 'blessing-dialog';
  dialog.innerHTML = `
    <div class="dialog-content">
      <div class="dialog-text">
        <strong>Queen:</strong> I give you my bless my brave knight!
      </div>
      <button id="blessingNextBtn" class="dialog-button">Next</button>
    </div>
  `;
  
  // Add styling
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 20px;
    border-radius: 10px;
    border: 2px solid gold;
    z-index: 1000;
    font-family: Arial, sans-serif;
    text-align: center;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  `;
  
  const content = dialog.querySelector('.dialog-content');
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: center;
  `;
  
  const button = dialog.querySelector('#blessingNextBtn');
  button.style.cssText = `
    padding: 10px 20px;
    background: gold;
    color: black;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    font-size: 16px;
  `;
  
  button.addEventListener('click', () => {
    document.body.removeChild(dialog);
    grantRandomBlessing();
  });
  
  document.body.appendChild(dialog);
}

function grantRandomBlessing() {
  const blessings = ["Phoenix", "Kraken", "Void"];
  const chosenBlessing = blessings[Math.floor(Math.random() * blessings.length)];
  
  console.log(`👑 Queen grants ${chosenBlessing} blessing!`);
  
  // Reset queen to idle animation
  if (princess && princess.princessController) {
    princess.princessController.goIdle();
  }
  
  // Set the special power-up based on blessing
  const specialPowerUp = createSpecialPowerUp(chosenBlessing);
  
  // Update knight's current power-up
  if (knight.characterController) {
    knight.characterController.setCurrentPowerUp(specialPowerUp);
  }
  
  // Update power-up tracker display
  powerUpManager.setCurrentPowerUp(specialPowerUp);
  
  // Start boss fight sequence
  setTimeout(() => {
    startBossFight();
  }, 1000);
}

function createSpecialPowerUp(blessingType) {
  const powerUpData = {
    type: blessingType.toLowerCase(),
    name: `Queen's ${blessingType} Blessing`,
    damage: 50, // Special high damage for queen's blessing
    isQueenBlessing: true
  };
  
  // Set icon based on blessing type
  switch (blessingType) {
    case "Phoenix":
      powerUpData.iconPath = './assets/queen_blesses/Phoenix/phoenix_10.png';
      powerUpData.animationPath = './assets/queen_blesses/Phoenix/';
      powerUpData.frameCount = 16;
      break;
    case "Kraken":
      powerUpData.iconPath = './assets/queen_blesses/Kraken/9.png';
      powerUpData.animationPath = './assets/queen_blesses/Kraken/';
      powerUpData.frameCount = 19;
      break;
    case "Void":
      powerUpData.iconPath = './assets/queen_blesses/Plague/Smoke_scull13.png';
      powerUpData.animationPath = './assets/queen_blesses/Plague/';
      powerUpData.frameCount = 20;
      break;
  }
  
  return powerUpData;
}

function startBossFight() {
  console.log('⚔️ Starting boss fight sequence...');
  
  // Find the final boss
  const path = dungeonData.path;
  const [finalI, finalJ] = path[path.length - 1];
  
  // Get the actual boss damage from the last room value in original dungeon
  const bossDamage = dungeonData.input[finalI][finalJ]; // This will be negative (e.g., -15)
  const absBossDamage = Math.abs(bossDamage); // Convert to positive for damage calculation
  
  const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
  const expandedFinalI = finalI + WATER_ROWS_OFFSET + WALL_PADDING;
  const expandedFinalJ = finalJ + WALL_PADDING + 4; // Same position as created in createEnemies
  
  const boss = bossManager.getBossAt(expandedFinalI, expandedFinalJ);
  
  if (boss && !boss.isDead) {
    console.log(`👹 Boss found, starting 5-round fight! Boss damage: ${absBossDamage}`);
    
    // Show boss in tracker with actual boss damage
    showCurrentEnemy(boss, bossDamage); // Use original negative value for display
    
    // Start special boss fight (5 rounds)
    fightManager.startBossFight(
      knight.characterController,
      boss,
      'Right',
      5, // 5 rounds
      () => {
        // Boss fight completed callback
        showBossDefeatDialog(boss);
      },
      () => {
        // First boss attack completed callback - trigger HP notification ONCE
        updateKnightHP(bossDamage, bossDamage); // Use actual boss damage value
      }
    );
  } else {
    console.warn('⚠️ Boss not found, skipping boss fight');
    completeFinalSequence();
  }
}

function showBossDefeatDialog(boss) {
  // Create boss defeat dialog
  const dialog = document.createElement('div');
  dialog.className = 'boss-defeat-dialog';
  
  // Get boss icon (same as enemy tracker)
  const bossIconSrc = document.getElementById('enemyIcon').src;
  
  dialog.innerHTML = `
    <div class="dialog-content">
      <img src="${bossIconSrc}" alt="Boss" style="width: 64px; height: 64px; image-rendering: pixelated;">
      <div class="dialog-text">
        <strong>Boss:</strong> Finally a worthy opponent...
      </div>
      <button id="bossDefeatNextBtn" class="dialog-button">Next</button>
    </div>
  `;
  
  // Add styling
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 20px;
    border-radius: 10px;
    border: 2px solid red;
    z-index: 1000;
    font-family: Arial, sans-serif;
    text-align: center;
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
  `;
  
  const content = dialog.querySelector('.dialog-content');
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: center;
  `;
  
  const button = dialog.querySelector('#bossDefeatNextBtn');
  button.style.cssText = `
    padding: 10px 20px;
    background: red;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    font-size: 16px;
  `;
  
  button.addEventListener('click', () => {
    document.body.removeChild(dialog);
    
    // Mark boss as dead and play death animation
    boss.isDead = true;
    
    // Hide enemy from tracker
    hideCurrentEnemy();
    
    // Play boss death animation and wait for it to complete
    if (boss.playDeathAnimation) {
      console.log('💀 Playing boss death animation...');
      
      // Play death animation and wait for completion
      boss.playDeathAnimation().then(() => {
        console.log('💀 Boss death animation completed - removing from scene');
        
        // Remove boss from scene after death animation completes
        if (boss.removeFromScene) {
          boss.removeFromScene();
        }
        
        // Move knight closer to princess after boss is removed
        setTimeout(() => {
          moveKnightToPrincess();
        }, 500);
      }).catch((error) => {
        console.error('❌ Error during boss death animation:', error);
        
        // Fallback: still remove boss and continue
        if (boss.removeFromScene) {
          boss.removeFromScene();
        }
        
        setTimeout(() => {
          moveKnightToPrincess();
        }, 500);
      });
    } else {
      // No death animation available, just remove and continue
      console.log('⚠️ No death animation available for boss, removing immediately');
      
      if (boss.removeFromScene) {
        boss.removeFromScene();
      }
      
      setTimeout(() => {
        moveKnightToPrincess();
      }, 500);
    }
  });
  
  document.body.appendChild(dialog);
}

function moveKnightToPrincess() {
  console.log('💖 Moving knight to princess...');
  
  // Calculate princess position (she should be one cell to the right of current knight position)
  const targetX = knight.position.x + cellSize;
  const targetY = knight.position.y;
  
  // Animate knight movement to princess
  if (knight.characterController) {
    knight.characterController.startRunning('Right');
  }
  
  animateToPosition(
    { x: targetX, y: targetY, z: 15 },
    'Right',
    800,
    () => {
      // Knight reached princess, go idle
      if (knight.characterController) {
        knight.characterController.goIdle('Right');
      }
      
      // Show queen's thanks dialog
      setTimeout(() => {
        showQueenThanksDialog();
      }, 500);
    }
  );
}

function showQueenThanksDialog() {
  // Create queen thanks dialog
  const dialog = document.createElement('div');
  dialog.className = 'queen-thanks-dialog';
  dialog.innerHTML = `
    <div class="dialog-content">
      <div class="dialog-text">
        <strong>Queen:</strong> Thanks for saving me my brave knight!
      </div>
      <button id="queenThanksCloseBtn" class="dialog-button">Close</button>
    </div>
  `;
  
  // Add styling
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 20px;
    border-radius: 10px;
    border: 2px solid gold;
    z-index: 1000;
    font-family: Arial, sans-serif;
    text-align: center;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  `;
  
  const content = dialog.querySelector('.dialog-content');
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: center;
  `;
  
  const button = dialog.querySelector('#queenThanksCloseBtn');
  button.style.cssText = `
    padding: 10px 20px;
    background: gold;
    color: black;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    font-size: 16px;
  `;
  
  button.addEventListener('click', () => {
    document.body.removeChild(dialog);
    
    // Trigger restart rescue process immediately
    restartRescueProcess();
  });
  
  document.body.appendChild(dialog);
}

function restartRescueProcess() {
  console.log('🔄 Restarting rescue process...');
  
  // Enable restart button and trigger restart
  document.getElementById('playBtn').disabled = false;
  document.getElementById('playBtn').textContent = '🔄 Restart Rescue Mission';
  isAnimating = false;
  
  // Reset knight position for next run
  const path = dungeonData.path;
  const [i, j] = path[0];
  const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
  const expandedPos = getExpandedPosition(i, j, dungeonData.input[0].length, expandedGridHeight);
  
  knight.position.x = expandedPos.x;
  knight.position.y = expandedPos.y;
  knight.position.z = 15;
  
  // Reset knight to front orientation
  if (knight.characterController) {
    knight.characterController.goIdle('Front');
  }
}

function completeFinalSequence() {
  console.log('✅ Rescue mission completed!');
  
  // Enable restart button
  setTimeout(() => {
    document.getElementById('playBtn').disabled = false;
    document.getElementById('playBtn').textContent = '🔄 Restart Rescue Mission';
    isAnimating = false;
    
    // Reset knight position for next run
    const path = dungeonData.path;
    const [i, j] = path[0];
    const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
    const expandedPos = getExpandedPosition(i, j, dungeonData.input[0].length, expandedGridHeight);
    
    knight.position.x = expandedPos.x;
    knight.position.y = expandedPos.y;
    knight.position.z = 15;
  }, 2000);
}

function animate() {
  requestAnimationFrame(animate);
  
  // Update knight animation if it exists
  if (knight && knight.characterController) {
    if (knight.characterController.mixer) {
      // For 3D models with animation mixer
      knight.characterController.mixer.update(0.016); // ~60fps
    } else if (knight.characterController.update) {
      // For sprite-based characters
      knight.characterController.update(0.016);
    }
  }
  
  // Update power-ups
  if (powerUpManager) {
    powerUpManager.updateAllPowerUps(0.016);
  }
  
  // Update spell effects
  if (spellEffectManager) {
    spellEffectManager.updateAll(0.016);
  }
  
  // Update enemies
  if (enemyManager) {
    enemyManager.updateAllEnemies(0.016);
  }
  
  // Update bosses
  if (bossManager) {
    bossManager.updateAllBosses(0.016);
  }
  
  // Update princess animation
  if (princess && princess.princessController) {
    princess.princessController.update(0.016);
  }
  
  // Update environment
  if (environmentManager) {
    environmentManager.update(0.016);
  }
  
  renderer.render(scene, camera);
}

function setupCameraControls() {
  // Mouse wheel for zooming
  renderer.domElement.addEventListener('wheel', (event) => {
    event.preventDefault();
    const zoomSpeed = 0.1;
    const oldZoom = zoomLevel;
    
    if (event.deltaY > 0) {
      zoomLevel = Math.min(zoomLevel * (1 + zoomSpeed), 5); // Max zoom out
    } else {
      zoomLevel = Math.max(zoomLevel * (1 - zoomSpeed), 0.1); // Max zoom in
    }
    
    updateCameraZoom();
  });

  // Mouse controls for panning
  renderer.domElement.addEventListener('mousedown', (event) => {
    isDragging = true;
    lastMousePosition.x = event.clientX;
    lastMousePosition.y = event.clientY;
    renderer.domElement.style.cursor = 'grabbing';
  });

  renderer.domElement.addEventListener('mousemove', (event) => {
    if (isDragging) {
      const deltaX = event.clientX - lastMousePosition.x;
      const deltaY = event.clientY - lastMousePosition.y;
      
      const panSpeed = 2 * zoomLevel;
      cameraPosition.x -= deltaX * panSpeed;
      cameraPosition.y += deltaY * panSpeed;
      
      updateCameraPosition();
      
      lastMousePosition.x = event.clientX;
      lastMousePosition.y = event.clientY;
    }
  });

  renderer.domElement.addEventListener('mouseup', () => {
    isDragging = false;
    renderer.domElement.style.cursor = 'grab';
  });

  renderer.domElement.addEventListener('mouseleave', () => {
    isDragging = false;
    renderer.domElement.style.cursor = 'default';
  });

  // Touch controls for mobile
  let touchStartDistance = 0;
  let touchStartZoom = 1;
  
  renderer.domElement.addEventListener('touchstart', (event) => {
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      touchStartDistance = Math.sqrt(dx * dx + dy * dy);
      touchStartZoom = zoomLevel;
    } else if (event.touches.length === 1) {
      isDragging = true;
      lastMousePosition.x = event.touches[0].clientX;
      lastMousePosition.y = event.touches[0].clientY;
    }
  });

  renderer.domElement.addEventListener('touchmove', (event) => {
    event.preventDefault();
    
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      zoomLevel = Math.max(0.1, Math.min(5, touchStartZoom * (distance / touchStartDistance)));
      updateCameraZoom();
    } else if (event.touches.length === 1 && isDragging) {
      const deltaX = event.touches[0].clientX - lastMousePosition.x;
      const deltaY = event.touches[0].clientY - lastMousePosition.y;
      
      const panSpeed = 2 * zoomLevel;
      cameraPosition.x -= deltaX * panSpeed;
      cameraPosition.y += deltaY * panSpeed;
      
      updateCameraPosition();
      
      lastMousePosition.x = event.touches[0].clientX;
      lastMousePosition.y = event.touches[0].clientY;
    }
  });

  renderer.domElement.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Keyboard controls
  document.addEventListener('keydown', (event) => {
    const panSpeed = 50 * zoomLevel;
    
    switch(event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        cameraPosition.y += panSpeed;
        updateCameraPosition();
        event.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        cameraPosition.y -= panSpeed;
        updateCameraPosition();
        event.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        cameraPosition.x += panSpeed;
        updateCameraPosition();
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        cameraPosition.x -= panSpeed;
        updateCameraPosition();
        event.preventDefault();
        break;
      case '+':
      case '=':
        zoomLevel = Math.max(zoomLevel * 0.9, 0.1);
        updateCameraZoom();
        event.preventDefault();
        break;
      case '-':
      case '_':
        zoomLevel = Math.min(zoomLevel * 1.1, 5);
        updateCameraZoom();
        event.preventDefault();
        break;
      case 'r':
      case 'R':
        resetCamera();
        event.preventDefault();
        break;
      case 'f':
      case 'F':
        focusOnKnight();
        event.preventDefault();
        break;
    }
  });

  // Set initial cursor style
  renderer.domElement.style.cursor = 'grab';
}

function updateCameraZoom() {
  const dungeonWidth = dungeonData.input[0].length * cellSize;
  const dungeonHeight = dungeonData.input.length * cellSize;
  const maxDimension = Math.max(dungeonWidth, dungeonHeight);
  const aspect = window.innerWidth / window.innerHeight;
  const cameraSize = maxDimension * 0.8 * zoomLevel;
  
  camera.left = -cameraSize * aspect / 2;
  camera.right = cameraSize * aspect / 2;
  camera.top = cameraSize / 2;
  camera.bottom = -cameraSize / 2;
  camera.updateProjectionMatrix();
  
  // Update zoom display
  document.getElementById('zoomLevel').textContent = `Zoom: ${(1/zoomLevel * 100).toFixed(0)}%`;
}

function updateCameraPosition() {
  camera.position.x = cameraPosition.x;
  camera.position.y = cameraPosition.y;
}

function resetCamera() {
  zoomLevel = 1;
  cameraPosition.x = 0;
  cameraPosition.y = 0;
  updateCameraZoom();
  updateCameraPosition();
}

// Handle window resize
function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  const dungeonWidth = dungeonData.input[0].length * cellSize;
  const dungeonHeight = dungeonData.input.length * cellSize;
  const maxDimension = Math.max(dungeonWidth, dungeonHeight);
  const cameraSize = maxDimension * 0.8 * zoomLevel;
  
  camera.left = -cameraSize * aspect / 2;
  camera.right = cameraSize * aspect / 2;
  camera.top = cameraSize / 2;
  camera.bottom = -cameraSize / 2;
  camera.updateProjectionMatrix();
  
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

// Make resetCamera function global so it can be called from HTML
window.resetCamera = resetCamera;

// Make focusOnKnight function global so it can be called from HTML
window.focusOnKnight = focusOnKnight;

function focusOnKnight() {
  if (!knight) {
    console.warn('Knight not found');
    return;
  }
  
  // Store current camera position for smooth transition
  const startZoom = zoomLevel;
  const startX = cameraPosition.x;
  const startY = cameraPosition.y;
  
  // Target values
  const targetZoom = 0.1; // Smaller value = closer zoom for better visibility
  const targetX = knight.position.x;
  const targetY = knight.position.y;
  
  // Animate to knight position
  const animationDuration = 800; // 0.8 seconds
  const startTime = Date.now();
  
  function animateToKnight() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / animationDuration, 1);
    
    // Easing function for smooth animation
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    // Interpolate camera position and zoom
    zoomLevel = startZoom + (targetZoom - startZoom) * easeProgress;
    cameraPosition.x = startX + (targetX - startX) * easeProgress;
    cameraPosition.y = startY + (targetY - startY) * easeProgress;
    
    // Update camera
    updateCameraZoom();
    updateCameraPosition();
    
    if (progress < 1) {
      requestAnimationFrame(animateToKnight);
    } else {
      console.log(`📍 Camera focused on knight at position (${knight.position.x}, ${knight.position.y})`);
    }
  }
  
  // Start animation
  animateToKnight();
  
  // Visual feedback on button
  const button = document.getElementById('focusKnightBtn');
  button.style.background = '#4CAF50';
  setTimeout(() => {
    button.style.background = '#2196F3';
  }, 200);
}
