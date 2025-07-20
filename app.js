import * as THREE from 'three';
import dungeonData from './dungeon.json';
import { DirectionalSpriteKnight } from './DirectionalSpriteKnight.js';
import { PowerUpManager } from './PowerUpManager.js';
import { SpellEffectManager } from './SpellEffectManager.js';
import { EnemyManager } from './EnemyManager.js';
import { FightManager } from './FightManager.js';
import { EnvironmentManager } from './EnvironmentManager.js';

const cellSize = 120;
const WATER_ROWS_OFFSET = 6; // Number of water rows added above the original dungeon
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
let fightManager;
let environmentManager;
let isAnimating = false;
let zoomLevel = 1;
let cameraPosition = { x: 0, y: 0 };
let isDragging = false;
let lastMousePosition = { x: 0, y: 0 };

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
  
  // Initialize environment manager and create floors
  environmentManager = new EnvironmentManager();
  environmentManager.createFloorsForDungeon(dungeonData.input, cellSize, scene);
  
  createPrincess(dungeonData.input);
  
  // Initialize power-up manager
  powerUpManager = new PowerUpManager();
  await createPowerUps(dungeonData.input);
  
  // Initialize enemy manager
  enemyManager = new EnemyManager();
  await enemyManager.initialize(scene);
  
  // Store grid dimensions for enemy positioning (use expanded dimensions with walls)
  scene.userData.gridWidth = dungeonData.input[0].length + (2 * WALL_PADDING);
  scene.userData.gridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
  
  await createEnemies(dungeonData.input);
  
  // Show loading message
  document.getElementById('playBtn').textContent = '🔄 Loading Knight Animations...';
  document.getElementById('playBtn').disabled = true;
  
  // Wait for Knight animations to load before enabling play button
  await createKnight();
  
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
  
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const roomValue = grid[i][j];
      if (roomValue < 0) {
        // Use expanded coordinates for enemy positioning with wall padding
        const expandedPos = getExpandedPosition(i, j, grid[0].length, expandedGridHeight);
        await enemyManager.createEnemyForRoom(expandedPos.expandedI, expandedPos.expandedJ, roomValue, cellSize, scene, grid[0].length + (2 * WALL_PADDING), expandedGridHeight);
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

function createPrincess(grid) {
  // Place princess at the end of the path
  const path = dungeonData.path;
  const lastPosition = path[path.length - 1];
  const [i, j] = lastPosition;
  
  princess = new THREE.Mesh(
    new THREE.ConeGeometry(cellSize / 3, cellSize / 2, 8),
    new THREE.MeshBasicMaterial({ color: 0xff69b4 })
  );
  
  // Use expanded grid positioning
  const expandedGridHeight = grid.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
  const expandedPos = getExpandedPosition(i, j, grid[0].length, expandedGridHeight);
  
  princess.position.x = expandedPos.x;
  princess.position.y = expandedPos.y;
  princess.position.z = 10;
  
  scene.add(princess);
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

function startAnimation() {
  if (isAnimating) return;
  
  isAnimating = true;
  document.getElementById('playBtn').disabled = true;
  document.getElementById('playBtn').textContent = '⏳ Rescue in Progress...';
  
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
                
                // Start fight
                fightManager.startFight(
                  knight.characterController,
                  enemy,
                  direction,
                  () => {
                    // Fight completed callback
                    enemy.isDead = true;
                    console.log(`✅ Fight completed! Enemy defeated.`);
                    
                    // Continue movement after fight
                    setTimeout(() => {
                      knight.characterController.goIdle(direction);
                      setTimeout(() => {
                        moveKnight(); // Continue after fight
                      }, 1000);
                    }, 500);
                  }
                );
              } else {
                // No enemy or already dead - just continue
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
      // Animation complete - mark final cell as visited
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
      }
      
      setTimeout(() => {
        document.getElementById('playBtn').disabled = false;
        document.getElementById('playBtn').textContent = '🔄 Restart Rescue Mission';
        isAnimating = false;
        
        // Reset knight position
        const [i, j] = path[0];
        const expandedGridHeight = dungeonData.input.length + WATER_ROWS_OFFSET + (2 * WALL_PADDING);
        const expandedPos = getExpandedPosition(i, j, dungeonData.input[0].length, expandedGridHeight);
        
        knight.position.x = expandedPos.x;
        knight.position.y = expandedPos.y;
        knight.position.z = 15;
      }, 1000);
    }
  }

  moveKnight();
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
