/**
 * Example integration of DungeonEnvironmentManager with existing dungeon crawler
 * 
 * This shows how to integrate the environment generation system with your
 * existing app.js and dungeon generation logic.
 */

import { DungeonEnvironmentManager } from './DungeonEnvironmentManager.js';

// Example integration in your main app.js file
export class DungeonWithEnvironments {
  constructor() {
    this.scene = null;
    this.dungeonGrid = null;
    this.environmentManager = new DungeonEnvironmentManager();
    this.environmentsGenerated = false;
  }

  async initialize(scene, dungeonGrid) {
    this.scene = scene;
    this.dungeonGrid = dungeonGrid;
    
    // Initialize the environment manager
    await this.environmentManager.initialize(scene, 80); // cellSize = 80
    
    console.log('🏰 Dungeon with environments initialized');
  }

  /**
   * Generate environments for all rooms in the dungeon
   * Call this after your dungeon grid is generated
   */
  async generateAllEnvironments() {
    if (this.environmentsGenerated) return;

    console.log('🏰 Generating environments for all dungeon rooms...');
    
    const gridHeight = this.dungeonGrid.length;
    const gridWidth = this.dungeonGrid[0].length;
    
    const promises = [];
    
    for (let i = 0; i < gridHeight; i++) {
      for (let j = 0; j < gridWidth; j++) {
        const roomValue = this.dungeonGrid[i][j];
        
        // Generate environment for rooms (skip empty spaces)
        if (roomValue !== 0) {
          const promise = this.environmentManager.generateRoomEnvironment(
            i, j, roomValue, 
            { gridWidth, gridHeight, dungeonGrid: this.dungeonGrid }
          );
          promises.push(promise);
        }
      }
    }
    
    await Promise.all(promises);
    this.environmentsGenerated = true;
    
    console.log('✅ All room environments generated!');
    this.logEnvironmentStats();
  }

  /**
   * Generate environment for a specific room (on-demand generation)
   */
  async generateRoomEnvironment(roomI, roomJ) {
    const roomValue = this.dungeonGrid[roomI][roomJ];
    
    if (roomValue === 0) {
      console.warn(`⚠️ Cannot generate environment for empty space at [${roomI},${roomJ}]`);
      return null;
    }

    return await this.environmentManager.generateRoomEnvironment(
      roomI, roomJ, roomValue,
      { 
        gridWidth: this.dungeonGrid[0].length, 
        gridHeight: this.dungeonGrid.length, 
        dungeonGrid: this.dungeonGrid 
      }
    );
  }

  /**
   * Update all environment animations
   * Call this in your main update loop
   */
  updateEnvironments(deltaTime) {
    this.environmentManager.updateEnvironments(deltaTime);
  }

  /**
   * Get detailed information about a room's environment
   */
  getRoomEnvironmentInfo(roomI, roomJ) {
    return this.environmentManager.getRoomEnvironmentInfo(roomI, roomJ);
  }

  /**
   * Log statistics about generated environments
   */
  logEnvironmentStats() {
    const stats = {
      totalRooms: 0,
      themeDistribution: {},
      totalObjects: 0
    };

    for (let i = 0; i < this.dungeonGrid.length; i++) {
      for (let j = 0; j < this.dungeonGrid[0].length; j++) {
        const envInfo = this.getRoomEnvironmentInfo(i, j);
        if (envInfo) {
          stats.totalRooms++;
          stats.totalObjects += envInfo.objectCount;
          
          if (!stats.themeDistribution[envInfo.theme]) {
            stats.themeDistribution[envInfo.theme] = 0;
          }
          stats.themeDistribution[envInfo.theme]++;
        }
      }
    }

    console.log('📊 Environment Generation Statistics:');
    console.log(`   Total Rooms: ${stats.totalRooms}`);
    console.log(`   Total Objects: ${stats.totalObjects}`);
    console.log(`   Theme Distribution:`, stats.themeDistribution);
  }

  /**
   * Clean up all environment resources
   */
  dispose() {
    this.environmentManager.dispose();
    this.environmentsGenerated = false;
  }
}

// Example usage in your existing app.js:
/*

// In your main app.js file, replace or enhance your existing dungeon generation:

class App {
  constructor() {
    // ... existing code ...
    this.dungeonWithEnvironments = new DungeonWithEnvironments();
  }

  async init() {
    // ... existing initialization code ...
    
    // Initialize dungeon with environments
    await this.dungeonWithEnvironments.initialize(this.scene, this.dungeonGrid);
    
    // Generate all room environments
    await this.dungeonWithEnvironments.generateAllEnvironments();
  }

  animate() {
    // ... existing animation code ...
    
    // Update environment animations
    this.dungeonWithEnvironments.updateEnvironments(this.deltaTime);
    
    // ... rest of animation loop ...
  }
}

*/

// Asset organization helper
export class AssetOrganizer {
  /**
   * Expected folder structure for environment assets:
   * 
   * assets/environment/
   * ├── walls_floor.png          (foundational tiles)
   * ├── Arches_columns.png       (architectural elements)
   * ├── doors.png                (animated doors)
   * ├── coffins.png              (various coffins and sarcophagi)
   * ├── other_objects.png        (chests, statues, skeletons, etc.)
   * ├── torches.png              (animated wall torches)
   * ├── candles.png              (animated candles)
   * ├── scull_bas-relief.png     (animated wall decorations)
   * ├── Statue_fire.png          (animated fire statues)
   * └── plates.png               (floor plates and patterns)
   */
  
  static getExpectedAssets() {
    return [
      'walls_floor.png',
      'Arches_columns.png',
      'doors.png',
      'coffins.png',
      'other_objects.png',
      'torches.png',
      'candles.png',
      'scull_bas-relief.png',
      'Statue_fire.png',
      'plates.png'
    ];
  }

  static validateAssetStructure() {
    console.log('📁 Expected asset structure:');
    console.log('assets/environment/');
    
    this.getExpectedAssets().forEach(asset => {
      console.log(`├── ${asset}`);
    });
    
    console.log('\n🎨 Asset Requirements:');
    console.log('- All images should be PNG format with transparency');
    console.log('- Use pixel art style for consistency');
    console.log('- Maintain consistent tile sizes (32x32 or 48x48 recommended)');
    console.log('- Animated assets should have frames in horizontal strips');
    console.log('- Follow the layer system for proper rendering order');
  }
}
