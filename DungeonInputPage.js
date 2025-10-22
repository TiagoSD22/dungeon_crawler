// DungeonInputPage.js - Handles the initial dungeon input screen
export class DungeonInputPage {
  constructor() {
    this.container = null;
    this.isVisible = false;
    console.log('🏰 DungeonInputPage initialized');
  }

  async show(data = null) {
    if (this.isVisible) return;

    this.createInputScreen();
    this.isVisible = true;
    console.log('📄 Showing dungeon input page');
  }

  async hide() {
    if (!this.isVisible) return;

    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.isVisible = false;
    console.log('📄 Hiding dungeon input page');
  }

  createInputScreen() {
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'dungeonInputScreen';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      font-family: 'Arial', sans-serif;
      color: #fff;
    `;

    // Create title
    const title = document.createElement('h1');
    title.textContent = '🏰 Dungeon Rescue - Create Your Adventure';
    title.style.cssText = `
      font-size: 2.5rem;
      margin-bottom: 2rem;
      text-align: center;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      background: linear-gradient(45deg, #ffd700, #ffed4e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    `;

    // Create instruction text
    const instructions = document.createElement('p');
    instructions.innerHTML = `
      Enter your dungeon layout below. Use positive numbers for power-up rooms,<br>
      negative numbers for threat rooms, and arrange them in a grid format.<br>
      <strong>Example:</strong> [-2, -3, 3], [-5, -10, 1], [10, 30, -5]
    `;
    instructions.style.cssText = `
      font-size: 1.1rem;
      margin-bottom: 2rem;
      text-align: center;
      line-height: 1.6;
      color: #ccc;
      max-width: 600px;
    `;

    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 600px;
      width: 90%;
    `;

    // Create textarea for dungeon input
    const dungeonInput = document.createElement('textarea');
    dungeonInput.id = 'dungeonInputTextarea';
    dungeonInput.placeholder = `Enter your dungeon layout:
[-2, -3, 3],
[-5, -10, 1],
[10, 30, -5]`;
    dungeonInput.style.cssText = `
      width: 100%;
      height: 200px;
      padding: 1rem;
      font-size: 1rem;
      font-family: 'Courier New', monospace;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid #444;
      border-radius: 8px;
      color: #fff;
      resize: vertical;
      box-sizing: border-box;
    `;

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
      justify-content: center;
    `;

    // Create load example button
    const loadExampleBtn = document.createElement('button');
    loadExampleBtn.textContent = '📝 Load Example';
    loadExampleBtn.style.cssText = `
      background: #4CAF50;
      border: none;
      color: white;
      padding: 12px 24px;
      font-size: 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
    `;
    loadExampleBtn.onmouseover = () => {
      loadExampleBtn.style.background = '#45a049';
      loadExampleBtn.style.transform = 'translateY(-2px)';
    };
    loadExampleBtn.onmouseout = () => {
      loadExampleBtn.style.background = '#4CAF50';
      loadExampleBtn.style.transform = 'translateY(0)';
    };

    // Create start adventure button
    const startBtn = document.createElement('button');
    startBtn.textContent = '🚀 Start Adventure';
    startBtn.style.cssText = `
      background: linear-gradient(45deg, #ff6b6b, #ee5a52);
      border: none;
      color: white;
      padding: 12px 24px;
      font-size: 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
    `;
    startBtn.onmouseover = () => {
      startBtn.style.background = 'linear-gradient(45deg, #ee5a52, #dd4b39)';
      startBtn.style.transform = 'translateY(-2px)';
    };
    startBtn.onmouseout = () => {
      startBtn.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a52)';
      startBtn.style.transform = 'translateY(0)';
    };

    // Create notification area
    const notificationArea = document.createElement('div');
    notificationArea.id = 'notificationArea';
    notificationArea.style.cssText = `
      margin-top: 1rem;
      min-height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Event listeners
    loadExampleBtn.addEventListener('click', () => {
      dungeonInput.value = `[-2, -3, 3],
[-5, -10, 1],
[10, 30, -5]`;
      this.clearNotification();
    });

    startBtn.addEventListener('click', () => {
      this.handleStartAdventure(dungeonInput.value.trim());
    });

    // Assembly
    buttonContainer.appendChild(loadExampleBtn);
    buttonContainer.appendChild(startBtn);
    
    inputContainer.appendChild(dungeonInput);
    inputContainer.appendChild(buttonContainer);
    inputContainer.appendChild(notificationArea);

    this.container.appendChild(title);
    this.container.appendChild(instructions);
    this.container.appendChild(inputContainer);

    document.body.appendChild(this.container);
  }

  async handleStartAdventure(inputText) {
    if (!inputText) {
      this.showNotification('Please enter a dungeon layout', 'error');
      return;
    }

    this.showNotification('Processing dungeon...', 'loading');

    try {
      // Parse the input text into a proper array format
      const dungeonArray = this.parseInput(inputText);
      
      // Send to backend API
      const result = await this.sendToBackend(dungeonArray);
      
      if (result.success) {
        this.showNotification('Dungeon processed successfully! Starting adventure...', 'success');
        
        // Wait a bit to show success message
        setTimeout(() => {
          this.startDungeonGame(result.data);
        }, 1500);
      } else {
        this.showNotification(result.error || 'Failed to process dungeon', 'error');
      }
    } catch (error) {
      console.error('Error processing dungeon:', error);
      this.showNotification('Invalid dungeon format. Please check your input.', 'error');
    }
  }

  parseInput(inputText) {
    try {
      // Clean up the input - remove whitespace and ensure proper format
      let cleanInput = inputText.trim();
      
      // Add square brackets if not present
      if (!cleanInput.startsWith('[')) {
        cleanInput = '[' + cleanInput;
      }
      if (!cleanInput.endsWith(']')) {
        cleanInput = cleanInput + ']';
      }

      // Parse as JSON
      const parsed = JSON.parse(cleanInput);
      
      // Validate that it's a 2D array
      if (!Array.isArray(parsed) || !parsed.every(row => Array.isArray(row))) {
        throw new Error('Input must be a 2D array');
      }

      // Validate that all rows have the same length
      const firstRowLength = parsed[0]?.length;
      if (!parsed.every(row => row.length === firstRowLength)) {
        throw new Error('All rows must have the same number of columns');
      }

      // Validate that all values are numbers
      for (const row of parsed) {
        for (const value of row) {
          if (typeof value !== 'number') {
            throw new Error('All values must be numbers');
          }
        }
      }

      return parsed;
    } catch (error) {
      throw new Error(`Invalid format: ${error.message}`);
    }
  }

  async sendToBackend(dungeonArray) {
    try {
      const response = await fetch('http://localhost:8080/api/dungeon/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: dungeonArray
        })
      });

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({ message: 'Invalid dungeon input' }));
          return {
            success: false,
            error: errorData.message || 'Invalid dungeon input. Please check your layout.'
          };
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Backend API error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Cannot connect to server. Make sure the backend is running on http://localhost:8080'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to connect to server'
      };
    }
  }

  startDungeonGame(dungeonData) {
    // Import and start the main game with the processed dungeon data
    if (window.pageManager) {
      window.pageManager.showPage('game', dungeonData);
    }
  }

  showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notificationArea');
    if (!notificationArea) return;

    notificationArea.innerHTML = '';

    const notification = document.createElement('div');
    notification.style.cssText = `
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 1rem;
      text-align: center;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `;

    switch (type) {
      case 'error':
        notification.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a52)';
        notification.style.color = '#fff';
        notification.innerHTML = `❌ ${message}`;
        break;
      case 'success':
        notification.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
        notification.style.color = '#fff';
        notification.innerHTML = `✅ ${message}`;
        break;
      case 'loading':
        notification.style.background = 'linear-gradient(45deg, #2196F3, #1976D2)';
        notification.style.color = '#fff';
        notification.innerHTML = `⏳ ${message}`;
        break;
      default:
        notification.style.background = 'rgba(255, 255, 255, 0.1)';
        notification.style.color = '#fff';
        notification.innerHTML = `ℹ️ ${message}`;
    }

    notificationArea.appendChild(notification);
  }

  clearNotification() {
    const notificationArea = document.getElementById('notificationArea');
    if (notificationArea) {
      notificationArea.innerHTML = '';
    }
  }

  dispose() {
    this.hide();
  }
}
