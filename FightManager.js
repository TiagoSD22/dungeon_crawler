import * as THREE from 'three';

export class FightManager {
  constructor(scene, cellSize = 120) {
    this.scene = scene;
    this.cellSize = cellSize;
    this.currentFight = null;
    this.isInFight = false;
    console.log('⚔️ FightManager initialized');
  }

  // Probabilistic function to determine fight duration
  determineFightRounds() {
    const rand = Math.random();
    if (rand < 0.6) return 1;  // 60% chance of 1 round
    if (rand < 0.9) return 2;  // 30% chance of 2 rounds
    return 3;                  // 10% chance of 3 rounds
  }

  // Start a fight between knight and enemy
  async startFight(knight, enemy, knightDirection, onFightComplete, onFirstEnemyAttackComplete = null) {
    if (this.isInFight) {
      console.log('⚠️ Fight already in progress');
      return;
    }
    
    this.isInFight = true;
    const rounds = this.determineFightRounds();
    
    console.log(`⚔️ Fight started! Duration: ${rounds} rounds`);
    
    this.currentFight = {
      knight,
      enemy,
      knightDirection,
      rounds,
      currentRound: 0,
      onComplete: onFightComplete,
      onFirstAttackComplete: onFirstEnemyAttackComplete
    };

    // Start the fight sequence
    await this.executeFightSequence();
  }

  // Start a boss fight with fixed 5 rounds
  async startBossFight(knight, boss, knightDirection, rounds, onBossFightComplete, onFirstBossAttackComplete = null) {
    if (this.isInFight) {
      console.log('⚠️ Fight already in progress');
      return;
    }
    
    this.isInFight = true;
    
    console.log(`👹 Boss fight started! Duration: ${rounds} rounds`);
    
    this.currentFight = {
      knight,
      enemy: boss,
      knightDirection,
      rounds,
      currentRound: 0,
      onComplete: onBossFightComplete,
      onFirstAttackComplete: onFirstBossAttackComplete,
      isBossFight: true
    };

    // Start the boss fight sequence
    await this.executeBossFightSequence();
  }

  async executeBossFightSequence() {
    const { knight, enemy: boss, knightDirection, rounds, onFirstAttackComplete } = this.currentFight;

    // Wait for positioning before starting boss fight
    await this.wait(800);

    for (let round = 1; round <= rounds; round++) {
      console.log(`👹 Boss Round ${round}/${rounds}`);
      this.currentFight.currentRound = round;

      // Boss attacks first (same as regular enemy attack)
      await this.executeEnemyAttack(boss, knight, knightDirection);
      
      // After the first boss attack, trigger HP notification
      if (round === 1 && onFirstAttackComplete) {
        console.log('🩸 First boss attack completed - triggering HP notification');
        onFirstAttackComplete();
      }
      
      // Wait a moment between boss attack and knight counter-attack
      await this.wait(800);
      
      // Knight counter-attacks with special blessing power
      await this.executeSpecialKnightAttack(knight, boss, knightDirection);
      
      // Wait for knight blessing animation to complete before next round
      if (round < rounds) {
        await this.wait(1500); // Longer wait to ensure blessing animation completes
      }
    }

    // Boss fight is over - complete without death animation (handled by dialog)
    this.completeFight();
  }

  async executeSpecialKnightAttack(knight, enemy, knightDirection) {
    console.log(`⚔️ Knight attacks with queen's blessing!`);
    
    // Play knight attack animation with special blessing effects
    // Wait for knight attack animation to complete, which includes blessing effect
    await knight.playSpecialAttackAnimation();
    
    // Then play enemy hurt animation
    await this.playEnemyHurtAnimation(enemy, knightDirection);
  }

  async executeFightSequence() {
    const { knight, enemy, knightDirection, rounds, onFirstAttackComplete } = this.currentFight;

    // Wait for enemy positioning animation to complete before starting fight
    await this.wait(800); // Allow time for positioning animation

    for (let round = 1; round <= rounds; round++) {
      console.log(`🥊 Round ${round}/${rounds}`);
      this.currentFight.currentRound = round;

      // Enemy attacks first
      await this.executeEnemyAttack(enemy, knight, knightDirection);
      
      // After the first enemy attack, trigger HP notification
      if (round === 1 && onFirstAttackComplete) {
        console.log('🩸 First enemy attack completed - triggering HP notification');
        onFirstAttackComplete();
      }
      
      // Wait a moment between attacks
      await this.wait(500);
      
      // Knight counter-attacks
      await this.executeKnightAttack(knight, enemy, knightDirection);
      
      // Wait before next round
      if (round < rounds) {
        await this.wait(1000);
      }
    }

    // Fight is over - enemy dies
    await this.executeEnemyDeath(enemy, knightDirection);
    
    // Complete the fight
    this.completeFight();
  }

