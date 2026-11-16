
const fs = require('fs');
const path = require('path');

const standalone = path.join('.next', 'standalone');
const staticSource = path.join('.next', 'static');
const staticDestination = path.join(standalone, '.next', 'static');
const publicSource = 'public';
const publicDestination = path.join(standalone, 'public');

fs.mkdirSync(staticDestination, { recursive: true });
fs.cpSync(staticSource, staticDestination, { recursive: true });

if (fs.existsSync(publicSource)) {
  fs.mkdirSync(publicDestination, { recursive: true });
  fs.cpSync(publicSource, publicDestination, { recursive: true });
}

// Copy SQLite database into standalone deployment
const dbSource = 'db';
const dbDestination = path.join(standalone, 'db');

if (fs.existsSync(dbSource)) {
  fs.mkdirSync(dbDestination, { recursive: true });
  fs.cpSync(dbSource, dbDestination, { recursive: true });
  console.log('SQLite database copied successfully.');
}

console.log('Standalone deployment files copied successfully.');
