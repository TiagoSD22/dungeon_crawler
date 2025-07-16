import * as THREE from 'three';
import dungeonData from './dungeon.json';

const cellSize = 50;
let scene, camera, renderer;
let knight, princess;
let isAnimating = false;
let zoomLevel = 1;
let cameraPosition = { x: 0, y: 0 };
let isDragging = false;
let lastMousePosition = { x: 0, y: 0 };

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

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
  document.body.appendChild(renderer.domElement);

  document.getElementById('minHp').textContent = `Minimum HP Required: ${dungeonData.min_hp}`;
  document.getElementById('dungeonSize').textContent = `Dungeon Size: ${dungeonData.input.length} x ${dungeonData.input[0].length}`;

  createDungeon(dungeonData.input);
  createGridLines(dungeonData.input);
  createPrincess(dungeonData.input);
  createKnight();
  
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

function createKnight() {
  knight = new THREE.Mesh(
    new THREE.CylinderGeometry(cellSize / 3, cellSize / 3, cellSize / 2, 8),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  );
  
  // Start at the first position of the path
  const path = dungeonData.path;
  const [i, j] = path[0];
  knight.position.x = j * cellSize - (dungeonData.input[0].length * cellSize) / 2;
  knight.position.y = -i * cellSize + (dungeonData.input.length * cellSize) / 2;
  knight.position.z = 10;
  
  scene.add(knight);
}

function startAnimation() {
  if (isAnimating) return;
  
  isAnimating = true;
  document.getElementById('playBtn').disabled = true;
  document.getElementById('playBtn').textContent = '⏳ Rescue in Progress...';
  
  animatePath();
}

function animatePath() {
  const path = dungeonData.path;
  let step = 0;

  function moveKnight() {
    if (step < path.length) {
      const [i, j] = path[step];
      
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
        
        // Add a slight bounce effect
        knight.position.z = 10 + Math.sin(progress * Math.PI) * 5;
        
        if (progress < 1) {
          requestAnimationFrame(animateMove);
        } else {
          step++;
          setTimeout(moveKnight, 200); // Pause between moves
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
        knight.position.z = 10;
      }, 1000);
    }
  }

  moveKnight();
}

function animate() {
  requestAnimationFrame(animate);
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
