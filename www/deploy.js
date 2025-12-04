/**
 * Deploy script for www Cloud Function and Firebase Hosting
 * 
 * Usage:
 *   node deploy.js - Deploy both Cloud Function and static files to Firebase
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

// Deploy static files to Firebase Hosting
console.log('Deploying static files to Firebase Hosting...');
try {
    execSync('firebase deploy --only hosting', {
        stdio: 'inherit',
        cwd: __dirname
    });
} catch (error) {
    console.error('Firebase Hosting deployment failed:', error.message);
    process.exit(1);
}

// Deploy Cloud Function
console.log('\nCopying platform modules...');
copyDir(PLATFORM_SRC, PLATFORM_DEST);

console.log('Deploying to Google Cloud Functions...');
try {
    const envVars = [
        'doc_domain=https://doc.voxxlr.com',
        'app_domain=https://app.voxxlr.com', 
        'www_domain=https://us-central1-voxxlr.cloudfunctions.net/www',
        'cdn_domain=https://voxxlr.web.app'
    ].join(',');
    
    // Reference secrets from Secret Manager
    const secrets = 'secret=JWT_SECRET:latest,login=LOGIN_CONFIG:latest';
    
    execSync(`gcloud functions deploy www --runtime nodejs22 --trigger-http --allow-unauthenticated --entry-point www --set-env-vars "${envVars}" --set-secrets "${secrets}"`, {
        stdio: 'inherit',
        cwd: __dirname
    });
    
    console.log('\n✓ Deployment complete!');
    console.log('  Cloud Function: https://us-central1-voxxlr.cloudfunctions.net/www');
    console.log('  Firebase CDN:   https://voxxlr.web.app');
} catch (error) {
    console.error('Cloud Function deployment failed:', error.message);
} finally {
    console.log('Cleaning up...');
    fs.rmSync(PLATFORM_DEST, { recursive: true });
}
