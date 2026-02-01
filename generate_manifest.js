const fs = require('fs');
const path = require('path');

const ROOT_DIR = '.';
const OUTPUT_FILE = 'manifest.json';
const IGNORE_DIRS = ['.git', 'node_modules', 'assets'];

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function scanDirectory(dir, fileList = {}) {
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) {
        console.warn(`Could not read directory: ${dir}`);
        return fileList;
    }

    files.forEach(file => {
        const filePath = path.join(dir, file);
        let stat;
        try {
            stat = fs.statSync(filePath);
        } catch (e) {
            return;
        }

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                scanDirectory(filePath, fileList);
            }
        } else {
            if (file.toLowerCase().endsWith('.pdf')) {
                // Key is the directory path relative to root, normalized to forward slashes
                // e.g., "ISITD/S5/Technologies_de_donnees_massives/elt1"
                const relativeDir = path.relative(ROOT_DIR, dir).replace(/\\/g, '/');
                
                if (!fileList[relativeDir]) {
                    fileList[relativeDir] = [];
                }

                fileList[relativeDir].push({
                    name: file,
                    path: path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'),
                    size: stat.size,
                    sizeFormatted: formatBytes(stat.size),
                    lastModified: stat.mtime
                });
            }
        }
    });

    return fileList;
}

console.log('Generating manifest...');
const manifest = scanDirectory(ROOT_DIR);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
console.log(`Manifest generated successfully at ${OUTPUT_FILE}`);
console.log(`Found files in ${Object.keys(manifest).length} folders.`);
