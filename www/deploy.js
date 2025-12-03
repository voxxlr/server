/**
 * Deploy script for www Cloud Function
 * 
 * Usage:
 *   node deploy.js - Copy platform, deploy to GCP, cleanup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PLATFORM_SRC = path.join(__dirname, '..', '_platform', 'gce');
const PLATFORM_DEST = path.join(__dirname, 'platform');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Copying platform modules...');
copyDir(PLATFORM_SRC, PLATFORM_DEST);

console.log('Deploying to Google Cloud Functions...');
try {
    execSync('gcloud functions deploy www --runtime nodejs18 --trigger-http --allow-unauthenticated --entry-point www', {
        stdio: 'inherit',
        cwd: __dirname
    });
} catch (error) {
    console.error('Deployment failed:', error.message);
} finally {
    console.log('Cleaning up...');
    fs.rmSync(PLATFORM_DEST, { recursive: true });
}
