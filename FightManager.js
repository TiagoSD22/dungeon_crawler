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

    // Show initial boss threat dialog
    await this.showBossThreatDialog();

    // Play queen blessing animation after first dialog
    await this.playQueenBlessingSequence(knight);

    // Play boss anger animation and show second dialog
    await this.playBossAngerSequence(boss);

    for (let round = 1; round <= rounds; round++) {
      console.log(`👹 Boss Round ${round}/${rounds}`);
      this.currentFight.currentRound = round;

      // Boss attacks first with special attack
      await this.executeBossSpecialAttack(boss, knight, knightDirection);
      
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

    // Play boss death animation
    await this.playBossDeathSequence(boss);

        // Boss fight is over - show boss defeat dialog first
    await this.showBossDefeatDialog();

    // Complete without death animation (already played)
    this.completeFight();
  }

  async showBossThreatDialog() {
    return new Promise((resolve) => {
      // Create dialog overlay
      const dialogOverlay = document.createElement('div');
      dialogOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: Arial, sans-serif;
      `;

      const dialogBox = document.createElement('div');
      dialogBox.style.cssText = `
        background: #2a1810;
        border: 4px solid #8b4513;
        border-radius: 10px;
        padding: 30px;
        max-width: 500px;
        text-align: center;
        color: #ff6b35;
        box-shadow: 0 0 20px rgba(255, 107, 53, 0.5);
      `;

      // Create button element directly
      const button = document.createElement('button');
      button.style.cssText = `
        background: #8b4513;
        color: white;
        border: 2px solid #ff6b35;
        padding: 12px 30px;
        font-size: 16px;
        cursor: pointer;
        border-radius: 5px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        transition: all 0.3s;
      `;
      button.textContent = 'Next';
      
      // Add click event directly to the button element
      button.addEventListener('click', () => {
        console.log('🖱️ Boss threat dialog button clicked');
        document.body.removeChild(dialogOverlay);
        resolve();
      });

      // Create the dialog content
      const title = document.createElement('h2');
      title.style.cssText = 'margin: 0 0 20px 0; color: #ff3333; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);';
      title.textContent = '👹 BOSS';

      const message = document.createElement('p');
      message.style.cssText = 'font-size: 18px; margin: 20px 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);';
      message.textContent = '"Go back and I may let you live, your insect!"';

      // Assemble the dialog
      dialogBox.appendChild(title);
      dialogBox.appendChild(message);
      dialogBox.appendChild(button);
      dialogOverlay.appendChild(dialogBox);

      console.log('🔍 Boss threat dialog created, adding to DOM...');
      document.body.appendChild(dialogOverlay);
      console.log('✅ Boss threat dialog added to DOM successfully');
    });
  }

  async playQueenBlessingSequence(knight) {
    console.log('👑 Playing queen blessing sequence');
    
    // Show queen blessing dialog first
    await this.showQueenBlessingDialog();
    
    // Then trigger the existing queen blessing animation
    if (knight.playQueenBlessingAnimation) {
      await knight.playQueenBlessingAnimation();
    }
    await this.wait(1000);
  }

  async showQueenBlessingDialog() {
    return new Promise((resolve) => {
      // Create dialog overlay
      const dialogOverlay = document.createElement('div');
      dialogOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: Arial, sans-serif;
      `;

      const dialogBox = document.createElement('div');
      dialogBox.style.cssText = `
        background: linear-gradient(135deg, #4a148c, #7b1fa2);
        border: 4px solid #e1bee7;
        border-radius: 15px;
        padding: 30px;
        max-width: 500px;
        text-align: center;
        color: #f3e5f5;
        box-shadow: 0 0 30px rgba(225, 190, 231, 0.6);
        position: relative;
      `;

      // Add royal glow effect
      dialogBox.style.background = `
        linear-gradient(135deg, #4a148c, #7b1fa2),
        radial-gradient(circle at center, rgba(255, 215, 0, 0.1), transparent)
      `;

      // Create button element directly
      const button = document.createElement('button');
      button.style.cssText = `
        background: linear-gradient(135deg, #7b1fa2, #9c27b0);
        color: #f3e5f5;
        border: 2px solid #e1bee7;
        padding: 12px 30px;
        font-size: 16px;
        cursor: pointer;
        border-radius: 8px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        transition: all 0.3s;
        box-shadow: 0 4px 15px rgba(156, 39, 176, 0.4);
      `;
      button.textContent = 'Accept Blessing';
      
      // Add hover effect
      button.addEventListener('mouseenter', () => {
        button.style.background = 'linear-gradient(135deg, #9c27b0, #ab47bc)';
        button.style.transform = 'translateY(-2px)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.background = 'linear-gradient(135deg, #7b1fa2, #9c27b0)';
        button.style.transform = 'translateY(0)';
      });
      
      // Add click event directly to the button element
      button.addEventListener('click', () => {
        console.log('🖱️ Queen blessing dialog button clicked');
        document.body.removeChild(dialogOverlay);
        resolve();
      });

      // Create the dialog content
      const title = document.createElement('h2');
      title.style.cssText = `
        margin: 0 0 20px 0; 
        color: #e1bee7; 
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        font-size: 24px;
      `;
      title.textContent = '👑 THE QUEEN';

      const message = document.createElement('p');
      message.style.cssText = `
        font-size: 18px; 
        margin: 20px 0; 
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        line-height: 1.4;
      `;
      message.textContent = '"My brave knight, accept my divine blessing. May the light guide your blade against the darkness ahead."';

      // Add crown decoration
      const crown = document.createElement('div');
      crown.style.cssText = `
        font-size: 32px;
        margin-bottom: 10px;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
      `;
      crown.textContent = '👑';

      // Assemble the dialog
      dialogBox.appendChild(crown);
      dialogBox.appendChild(title);
      dialogBox.appendChild(message);
      dialogBox.appendChild(button);
      dialogOverlay.appendChild(dialogBox);

      console.log('🔍 Queen blessing dialog created, adding to DOM...');
      document.body.appendChild(dialogOverlay);
      console.log('✅ Queen blessing dialog added to DOM successfully');
    });
  }

  async playBossAngerSequence(boss) {
    // Play boss anger animation
    console.log('😡 Playing boss anger animation');
    if (boss.playAngerAnimation) {
      await boss.playAngerAnimation();
    }

    // Show boss anger dialog
    return new Promise((resolve) => {
      const dialogOverlay = document.createElement('div');
      dialogOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: Arial, sans-serif;
      `;

      const dialogBox = document.createElement('div');
      dialogBox.style.cssText = `
        background: #2a1810;
        border: 4px solid #8b4513;
        border-radius: 10px;
        padding: 30px;
        max-width: 500px;
        text-align: center;
        color: #ff6b35;
        box-shadow: 0 0 20px rgba(255, 107, 53, 0.5);
      `;

      // Create button element directly
      const button = document.createElement('button');
      button.style.cssText = `
        background: #8b4513;
        color: white;
        border: 2px solid #ff6b35;
        padding: 12px 30px;
        font-size: 16px;
        cursor: pointer;
        border-radius: 5px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        transition: all 0.3s;
      `;
      button.textContent = 'Next';
      
      // Add click event directly to the button element
      button.addEventListener('click', () => {
        console.log('🖱️ Boss anger dialog button clicked');
        document.body.removeChild(dialogOverlay);
        resolve();
      });

      // Create the dialog content
      const title = document.createElement('h2');
      title.style.cssText = 'margin: 0 0 20px 0; color: #ff3333; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);';
      title.textContent = '👹 BOSS';

      const message = document.createElement('p');
      message.style.cssText = 'font-size: 18px; margin: 20px 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);';
      message.textContent = '"Now I will remove you from this earth! Die!!"';

      // Assemble the dialog
      dialogBox.appendChild(title);
      dialogBox.appendChild(message);
      dialogBox.appendChild(button);
      dialogOverlay.appendChild(dialogBox);

      console.log('🔍 Boss anger dialog created, adding to DOM...');
      document.body.appendChild(dialogOverlay);
      console.log('✅ Boss anger dialog added to DOM successfully');
    });
  }

  async executeBossSpecialAttack(boss, knight, knightDirection) {
    console.log(`🔥 Boss executes special attack!`);
    
    // Choose random special attack
    const specialAttacks = ['fire', 'blade', 'lightning'];
    const randomAttack = specialAttacks[Math.floor(Math.random() * specialAttacks.length)];
    
    console.log(`👹 Boss uses ${randomAttack} special attack!`);
    
    // Play boss special attack animation
    if (boss.playSpecialAttackAnimation) {
      await boss.playSpecialAttackAnimation(randomAttack);
    }
    
    await this.wait(500);
    
    // Play knight hurt animation
    await this.playKnightHurtAnimation(knight, knightDirection);
  }

  async showBossDefeatDialog() {
    return new Promise((resolve) => {
      const dialogOverlay = document.createElement('div');
      dialogOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: Arial, sans-serif;
      `;

      const dialogBox = document.createElement('div');
      dialogBox.style.cssText = `
        background: #1a3d2e;
        border: 4px solid #4CAF50;
        border-radius: 10px;
        padding: 30px;
        max-width: 500px;
        text-align: center;
        color: #90EE90;
        box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
      `;

      // Create button element directly
      const button = document.createElement('button');
      button.style.cssText = `
        background: #4CAF50;
        color: white;
        border: 2px solid #90EE90;
        padding: 12px 30px;
        font-size: 16px;
        cursor: pointer;
        border-radius: 5px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        transition: all 0.3s;
      `;
      button.textContent = 'Continue';
      
      // Add click event directly to the button element
      button.addEventListener('click', () => {
        console.log('🖱️ Boss defeat dialog button clicked');
        document.body.removeChild(dialogOverlay);
        resolve();
      });

      // Create the dialog content
      const title = document.createElement('h2');
      title.style.cssText = 'margin: 0 0 20px 0; color: #4CAF50; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);';
      title.textContent = '⚔️ VICTORY!';

      const message = document.createElement('p');
      message.style.cssText = 'font-size: 18px; margin: 20px 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);';
      message.textContent = 'The boss has been defeated! The path to the princess is clear.';

      // Assemble the dialog
      dialogBox.appendChild(title);
      dialogBox.appendChild(message);
      dialogBox.appendChild(button);
      dialogOverlay.appendChild(dialogBox);

      console.log('🔍 Boss defeat dialog created, adding to DOM...');
      document.body.appendChild(dialogOverlay);
      console.log('✅ Boss defeat dialog added to DOM successfully');
    });
  }

  async playBossDeathSequence(boss) {
    console.log('💀 Playing boss death sequence');
    
    // Play boss death animation
    if (boss.playDeathAnimation) {
      await boss.playDeathAnimation();
    }
    
    // Wait a moment for death animation to complete
    await this.wait(1000);
    
    // Remove boss from scene
    if (boss.removeFromScene) {
      boss.removeFromScene();
    }
  }

  async executeSpecialKnightAttack(knight, enemy, knightDirection) {
    console.log(`⚔️ Knight attacks with queen's blessing!`);
    
    // Play knight attack animation with special blessing effects
    // Wait for knight attack animation to complete, which includes blessing effect
    const knightAttackPromise = knight.playSpecialAttackAnimation();
    
    // Wait a moment for blessing effect to start, then play boss hurt animation
    await this.wait(800); // Let blessing animation play for a bit
    
    // Play boss hurt animation while blessing effect is still playing
    const bossHurtPromise = this.playEnemyHurtAnimation(enemy, knightDirection);
    
    // Wait for both animations to complete
    await Promise.all([knightAttackPromise, bossHurtPromise]);
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

    await this.wait(500);
    
    // For boss fights, also play special boss attack animation
    let bossAttackPromise = Promise.resolve();
    if (isBossFight && knight.spellEffectManager) {
      console.log('🔥 Boss fight detected - playing special boss attack animation!');
      
      bossAttackPromise = new Promise((resolve) => {
        knight.spellEffectManager.playBossAttackEffect(
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
