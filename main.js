// main.js - Entry point for the dungeon rescue application
import { PageManager } from './PageManager.js';
import { DungeonInputPage } from './DungeonInputPage.js';
import { DungeonGamePage } from './DungeonGamePage.js';

// Initialize the page management system
const pageManager = new PageManager();

// Create and register pages
const inputPage = new DungeonInputPage();
const gamePage = new DungeonGamePage();

pageManager.registerPage('input', inputPage);
pageManager.registerPage('game', gamePage);

// Make pageManager globally available so pages can use it
window.pageManager = pageManager;

// Start with the input page
pageManager.showPage('input');

console.log('🎮 Dungeon Rescue application initialized');
