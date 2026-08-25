const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting optimized build process...');

// Set environment variables for faster build
process.env.NODE_ENV = 'production';
process.env.GENERATE_SOURCEMAP = 'false';
process.env.NEXT_TELEMETRY_DISABLED = '1';

// Clean previous build
console.log('🧹 Cleaning previous build...');
const dirs = ['.next', 'out', 'dist'];
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`   Removed ${dir}/`);
  }
});

// Run the build
console.log('📦 Building application...');
const startTime = Date.now();

try {
  execSync('npm run build', {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
  });
  
  const buildTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`✅ Build completed successfully in ${buildTime}s`);
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}