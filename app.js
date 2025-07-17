import * as THREE from 'three';
import dungeonData from './dungeon.json';
import { DirectionalSpriteKnight } from './DirectionalSpriteKnight.js';
import { PowerUpManager } from './PowerUpManager.js';
import { SpellEffectManager } from './SpellEffectManager.js';
import { EnemyManager } from './EnemyManager.js';

const cellSize = 50;
let scene, camera, renderer;
let knight, princess;
let powerUpManager;
let spellEffectManager;
let enemyManager;
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

  // Calculate dungeon dimensions for proper camera setup
  const dungeonWidth = dungeonData.input[0].length * cellSize;
  const dungeonHeight = dungeonData.input.length * cellSize;
  const maxDimension = Math.max(dungeonWidth, dungeonHeight);
  
  // Set up orthographic camera with proper bounds
  const aspect = window.innerWidth / window.innerHeight;
  const cameraSize = maxDimension * 0.8; // Add some padding
  
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
  createGridLines(dungeonData.input);
  createPrincess(dungeonData.input);
  
  // Initialize power-up manager
  powerUpManager = new PowerUpManager();
  await createPowerUps(dungeonData.input);
  
  // Initialize enemy manager
  enemyManager = new EnemyManager();
  await enemyManager.initialize(scene, cellSize);
  await createEnemies(dungeonData.input);
  
  // Show loading message
  document.getElementById('playBtn').textContent = '🔄 Loading Knight Animations...';
  document.getElementById('playBtn').disabled = true;
  
  // Wait for Knight animations to load before enabling play button
  await createKnight();
  
  // Initialize spell effect manager
  spellEffectManager = new SpellEffectManager();
  await spellEffectManager.initialize(scene, cellSize);
  
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
  const materialNeutral = new THREE.MeshBasicMaterial({ color: 0x444444 });
  const materialPower = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const materialThreat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      let val = grid[i][j];
      let mat = val === 0 ? materialNeutral : val > 0 ? materialPower : materialThreat;

      let room = new THREE.Mesh(new THREE.BoxGeometry(cellSize, cellSize, 1), mat);
      room.position.x = j * cellSize - (grid[0].length * cellSize) / 2;
      room.position.y = -i * cellSize + (grid.length * cellSize) / 2;
      scene.add(room);
    }
  }
}

async function createPowerUps(grid) {
  console.log('🔮 Creating power-ups for power rooms...');
  
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const roomValue = grid[i][j];
      if (roomValue > 0) {
        await powerUpManager.createPowerUpForRoom(i, j, roomValue, cellSize, scene, grid[0].length, grid.length);
      }
    }
  }
  
  console.log('✅ Power-ups created successfully!');
}

async function createEnemies(grid) {
  console.log('👻 Creating enemies for threat rooms...');
  
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const roomValue = grid[i][j];
      if (roomValue < 0) {
        await enemyManager.createEnemyForRoom(i, j, roomValue, cellSize, scene, grid[0].length, grid.length);
      }
    }
  }
  
  console.log('✅ Enemies created successfully!');
}

function createGridLines(grid) {
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
  
  princess.position.x = j * cellSize - (grid[0].length * cellSize) / 2;
  princess.position.y = -i * cellSize + (grid.length * cellSize) / 2;
  princess.position.z = 10;
  
  scene.add(princess);
}

