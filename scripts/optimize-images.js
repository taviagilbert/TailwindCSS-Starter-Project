// scripts/optimize-images.js
const sharp = require("sharp");
const { globSync } = require("glob");
const fs = require("fs-extra");
const path = require("path");

// --- Configuration ---
const TASKS = [
  {
    inputDir: "src/assets/images",
    outputDir: "dist/assets/images",
  },
  {
    inputDir: "demo/assets/images",
    outputDir: "dist/demo/assets/images",
  },
];

// Define image quality settings
const SETTINGS = {
  jpeg: { quality: 80, progressive: true },
  png: { quality: 80, compressionLevel: 9 },
  webp: { quality: 75 },
  avif: { quality: 65 },
};

/**
 * Copies files that don't need optimization (e.g., SVG, GIF).
 * @param {string[]} filePaths - Array of file paths to copy.
 * @param {string} inputDir - The base input directory for calculating relative paths.
 * @param {string} outputDir - The base output directory.
 * @param {object} stats - The statistics object to update.
 */
function copyOtherFiles(filePaths, inputDir, outputDir, stats) {
  for (const inputPath of filePaths) {
    try {
      const relativePath = path.relative(inputDir, inputPath);
      const outputPath = path.join(outputDir, relativePath);

      fs.ensureDirSync(path.dirname(outputPath));
      fs.copyFileSync(inputPath, outputPath);

      stats.copied++;
      console.log(`📋 Copied: ${relativePath}`);
    } catch (error) {
      stats.errors++;
      console.error(`❌ Error copying ${inputPath}:`, error.message);
    }
  }
}

/**
 * Processes and optimizes a batch of raster images (JPG, PNG).
 * @param {string[]} imagePaths - Array of image paths to process.
 * @param {string} inputDir - The base input directory for calculating relative paths.
 * @param {string} outputDir - The base output directory.
 * @param {object} stats - The statistics object to update.
 */
async function optimizeRasterImages(imagePaths, inputDir, outputDir, stats) {
  for (const inputPath of imagePaths) {
    try {
      // Determine output paths
      const relativePath = path.relative(inputDir, inputPath);
      const { name, dir } = path.parse(relativePath);
      const outputSubDir = path.join(outputDir, dir);

      // Ensure the destination directory exists
      fs.ensureDirSync(outputSubDir);

      const image = sharp(inputPath);
      const extension = path.extname(inputPath).toLowerCase();

      // 1. Optimize and save the original file format
      if (extension === ".jpeg" || extension === ".jpg") {
        await image
          .clone()
          .jpeg(SETTINGS.jpeg)
          .toFile(path.join(outputSubDir, `${name}${extension}`));
      } else if (extension === ".png") {
        await image
          .clone()
          .png(SETTINGS.png)
          .toFile(path.join(outputSubDir, `${name}${extension}`));
      }

      // 2. Create and save modern formats (WebP and AVIF)
      await image
        .clone()
        .webp(SETTINGS.webp)
        .toFile(path.join(outputSubDir, `${name}.webp`));
      await image
        .clone()
        .avif(SETTINGS.avif)
        .toFile(path.join(outputSubDir, `${name}.avif`));

      stats.processed++;
      console.log(`✅ Optimized: ${relativePath}`);
    } catch (error) {
      stats.errors++;
      console.error(`❌ Error processing ${inputPath}:`, error.message);
    }
  }
}

// --- Main Execution ---
(async () => {
  console.log("🖼️ Starting image optimization...");

  const totalStats = { processed: 0, copied: 0, errors: 0 };

  // Loop through each task defined in the configuration
  for (const task of TASKS) {
    const { inputDir, outputDir } = task;

    // Check if the source directory exists before proceeding
    if (!fs.existsSync(inputDir)) {
      console.warn(`⚠️  Skipping: Input directory not found at '${inputDir}'`);
      continue;
    }

    console.log(`\n▶️  Processing task: '${inputDir}' -> '${outputDir}'`);
    fs.ensureDirSync(outputDir);

    // Find all images and other files
    const rasterImages = globSync(`${inputDir}/**/*.{jpg,jpeg,png}`);
    const otherFiles = globSync(`${inputDir}/**/*.{svg,gif,ico}`);

    // Run the optimization and copying processes
    await optimizeRasterImages(rasterImages, inputDir, outputDir, totalStats);
    copyOtherFiles(otherFiles, inputDir, outputDir, totalStats);
  }

  // Final report summarizing all tasks
  console.log("\n✨ Image optimization complete:");
  console.log(
    `   - ${totalStats.processed} images optimized (to JPEG/PNG, WebP, AVIF)`,
  );
  console.log(`   - ${totalStats.copied} files copied (SVG, GIF, ICO)`);
  if (totalStats.errors > 0) {
    console.log(`   - ${totalStats.errors} errors encountered`);
  }
})();
