import * as THREE from 'three';
import dungeonData from './dungeon.json';

const cellSize = 50;
let scene, camera, renderer;
let knight, princess;
let isAnimating = false;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.OrthographicCamera(
    window.innerWidth / -2, window.innerWidth / 2,
    window.innerHeight / 2, window.innerHeight / -2,
    0.1, 1000
  );
  camera.position.z = 500;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  document.getElementById('minHp').textContent = `Minimum HP Required: ${dungeonData.min_hp}`;

  createDungeon(dungeonData.input);
  createGridLines(dungeonData.input);
  createPrincess(dungeonData.input);
  createKnight();
  
  // Add play button event listener
  document.getElementById('playBtn').addEventListener('click', startAnimation);
  
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
