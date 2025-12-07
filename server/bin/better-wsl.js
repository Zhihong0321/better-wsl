#!/usr/bin/env node

const { exec } = require('child_process');

console.log('Starting Better WSL...');

// Start the server
require('../index.js');

// Open the browser
const url = 'http://localhost:3000';
const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');

setTimeout(() => {
    exec(`${start} ${url}`);
    console.log(`Opened ${url}`);
}, 1500);
