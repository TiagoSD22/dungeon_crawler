import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class FBXKnightCharacter {
  constructor() {
    this.group = new THREE.Group();
    this.mixer = null;
    this.animations = {};
    this.currentAction = null;
    this.model = null;
    this.loaded = false;
    this.loadCallbacks = [];
  }

  async loadModel(fbxPath) {
    return new Promise((resolve, reject) => {
      const loader = new FBXLoader();
      
      loader.load(
        fbxPath,
        (fbx) => {
          this.model = fbx;
          this.setupModel();
          this.loaded = true;
          
          // Call any pending callbacks
          this.loadCallbacks.forEach(callback => callback());
          this.loadCallbacks = [];
          
          resolve(fbx);
        },
        (progress) => {
          console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
          console.error('Error loading FBX:', error);
          reject(error);
        }
      );
    });
  }

  setupModel() {
    if (!this.model) return;

    console.log('Setting up FBX model:', this.model);

    // Scale and position the model appropriately
    this.model.scale.setScalar(0.3); // Reduce scale to reasonable size
    this.model.position.set(0, 0, 0);

    // Set up materials for better lighting and visibility
    this.model.traverse((child) => {
      if (child.isMesh) {
        console.log('Processing mesh:', child.name, 'Material:', child.material);
        
        child.castShadow = true;
        child.receiveShadow = false; // Don't receive shadows to avoid being too dark
        
        // Improve material for better visibility
        if (child.material) {
          // Create a more natural looking material
          const newMaterial = new THREE.MeshPhongMaterial({
            color: child.material.color || 0x8B4513, // Brown armor color if no original color
            map: child.material.map, // Preserve original texture if it exists
            shininess: 30,
            emissive: 0x111111 // Slight emissive for visibility
          });
          
          child.material = newMaterial;
        } else {
          // Create a default material if none exists
          child.material = new THREE.MeshPhongMaterial({
            color: 0x4169E1,
            shininess: 30,
            emissive: 0x111111
          });
        }
      }
    });

    this.group.add(this.model);
    this.setupAnimations();
  }

  setupAnimations() {
    if (!this.model || !this.model.animations) return;

    this.mixer = new THREE.AnimationMixer(this.model);

    // Store available animations
    this.model.animations.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      this.animations[clip.name.toLowerCase()] = action;
    });

    // Create custom animations if the model doesn't have them
    this.createCustomAnimations();

    // Start with idle or first available animation
    if (this.animations.idle) {
      this.playAnimation('idle');
    } else if (this.animations.walk || this.animations.walking) {
      this.playAnimation('walk');
    } else if (Object.keys(this.animations).length > 0) {
      this.playAnimation(Object.keys(this.animations)[0]);
    }
  }

  createCustomAnimations() {
    if (!this.model) return;

    // Create simple walking animation - just slight up/down movement
    const walkPositionTrack = new THREE.VectorKeyframeTrack(
      '.position',
      [0, 0.25, 0.5, 0.75, 1],
      [
        0, 0, 0,     // Start position
        0, 0, 1,     // Slight up
        0, 0, 0,     // Back to ground
        0, 0, 1,     // Slight up again
        0, 0, 0      // Back to ground
      ]
    );

    // Walking animation - just bouncing, no rotation
    const walkClip = new THREE.AnimationClip('walk', 0.6, [walkPositionTrack]);
    if (!this.animations.walk && !this.animations.walking) {
      const walkAction = this.mixer.clipAction(walkClip);
      walkAction.setLoop(THREE.LoopRepeat);
      this.animations.walk = walkAction;
    }

    // Idle animation (very subtle breathing)
    const idlePositionTrack = new THREE.VectorKeyframeTrack(
      '.position',
      [0, 1, 2],
      [0, 0, 0, 0, 0.2, 0, 0, 0, 0]
    );
    const idleClip = new THREE.AnimationClip('idle', 3, [idlePositionTrack]);
    if (!this.animations.idle) {
      const idleAction = this.mixer.clipAction(idleClip);
      idleAction.setLoop(THREE.LoopRepeat);
      this.animations.idle = idleAction;
    }
  }

  playAnimation(name) {
    if (!this.mixer || !this.animations[name]) return;

    if (this.currentAction && this.currentAction !== this.animations[name]) {
      this.currentAction.fadeOut(0.3);
    }

    this.currentAction = this.animations[name];
    this.currentAction.reset().fadeIn(0.3).play();
  }

  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  getObject3D() {
    return this.group;
  }

  onLoad(callback) {
    if (this.loaded) {
      callback();
    } else {
      this.loadCallbacks.push(callback);
    }
  }

  startWalking() {
    if (this.animations.walk || this.animations.walking) {
      this.playAnimation('walk') || this.playAnimation('walking');
    }
  }

  stopWalking() {
    if (this.animations.idle) {
      this.playAnimation('idle');
    }
  }

  celebrate() {
    // Try to find a victory/celebration animation, otherwise use a simple rotation
    if (this.animations.victory || this.animations.celebrate) {
      this.playAnimation('victory') || this.playAnimation('celebrate');
    } else {
      // Create a simple celebration rotation
      if (this.model) {
        const originalRotation = this.model.rotation.y;
        const startTime = Date.now();
        
        const celebrateInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = elapsed / 2000; // 2 second celebration
          
          if (progress >= 1) {
            clearInterval(celebrateInterval);
            this.model.rotation.y = originalRotation;
            this.stopWalking();
            return;
          }
          
          this.model.rotation.y = originalRotation + Math.sin(progress * Math.PI * 4) * 0.5;
        }, 16);
      }
    }
  }
}
