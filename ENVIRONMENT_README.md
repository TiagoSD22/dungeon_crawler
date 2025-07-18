# Dungeon Environment Generation System

A comprehensive system for generating rich, layered dungeon environments using a grid-based asset placement algorithm with proper visual layering and thematic coherence.

## 🏰 Overview

This system creates immersive dungeon rooms by:
- Following a strict 5-layer rendering system
- Using thematic room generation (crypt, treasury, temple, prison, library)
- Supporting animated objects (torches, candles, magical effects)
- Maintaining grid-based placement rules for consistency
- Integrating seamlessly with your existing Three.js dungeon crawler

## 📁 Required Asset Structure

Place your assets in the following structure:

```
assets/environment/
├── walls_floor.png          # Foundational tiles (floors, walls, corners)
├── Arches_columns.png       # Architectural elements (arches, columns, niches)
├── doors.png                # Animated doors (wooden, iron, various states)
├── coffins.png              # Coffins and sarcophagi (open/closed, with/without skeletons)
├── other_objects.png        # Misc objects (chests, statues, skeletons, skulls, keys)
├── torches.png              # Animated wall torches with cyan flames
├── candles.png              # Animated candles with flickering flames
├── scull_bas-relief.png     # Animated wall decorations (glowing skull eyes)
├── Statue_fire.png          # Animated fire statues with cyan flames
└── plates.png               # Floor plates and ritual patterns
```

## 🎨 Layer System

The system uses a strict 5-layer rendering order:

### Layer 0: Floor
- Base floor tiles (dark stone)
- Floor grates and variations
- Pressure plates and ritual circles
- Any walkable surface elements

### Layer 1: Walls
- Wall boundaries (top, bottom, left, right)
- Corner pieces for visual depth
- Doors and doorways
- Arches and openings

### Layer 2: Wall-Mounted Objects
- Wall torches and sconces
- Bas-reliefs and decorative elements
- Mounted skulls or trophies
- Any object attached to walls

### Layer 3: Ground Objects
- Coffins and sarcophagi
- Statues and columns
- Chests and containers
- Skeletons and bone piles
- Freestanding objects

### Layer 4: Effects & Overlays
- Light glows from torches/candles
- Magical effects and auras
- Particle systems
- Environmental atmosphere

## 🎯 Room Themes

The system generates 5 distinct room themes:

### Crypt
- **Objects**: Coffins, skeletons, skulls
- **Lighting**: Torches, candles
- **Mood**: Dark, mystical burial chamber
- **Special**: Floor grates, glowing bas-reliefs

### Treasury
- **Objects**: Chests, statues, columns
- **Lighting**: Bright torches
- **Mood**: Rich, ornate treasure room
- **Special**: Pressure plates, multiple chests

### Temple
- **Objects**: Statues, columns, altars
- **Lighting**: Candles, magical fire statues
- **Mood**: Sacred, mystical chamber
- **Special**: Ritual floor patterns

### Prison
- **Objects**: Chains, skeletons, bones
- **Lighting**: Dim torches
- **Mood**: Oppressive, dark holding area
- **Special**: Floor grates, hanging skeletons

### Library
- **Objects**: Chests (as book containers), statues, columns
- **Lighting**: Soft candlelight
- **Mood**: Scholarly, ancient archive
- **Special**: Clean floors, organized layout

## 🚀 Usage

### Basic Integration

```javascript
import { DungeonEnvironmentManager } from './DungeonEnvironmentManager.js';

// Initialize
const environmentManager = new DungeonEnvironmentManager();
await environmentManager.initialize(scene, cellSize);

// Generate environment for a room
const environmentData = await environmentManager.generateRoomEnvironment(
  roomI, roomJ, roomValue, gridData
);

// Update animations in your main loop
environmentManager.updateEnvironments(deltaTime);
```

### Complete Integration

