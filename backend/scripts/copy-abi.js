const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.resolve(__dirname, '../artifacts/contracts');
const destDir = path.resolve(__dirname, '../dist/contracts');

async function copyAbiFiles() {
  try {
    // Ensure destination directory exists
    await fs.ensureDir(destDir);

    // Find all JSON files in source directory (recursively)
    const files = await fs.readdir(sourceDir);
    
    for (const file of files) {
      const filePath = path.join(sourceDir, file);
      const stat = await fs.lstat(filePath);
      
      if (stat.isDirectory()) {
        const subFiles = await fs.readdir(filePath);
        for (const subFile of subFiles) {
          if (subFile.endsWith('.json')) {
            const sourceFile = path.join(filePath, subFile);
            const destFile = path.join(destDir, subFile);
            await fs.copy(sourceFile, destFile);
            console.log(`Copied ${subFile} to ${destDir}`);
          }
        }
      }
    }
    
    console.log('ABI files copied successfully!');
  } catch (error) {
    console.error('Error copying ABI files:', error);
    process.exit(1);
  }
}

copyAbiFiles();