  async executeEnemyAttack(enemy, knight, knightDirection) {
    console.log(`👻 Enemy attacks knight!`);
    
    // Check if this is a boss fight
    const isBossFight = this.currentFight && this.currentFight.isBossFight;
    
    // Determine enemy attack animation row based on knight direction
    const attackRow = this.getEnemyAnimationRow(knightDirection);
    
    // Play enemy attack animation
    const attackPromise = enemy.playAttackAnimation(attackRow);
    
    // For boss fights, also play special boss attack animation
    let bossAttackPromise = Promise.resolve();
    if (isBossFight && knight.characterController && knight.characterController.spellEffectManager) {
      console.log('🔥 Boss fight detected - playing special boss attack animation!');
      
      bossAttackPromise = new Promise((resolve) => {
        knight.characterController.spellEffectManager.playBossAttackEffect(
          enemy.sprite.position, // Boss position
          'Left', // Boss attacks from right to left towards knight
          resolve
        );
      });
    }
    
    await this.wait(500);
    const hurtPromise = this.playKnightHurtAnimation(knight, knightDirection);
    
    // Wait for all animations to complete
    await Promise.all([attackPromise, bossAttackPromise, hurtPromise]);
  }

  async executeKnightAttack(knight, enemy, knightDirection) {
    console.log(`⚔️ Knight attacks enemy!`);
    
    // Play knight attack animation and enemy hurt animation simultaneously
    const attackPromise = knight.playAttackAnimation();
    const hurtPromise = this.playEnemyHurtAnimation(enemy, knightDirection);
    
    // Wait for both animations to complete
    await Promise.all([attackPromise, hurtPromise]);
  }

  async executeEnemyDeath(enemy, knightDirection) {
    console.log(`💀 Enemy dies!`);
    
    // Determine death animation row based on knight direction
    const deathRow = this.getEnemyAnimationRow(knightDirection);
    
    // Play enemy death animation
    await enemy.playDeathAnimation(deathRow);
    
    // Remove enemy from scene after death animation
    enemy.removeFromScene();
  }

  // Determine which row of enemy sprite sheet to use based on knight direction
  getEnemyAnimationRow(knightDirection) {
    switch (knightDirection) {
      case 'Right':
        return 2; // Third row (0-indexed: 0=Front, 1=Back, 2=Left, 3=Right)
      case 'Front':
        return 1; // Second row
      case 'Left':
        return 2; // Third row (same as Right for this case)
      case 'Back':
        return 1; // Second row (same as Front for this case)
      default:
        return 1; // Default to second row
    }
  }

  async playKnightHurtAnimation(knight, knightDirection) {
    // Start blinking red effect for knight
    const blinkingEffect = this.startBlinkingEffect(knight.sprite, 0xff0000, 1000);
    
    // Play hurt animation
    const animationPromise = knight.playHurtAnimation(knightDirection);
    
    // Wait for animation to complete, then stop blinking
    await animationPromise;
    this.stopBlinkingEffect(blinkingEffect);
  }

  async playEnemyHurtAnimation(enemy, knightDirection) {
    // Determine hurt animation row
    const hurtRow = this.getEnemyAnimationRow(knightDirection);
    
    // Start blinking red effect for enemy
    const blinkingEffect = this.startBlinkingEffect(enemy.sprite, 0xff0000, 800);
    
    // Play hurt animation
    const animationPromise = enemy.playHurtAnimation(hurtRow);
    
    // Wait for animation to complete, then stop blinking
    await animationPromise;
    this.stopBlinkingEffect(blinkingEffect);
  }

  startBlinkingEffect(sprite, color, duration) {
    if (!sprite || !sprite.material) return null;

    const originalColor = sprite.material.color.clone();
    const blinkColor = new THREE.Color(color);
    let isRed = false;
    
    const blinkInterval = setInterval(() => {
      if (sprite.material) {
        sprite.material.color.copy(isRed ? originalColor : blinkColor);
        isRed = !isRed;
      }
    }, 100); // Blink every 100ms

    // Stop blinking after duration
    const timeout = setTimeout(() => {
      this.stopBlinkingEffect({ interval: blinkInterval, originalColor, sprite });
    }, duration);

    return { interval: blinkInterval, timeout, originalColor, sprite };
  }

  stopBlinkingEffect(blinkingEffect) {
    if (!blinkingEffect) return;

    if (blinkingEffect.interval) {
      clearInterval(blinkingEffect.interval);
    }
    if (blinkingEffect.timeout) {
      clearTimeout(blinkingEffect.timeout);
    }
    if (blinkingEffect.sprite && blinkingEffect.sprite.material && blinkingEffect.originalColor) {
      blinkingEffect.sprite.material.color.copy(blinkingEffect.originalColor);
    }
  }

  completeFight() {
    console.log(`✅ Fight completed!`);
    
    this.isInFight = false;
    
    if (this.currentFight && this.currentFight.onComplete) {
      this.currentFight.onComplete();
    }
    
    this.currentFight = null;
  }

  // Utility function for delays
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean up resources
  dispose() {
    if (this.currentFight) {
      this.completeFight();
    }
  }
}