```javascript
import { DungeonWithEnvironments } from './DungeonEnvironmentIntegration.js';

// Create dungeon with environments
const dungeonWithEnv = new DungeonWithEnvironments();
await dungeonWithEnv.initialize(scene, dungeonGrid);

// Generate all room environments
await dungeonWithEnv.generateAllEnvironments();

// In your animation loop
dungeonWithEnv.updateEnvironments(deltaTime);
```

## 🎮 Asset Specifications

### File Format
- **Format**: PNG with transparency
- **Style**: Pixel art for consistency
- **Tile Size**: 32x32 or 48x48 pixels recommended

### Animation Requirements
- **Layout**: Horizontal strips of frames
- **Frame Count**: 4-8 frames for smooth animation
- **Timing**: ~200ms per frame for flickering effects

### Color Palette
- **Light Effects**: Cyan (#00FFFF) for magical/torch glow
- **Stone**: Dark grays and browns for dungeon aesthetic
- **Metals**: Silver/iron for doors and objects

## 🔧 Customization

### Adding New Themes
```javascript
// In DungeonEnvironmentManager.js
this.roomThemes.newTheme = {
  description: 'Your theme description',
  primaryObjects: ['object1', 'object2'],
  lighting: ['torches', 'candles'],
  wallDecor: ['decorType'],
  floorSpecial: ['specialFloor'],
  mood: 'theme_mood'
};
```

### Custom Object Types
```javascript
// Update asset mappings
getAssetForObjectType(objectType) {
  const assetMap = {
    'yourObject': 'yourAssetCatalog',
    // ... existing mappings
  };
  return assetMap[objectType] || 'objects';
}
```

## 📊 Performance

### Optimization Features
- **Lazy Loading**: Environments generated on-demand
- **Asset Reuse**: Shared texture atlases
- **Layer Culling**: Only render visible layers
- **Animation Batching**: Efficient frame updates

### Memory Management
- **Texture Disposal**: Automatic cleanup on room change
- **Object Pooling**: Reuse common objects
- **LOD System**: Distance-based detail reduction

## 🐛 Debugging

### Environment Information
```javascript
// Get room environment details
const envInfo = environmentManager.getRoomEnvironmentInfo(roomI, roomJ);
console.log(envInfo);

// Log generation statistics
dungeonWithEnv.logEnvironmentStats();
```

### Common Issues
1. **Missing Assets**: Check console for asset loading warnings
2. **Overlapping Objects**: Verify layer assignments
3. **Animation Issues**: Ensure proper frame counts in assets
4. **Performance**: Monitor object count per room

## 🔮 Future Enhancements

### Planned Features
- **Interactive Objects**: Clickable chests, levers, switches
- **Dynamic Lighting**: Real-time shadow casting
- **Weather Effects**: Fog, dust particles, ambient sounds
- **Procedural Textures**: Generated wear patterns and aging
- **Story Elements**: Contextual object placement based on narrative

### Advanced Systems
- **Physics Integration**: Destructible objects
- **AI Pathfinding**: Smart object placement for NPC navigation
- **Quest Integration**: Objects that respond to game state
- **Multiplayer Sync**: Shared environment states

## 📚 Asset Creation Guidelines

### Best Practices
1. **Consistency**: Maintain uniform art style across all assets
2. **Modularity**: Design objects to work in multiple themes
3. **Scalability**: Create assets that work at different zoom levels
4. **Performance**: Optimize texture sizes for target devices

### Tools Recommended
- **Aseprite**: Excellent for pixel art and animation
- **GIMP**: Free alternative with good sprite sheet support
- **TexturePacker**: For optimizing sprite sheet layouts
- **Tiled**: For testing tile-based layouts

---

## 🎉 Getting Started

1. **Prepare Assets**: Create or obtain the required sprite sheets
2. **Place Files**: Copy assets to `assets/environment/` folder
3. **Initialize System**: Add environment manager to your app
4. **Generate Rooms**: Call generation methods after dungeon creation
5. **Test & Iterate**: Verify themes and object placement

The system is designed to be flexible and extensible. Start with basic assets and gradually add more complex objects and animations as your dungeon world grows!
