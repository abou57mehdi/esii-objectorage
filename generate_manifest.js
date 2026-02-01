const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

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

function scanFiles(dir, manifest) {
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) {
        return;
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
                scanFiles(filePath, manifest);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            // Correctly escape the backslash for the regex: /\/g matches a single backslash
            const relativeDir = path.relative(ROOT_DIR, dir).replace(/\\/g, '/');
            const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

            if (ext === '.pdf') {
                if (!manifest.documents[relativeDir]) manifest.documents[relativeDir] = [];
                manifest.documents[relativeDir].push({
                    name: file,
                    path: relativePath,
                    size: stat.size,
                    sizeFormatted: formatBytes(stat.size),
                    lastModified: stat.mtime
                });
            } else if (ext === '.md' && dir.includes('blog')) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const { data } = matter(content);
                    manifest.blog.push({
                        slug: path.basename(file, '.md'),
                        path: relativePath,
                        title: data.title || file,
                        date: data.date || stat.mtime,
                        author: data.author || 'Anonyme',
                        category: data.category || 'Général',
                        description: data.description || '',
                        image: data.image || '',
                        lastModified: stat.mtime
                    });
                } catch (err) {
                    console.error(`Error parsing markdown ${file}:`, err);
                }
            }
        }
    });
}

console.log('Generating combined manifest...');
const manifest = {
    documents: {},
    blog: []
};

scanFiles(ROOT_DIR, manifest);

// Sort blog posts by date (newest first)
manifest.blog.sort((a, b) => new Date(b.date) - new Date(a.date));

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
console.log(`Manifest created! Indexed ${Object.keys(manifest.documents).length} folders and ${manifest.blog.length} blog posts.`);