async function createKnight() {
  // Create the Directional Sprite Knight character
  const directionalKnight = new DirectionalSpriteKnight();
  
  try {
    console.log('Loading directional knight sprites...');
    // Load all directional animations
    await directionalKnight.loadAllAnimations(cellSize);
    
    knight = directionalKnight.getObject3D();
    console.log('Directional knight sprite created:', knight);
    
    // Position knight outside the dungeon (to the left of the starting position)
    const path = dungeonData.path;
    const [startI, startJ] = path[0];
    const startX = startJ * cellSize - (dungeonData.input[0].length * cellSize) / 2;
    const startY = -startI * cellSize + (dungeonData.input.length * cellSize) / 2;
    
    // Place knight outside the dungeon (2 cells to the left)
    knight.position.x = startX - (cellSize * 2);
    knight.position.y = startY;
    knight.position.z = 15;
    
    // Store the character controller and starting position for animations
    knight.characterController = directionalKnight;
    knight.startingPosition = { x: startX, y: startY, z: 15 };
    
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
    knight.position.x = j * cellSize - (dungeonData.input[0].length * cellSize) / 2;
    knight.position.y = -i * cellSize + (dungeonData.input.length * cellSize) / 2;
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
  
  // Reset knight to initial state (facing right) and position outside dungeon
  if (knight.characterController) {
    knight.characterController.resetToInitialState();
  }
  
  // Reset power-up manager
  powerUpManager.clearInventory();
  
  // Reset power-ups (recreate them)
  powerUpManager.dispose();
  powerUpManager = new PowerUpManager();
  createPowerUps(dungeonData.input);
  
  // Reset enemies (recreate them)
  enemyManager.removeFromScene(scene);
  enemyManager.dispose();
  enemyManager = new EnemyManager();
  enemyManager.initialize(scene, cellSize);
  createEnemies(dungeonData.input);
  
  // Reset knight's power-up
  if (knight.characterController) {
    knight.characterController.setCurrentPowerUp(null);
  }
  
  // Position knight outside the dungeon for entrance
  const path = dungeonData.path;
  const [startI, startJ] = path[0];
  const startX = startJ * cellSize - (dungeonData.input[0].length * cellSize) / 2;
  const startY = -startI * cellSize + (dungeonData.input.length * cellSize) / 2;
  
  knight.position.x = startX - (cellSize * 2);
  knight.position.y = startY;
  knight.position.z = 15;
  
  // Store starting position
  knight.startingPosition = { x: startX, y: startY, z: 15 };
  
  // Start entrance animation
  animateEntrance();
}

function animateEntrance() {
  console.log('🚪 Knight entering the dungeon...');
  
  // Start running animation facing right
  if (knight.characterController) {
    knight.characterController.startRunning('Right');
  }
  
  // Animate entrance to the first position
  const targetX = knight.startingPosition.x;
  const targetY = knight.startingPosition.y;
  const targetZ = knight.startingPosition.z;
  
  const startX = knight.position.x;
  const startY = knight.position.y;
  const duration = 800; // Slightly longer entrance
  const startTime = Date.now();
  
  function animateEntranceMove() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-in-out animation
    const easeProgress = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    knight.position.x = startX + (targetX - startX) * easeProgress;
    knight.position.y = startY + (targetY - startY) * easeProgress;
    knight.position.z = targetZ + Math.sin(progress * Math.PI) * 2;
    
    if (progress < 1) {
      requestAnimationFrame(animateEntranceMove);
    } else {
      // Entrance complete, pause briefly then start dungeon traversal
      console.log('✅ Knight has entered the dungeon!');
      
      // Brief pause before starting the main path
      setTimeout(() => {
        animatePath();
      }, 300);
    }
  }
  
  animateEntranceMove();
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
      let direction = 'Right'; // Default
      if (step > 0) {
        const prevPos = path[step - 1];
        direction = knight.characterController.getDirectionFromMovement(prevPos, [i, j]);
      }
      
      // Start running animation for movement in the determined direction
      if (knight.characterController) {
        knight.characterController.startRunning(direction);
      }
      
      // Animate knight movement
      const targetX = j * cellSize - (dungeonData.input[0].length * cellSize) / 2;
      const targetY = -i * cellSize + (dungeonData.input.length * cellSize) / 2;
      
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
          
          // Handle room entry
          if (isEnteringRoom) {
            console.log(`🏠 Knight entered room with value: ${roomValue}`);
            
            // Notify enemy manager if entering a threat room
            if (isThreatRoom) {
              enemyManager.onKnightEntersRoom(i, j, direction);
            }
            
            if (isThreatRoom) {
              // Threat room - attack animation
              console.log('⚔️ Threat room detected - attacking!');
              knight.characterController.startAttacking(direction);
              
              // Wait for attack animation to complete, then pause
              setTimeout(() => {
                knight.characterController.goIdle(direction);
                setTimeout(() => {
                  moveKnight(); // Continue after attack and pause
                }, 1500); // 1.5 second pause after attack
              }, 1000); // 1 second for attack animation
              
            } else {
              // Power room - collect power-up and idle
              console.log('💪 Power room detected - collecting power-up');
              
              // Collect power-up
              const collectedPowerUp = powerUpManager.collectPowerUp(i, j);
              
              if (collectedPowerUp) {
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
      // Animation complete
      setTimeout(() => {
        document.getElementById('playBtn').disabled = false;
        document.getElementById('playBtn').textContent = '🔄 Restart Rescue Mission';
        isAnimating = false;
        
        // Reset knight position
        const [i, j] = path[0];
        knight.position.x = j * cellSize - (dungeonData.input[0].length * cellSize) / 2;
        knight.position.y = -i * cellSize + (dungeonData.input.length * cellSize) / 2;
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
