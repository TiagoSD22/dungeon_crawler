import * as THREE from 'three';

export class EnhancedKnightCharacter {
  constructor() {
    this.group = new THREE.Group();
    this.mixer = null;
    this.animations = {};
    this.currentAction = null;
    
    this.createCharacter();
    this.createAnimations();
  }

  createCharacter() {
    // Enhanced knight with more detailed geometry
    
    // Head with helmet
    const headGeometry = new THREE.SphereGeometry(8, 12, 12);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBB5 }); // Skin tone
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 18;
    this.group.add(head);

    // Knight Helmet (more detailed)
    const helmetGeometry = new THREE.SphereGeometry(9, 12, 12);
    const helmetMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4A4A4A,
      shininess: 100,
      specular: 0x222222
    });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 18;
    helmet.scale.set(1, 0.8, 1);
    this.group.add(helmet);

    // Helmet visor
    const visorGeometry = new THREE.BoxGeometry(12, 3, 1);
    const visorMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x111111,
      transparent: true,
      opacity: 0.8
    });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.set(0, 17, 8);
    this.group.add(visor);

    // Helmet crest/plume
    const crestGeometry = new THREE.ConeGeometry(2, 8, 6);
    const crestMaterial = new THREE.MeshPhongMaterial({ color: 0xFF4444 }); // Red plume
    const crest = new THREE.Mesh(crestGeometry, crestMaterial);
    crest.position.set(0, 25, -2);
    this.group.add(crest);

    // Body armor (chainmail and plate)
    const bodyGeometry = new THREE.CylinderGeometry(7, 9, 20, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x6B6B6B,
      shininess: 80
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2;
    this.group.add(body);

    // Chest plate details
    const chestGeometry = new THREE.BoxGeometry(12, 10, 3);
    const chestMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B8B8B,
      shininess: 100
    });
    const chest = new THREE.Mesh(chestGeometry, chestMaterial);
    chest.position.set(0, 5, 6);
    this.group.add(chest);

    // Shoulder pads
    const shoulderGeometry = new THREE.SphereGeometry(4, 8, 8);
    const shoulderMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x7A7A7A,
      shininess: 90
    });
    
    const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    leftShoulder.position.set(-10, 10, 0);
    leftShoulder.scale.set(1.2, 0.8, 1);
    this.group.add(leftShoulder);
    
    const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    rightShoulder.position.set(10, 10, 0);
    rightShoulder.scale.set(1.2, 0.8, 1);
    this.group.add(rightShoulder);

    // Arms with armor
    const armGeometry = new THREE.CylinderGeometry(2.5, 2.8, 14, 8);
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 }); // Brown leather/cloth
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-10, 0, 0);
    leftArm.rotation.z = 0.2;
    this.group.add(leftArm);
    this.leftArm = leftArm;
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(10, 0, 0);
    rightArm.rotation.z = -0.2;
    this.group.add(rightArm);
    this.rightArm = rightArm;

    // Gauntlets (armored gloves)
    const gauntletGeometry = new THREE.BoxGeometry(4, 6, 4);
    const gauntletMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x6B6B6B,
      shininess: 80
    });
    
    const leftGauntlet = new THREE.Mesh(gauntletGeometry, gauntletMaterial);
    leftGauntlet.position.set(-10, -10, 0);
    this.group.add(leftGauntlet);
    
    const rightGauntlet = new THREE.Mesh(gauntletGeometry, gauntletMaterial);
    rightGauntlet.position.set(10, -10, 0);
    this.group.add(rightGauntlet);

    // Legs with armor
    const legGeometry = new THREE.CylinderGeometry(3, 3.5, 16, 8);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-4, -18, 0);
    this.group.add(leftLeg);
    this.leftLeg = leftLeg;
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(4, -18, 0);
    this.group.add(rightLeg);
    this.rightLeg = rightLeg;

    // Knee guards
    const kneeGeometry = new THREE.SphereGeometry(3, 8, 8);
    const kneeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x7A7A7A,
      shininess: 90
    });
    
    const leftKnee = new THREE.Mesh(kneeGeometry, kneeMaterial);
    leftKnee.position.set(-4, -15, 2);
    leftKnee.scale.set(1, 0.6, 1);
    this.group.add(leftKnee);
    
    const rightKnee = new THREE.Mesh(kneeGeometry, kneeMaterial);
    rightKnee.position.set(4, -15, 2);
    rightKnee.scale.set(1, 0.6, 1);
    this.group.add(rightKnee);

    // Armored boots
    const bootGeometry = new THREE.BoxGeometry(6, 5, 12);
    const bootMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4A4A4A,
      shininess: 60
    });
    
    const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
    leftBoot.position.set(-4, -28, 3);
    this.group.add(leftBoot);
    
    const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
    rightBoot.position.set(4, -28, 3);
    this.group.add(rightBoot);

    // Cape/Cloak
    const capeGeometry = new THREE.CylinderGeometry(8, 12, 18, 8, 1, true);
    const capeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B0000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const cape = new THREE.Mesh(capeGeometry, capeMaterial);
    cape.position.set(0, 2, -8);
    cape.rotation.x = Math.PI;
    this.group.add(cape);
    this.cape = cape;

    // Sword (knight's weapon)
    const swordGroup = new THREE.Group();
    
    // Sword blade
    const bladeGeometry = new THREE.BoxGeometry(1.5, 16, 0.5);
    const bladeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xE6E6FA,
      shininess: 200,
      specular: 0xFFFFFF
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 8;
    swordGroup.add(blade);
    
    // Sword hilt
    const hiltGeometry = new THREE.CylinderGeometry(0.8, 0.8, 4, 8);
    const hiltMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B4513,
      shininess: 30
    });
    const hilt = new THREE.Mesh(hiltGeometry, hiltMaterial);
    hilt.position.y = -2;
    swordGroup.add(hilt);
    
    // Sword crossguard
    const guardGeometry = new THREE.BoxGeometry(6, 0.8, 0.8);
    const guardMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4A4A4A,
      shininess: 100
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    swordGroup.add(guard);
    
    // Position sword
    swordGroup.position.set(12, -2, 0);
    swordGroup.rotation.z = -0.3;
    this.group.add(swordGroup);
    this.sword = swordGroup;

    // Shield
    const shieldGeometry = new THREE.CylinderGeometry(6, 6, 1, 8);
    const shieldMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4169E1,
      shininess: 80
    });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.set(-8, 2, 3);
    shield.rotation.z = Math.PI / 2;
    this.group.add(shield);

    // Shield emblem (cross)
    const emblemGeometry = new THREE.BoxGeometry(1, 6, 0.2);
    const emblemMaterial = new THREE.MeshPhongMaterial({ color: 0xFFD700 }); // Gold
    
    const emblemV = new THREE.Mesh(emblemGeometry, emblemMaterial);
    emblemV.position.set(-8, 2, 4);
    this.group.add(emblemV);
    
    const emblemH = new THREE.Mesh(emblemGeometry, emblemMaterial);
    emblemH.position.set(-8, 2, 4);
    emblemH.rotation.z = Math.PI / 2;
    this.group.add(emblemH);

    // Store references for animations
    this.head = head;
    this.body = body;
    this.helmet = helmet;
  }

  createAnimations() {
    // Create animation mixer
    this.mixer = new THREE.AnimationMixer(this.group);

    // Idle animation (subtle movement)
    const idleTrack = new THREE.VectorKeyframeTrack(
      '.position',
      [0, 1, 2],
      [0, 0, 0, 0, 1, 0, 0, 0, 0]
    );
    
    const capeIdleTrack = new THREE.VectorKeyframeTrack(
      'cape.rotation',
      [0, 1, 2],
      [Math.PI, 0, 0, Math.PI, 0, 0.1, Math.PI, 0, 0]
    );
    
    const idleClip = new THREE.AnimationClip('idle', 2, [idleTrack, capeIdleTrack]);
    this.animations.idle = this.mixer.clipAction(idleClip);
    this.animations.idle.setLoop(THREE.LoopRepeat);

    // Walking animation (more pronounced movement)
    const walkPositionTrack = new THREE.VectorKeyframeTrack(
      '.position',
      [0, 0.25, 0.5, 0.75, 1],
      [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, -3, 0, 0, 0, 0]
    );
    
    const walkRotationTrack = new THREE.QuaternionKeyframeTrack(
      '.rotation',
      [0, 0.25, 0.5, 0.75, 1],
      [
        0, 0, 0, 1,
        0, 0, 0.08, 0.997,
        0, 0, 0, 1,
        0, 0, -0.08, 0.997,
        0, 0, 0, 1
      ]
    );

    const capeWalkTrack = new THREE.VectorKeyframeTrack(
      'cape.rotation',
      [0, 0.5, 1],
      [Math.PI, 0, 0, Math.PI, 0, 0.3, Math.PI, 0, 0]
    );

    const walkClip = new THREE.AnimationClip('walk', 1, [walkPositionTrack, walkRotationTrack, capeWalkTrack]);
    this.animations.walk = this.mixer.clipAction(walkClip);
    this.animations.walk.setLoop(THREE.LoopRepeat);

    // Victory animation (sword raised)
    const victoryPositionTrack = new THREE.VectorKeyframeTrack(
      'sword.rotation',
      [0, 0.5, 1],
      [-0.3, 0, 0, -1.8, 0, 0, -0.3, 0, 0]
    );
    
    const victoryClip = new THREE.AnimationClip('victory', 1.5, [victoryPositionTrack]);
    this.animations.victory = this.mixer.clipAction(victoryClip);
    this.animations.victory.setLoop(THREE.LoopOnce);
    this.animations.victory.clampWhenFinished = true;

    // Set default animation
    this.playAnimation('idle');
  }

  playAnimation(name) {
    if (this.currentAction) {
      this.currentAction.fadeOut(0.3);
    }
    
    if (this.animations[name]) {
      this.currentAction = this.animations[name];
      this.currentAction.reset().fadeIn(0.3).play();
    }
  }

  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    // Add some continuous cape movement
    if (this.cape) {
      this.cape.rotation.x = Math.PI + Math.sin(Date.now() * 0.003) * 0.1;
    }
  }

  getObject3D() {
    return this.group;
  }

  celebrate() {
    this.playAnimation('victory');
    
    // Add helmet shine effect
    const originalColor = this.helmet.material.color.getHex();
    const shineInterval = setInterval(() => {
      const intensity = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
      this.helmet.material.color.setHex(this.interpolateColor(originalColor, 0xFFFFFF, intensity * 0.3));
    }, 16);
    
    setTimeout(() => {
      clearInterval(shineInterval);
      this.helmet.material.color.setHex(originalColor);
      this.playAnimation('idle');
    }, 3000);
  }

  startWalking() {
    this.playAnimation('walk');
  }

  stopWalking() {
    this.playAnimation('idle');
  }

  interpolateColor(color1, color2, factor) {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    return c1.lerp(c2, factor).getHex();
  }
}
