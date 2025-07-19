/**
 * Simple Dungeon Environment Manager
 * 
 * A simplified version that enhances room visuals without complex asset loading
 */

import * as THREE from 'three';

export class SimpleDungeonEnvironment {
  constructor() {
    this.scene = null;
    this.cellSize = 120;
    this.roomMaterials = new Map();
    this.environmentObjects = [];
  }

  async initialize(scene, cellSize = 120) {
    this.scene = scene;
    this.cellSize = cellSize;
    
    console.log('🏰 Initializing simple dungeon environment...');
    this.createRoomMaterials();
  }

  createRoomMaterials() {
    // Create textured materials for different room types
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Stone floor texture
    this.roomMaterials.set('neutral', this.createStoneTexture(ctx, '#666666', '#555555'));
    
    // Power room texture (magical)
    this.roomMaterials.set('power', this.createMagicalTexture(ctx, '#004400', '#006600'));
    
    // Threat room texture (dangerous)
    this.roomMaterials.set('threat', this.createDangerousTexture(ctx, '#440000', '#660000'));

    console.log('✅ Created room materials');
  }

  createStoneTexture(ctx, color1, color2) {
    const canvas = ctx.canvas;
    
    // Fill with base color
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, 256, 256);
    
    // Add stone pattern
    ctx.fillStyle = color2;
    for (let i = 0; i < 256; i += 32) {
      for (let j = 0; j < 256; j += 32) {
        if ((i + j) % 64 === 0) {
          ctx.fillRect(i, j, 28, 28);
        }
      }
    }
    
    // Add some random variations
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 8 + 2;
      ctx.fillStyle = Math.random() > 0.5 ? color1 : color2;
      ctx.fillRect(x, y, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  createMagicalTexture(ctx, color1, color2) {
    const canvas = ctx.canvas;
    
    // Fill with base color
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, 256, 256);
    
    // Add magical runes pattern
    ctx.fillStyle = color2;
    for (let i = 0; i < 256; i += 64) {
      for (let j = 0; j < 256; j += 64) {
        // Draw simple rune-like shapes
        ctx.beginPath();
        ctx.arc(i + 32, j + 32, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillRect(i + 26, j + 26, 12, 4);
        ctx.fillRect(i + 30, j + 20, 4, 16);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  createDangerousTexture(ctx, color1, color2) {
    const canvas = ctx.canvas;
    
    // Fill with base color
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, 256, 256);
    
    // Add danger pattern (spikes/cracks)
    ctx.fillStyle = color2;
    for (let i = 0; i < 256; i += 48) {
      for (let j = 0; j < 256; j += 48) {
        // Draw spike-like patterns
        ctx.beginPath();
        ctx.moveTo(i + 24, j + 10);
        ctx.lineTo(i + 14, j + 38);
        ctx.lineTo(i + 34, j + 38);
        ctx.closePath();
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  enhanceRoom(roomI, roomJ, roomValue, gridData) {
    // Determine room type
    let roomType = 'neutral';
    if (roomValue > 0) roomType = 'power';
    else if (roomValue < 0) roomType = 'threat';

    // Create enhanced floor
    const floorGeometry = new THREE.PlaneGeometry(this.cellSize * 0.9, this.cellSize * 0.9);
    const floorMaterial = new THREE.MeshBasicMaterial({
      map: this.roomMaterials.get(roomType),
      transparent: true,
      opacity: 0.8
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    
    // Position the enhanced floor
    const roomCenterX = roomJ * this.cellSize - (gridData.width * this.cellSize) / 2;
    const roomCenterY = -roomI * this.cellSize + (gridData.height * this.cellSize) / 2;
    
    floor.position.set(roomCenterX, roomCenterY, 0.2);
    floor.userData = {
      roomType: 'enhancedFloor',
      gridPosition: { i: roomI, j: roomJ }
    };

    this.scene.add(floor);
    this.environmentObjects.push(floor);

    // Add decorative objects based on room type
    this.addRoomDecorations(roomI, roomJ, roomValue, roomType, roomCenterX, roomCenterY);

    console.log(`✅ Enhanced room [${roomI},${roomJ}] as ${roomType}`);
  }

  addRoomDecorations(roomI, roomJ, roomValue, roomType, centerX, centerY) {
    const decorationCount = Math.abs(roomValue) > 5 ? 3 : 2;
    
    for (let i = 0; i < decorationCount; i++) {
      const decoration = this.createDecoration(roomType, i, decorationCount);
      
      // Position decorations around the room
      const angle = (i / decorationCount) * Math.PI * 2;
      const radius = this.cellSize * 0.25;
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      
      decoration.position.set(
        centerX + offsetX,
        centerY + offsetY,
        0.3 + (i * 0.1)
      );

      decoration.userData = {
        roomType: 'decoration',
        gridPosition: { i: roomI, j: roomJ },
        decorationType: roomType
      };

      this.scene.add(decoration);
      this.environmentObjects.push(decoration);
    }
  }

  createDecoration(roomType, index, total) {
    const size = this.cellSize * 0.15;
    const geometry = new THREE.BoxGeometry(size, size, size * 0.5);
    
    let material;
    switch (roomType) {
      case 'power':
        material = new THREE.MeshBasicMaterial({ 
          color: 0x00AA00,
          transparent: true,
          opacity: 0.8
        });
        break;
      case 'threat':
        material = new THREE.MeshBasicMaterial({ 
          color: 0xAA0000,
          transparent: true,
          opacity: 0.8
        });
        break;
      default:
        material = new THREE.MeshBasicMaterial({ 
          color: 0x888888,
          transparent: true,
          opacity: 0.7
        });
    }

    const decoration = new THREE.Mesh(geometry, material);
    
    // Add slight random rotation for variety
    decoration.rotation.z = Math.random() * Math.PI * 2;
    
    return decoration;
  }

  // Clean up all environment objects
  dispose() {
    this.environmentObjects.forEach(obj => {
      if (obj.parent) {
        obj.parent.remove(obj);
      }
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
      if (obj.geometry) {
        obj.geometry.dispose();
      }
    });
    
    this.environmentObjects = [];
    this.roomMaterials.clear();
    
    console.log('🧹 Disposed simple dungeon environment');
  }
}
