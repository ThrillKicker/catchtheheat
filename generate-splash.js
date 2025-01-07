const sharp = require('sharp');
const fs = require('fs');

const sizes = [
    { width: 2048, height: 2732, name: 'apple-splash-2048-2732.png' },
    { width: 1668, height: 2388, name: 'apple-splash-1668-2388.png' },
    { width: 1536, height: 2048, name: 'apple-splash-1536-2048.png' },
    { width: 1125, height: 2436, name: 'apple-splash-1125-2436.png' },
    { width: 828, height: 1792, name: 'apple-splash-828-1792.png' }
];

// Ensure splash directory exists
if (!fs.existsSync('./assets/splash')) {
    fs.mkdirSync('./assets/splash', { recursive: true });
}

// Generate splash screens
sizes.forEach(size => {
    sharp('assets/favicon_io/apple-touch-icon.png')
        .resize(size.width, size.height, {
            fit: 'contain',
            background: { r: 44, g: 62, b: 80 } // #2c3e50
        })
        .toFile(`assets/splash/${size.name}`)
        .then(info => console.log(`Generated ${size.name}`))
        .catch(err => console.error(`Error generating ${size.name}:`, err));
}); 