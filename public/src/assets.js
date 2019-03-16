// images
import imgTilesheet from './assets/img/tilemap-untitled-tilesheet.png';

// tilemaps
const tilemapUntitled = require('./assets/tilemap/untitled.json');

const assets = [
  // images
  imgTilesheet,

  // tilemaps
  tilemapUntitled
];

console.log("Number of assets loaded: " + assets.length);