// Load Scene
const loadInterface1 = require("./assets/scenes/load/interface/1.hbs");

// Character Selection Scene
const characterSelectionInterface2 = require("./assets/scenes/character_selection/interface/2.hbs");

// Play Scene
import playImgTilemapUntitledTilesheet from './assets/scenes/play/img/tilemap-untitled-tilesheet.png';


// We need to "use" the assets otherwise webpack won't do it's magic
const assets = [
  // Load Scene
  loadInterface1,

  // Character Selection Scene
  characterSelectionInterface2,

  // Play Scene
  playImgTilemapUntitledTilesheet
];

console.log("Number of assets loaded: " + assets.length);