const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const projectsDirectory = path.join(root, 'projects');
const publicDirectory = path.join(root, 'public');
const outputDirectory = path.join(root, 'dist');
const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);

function compareNames(left, right) {
  return left.localeCompare(right, 'en', { sensitivity: 'base', numeric: true });
}

function collectImages(directory, relativeDirectory = '') {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((left, right) => compareNames(left.name, right.name))
    .flatMap((entry) => {
      const relativePath = path.join(relativeDirectory, entry.name);
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectImages(fullPath, relativePath);
      }
      if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
        return [{ fullPath, relativePath }];
      }
      return [];
    });
}

function encodePath(relativePath) {
  return relativePath.split(path.sep).map(encodeURIComponent).join('/');
}

if (!fs.existsSync(projectsDirectory)) {
  throw new Error('Missing projects directory.');
}

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.cpSync(publicDirectory, outputDirectory, { recursive: true });

const manifest = fs.readdirSync(projectsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
  .sort((left, right) => compareNames(left.name, right.name))
  .map((projectDirectoryEntry) => {
    const projectName = projectDirectoryEntry.name;
    const sourceDirectory = path.join(projectsDirectory, projectName);
    const images = collectImages(sourceDirectory);
    const photos = images.map(({ fullPath, relativePath }) => {
      const destinationRelativePath = path.join(projectName, relativePath);
      const destination = path.join(outputDirectory, 'projects', destinationRelativePath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(fullPath, destination);
      return {
        id: destinationRelativePath,
        file: `./projects/${encodePath(destinationRelativePath)}`
      };
    });

    const title = projectName
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

    return { id: projectName, title, photos };
  });

fs.writeFileSync(
  path.join(outputDirectory, 'projects.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
);
fs.writeFileSync(path.join(outputDirectory, '.nojekyll'), '');
console.log(`Built ${manifest.length} projects with ${manifest.reduce((total, project) => total + project.photos.length, 0)} photos.`);
