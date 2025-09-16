// scripts/optimize-images.js
const sharp = require("sharp");
const { globSync } = require("glob");
const fs = require("fs-extra");
const path = require("path");

// Configuration
const config = {
  inputDir: "src/assets/images",
  outputDirs: ["dist/assets/images", "demo/assets/images"],
  jpeg: { quality: 80, progressive: true },
  png: { quality: 80, compressionLevel: 9 },
  webp: { quality: 75 },
  avif: { quality: 65 },
};

// Create all output directories if they don't exist
config.outputDirs.forEach((dir) => fs.ensureDirSync(dir));

// Process images based on their formats
(async () => {
  console.log("🖼️ Starting image optimization...");

  const allImageFiles = globSync(
    `${config.inputDir}/**/*.{jpg,jpeg,png,svg,gif,ico}`,
  );

  // Track counts for reporting
  const stats = {
    processed: 0,
    copied: 0,
    errors: 0,
  };

  const specialFilePatterns = ["android-chrome", "apple-touch-icon", "favicon"];

  // Copy assets to all output directories
  const copyAsset = (filePath) => {
    try {
      const relativePath = path.relative(config.inputDir, filePath);
      for (const outputDir of config.outputDirs) {
        const outputPath = path.join(outputDir, relativePath);
        fs.ensureDirSync(path.dirname(outputPath));
        fs.copyFileSync(filePath, outputPath);
      }
      stats.copied++;
      console.log(`📋 Copied: ${relativePath}`);
    } catch (error) {
      stats.errors++;
      console.error(`❌ Error copying ${filePath}:`, error.message);
    }
  };

  for (const inputPath of allImageFiles) {
    const fileName = path.basename(inputPath);
    const isSpecialFile =
      specialFilePatterns.some((pattern) => fileName.startsWith(pattern)) ||
      fileName.endsWith(".ico") ||
      fileName.endsWith(".svg") ||
      fileName.endsWith(".gif");

    if (isSpecialFile) {
      copyAsset(inputPath);
      continue;
    }

    try {
      const relativePath = path.relative(config.inputDir, inputPath);
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      // Loop through each output directory for processing
      for (const outputDir of config.outputDirs) {
        const baseOutputPath = path.join(outputDir, relativePath);
        fs.ensureDirSync(path.dirname(baseOutputPath));

        if (metadata.format === "jpeg" || inputPath.match(/\.(jpg|jpeg)$/i)) {
          await image.clone().jpeg(config.jpeg).toFile(baseOutputPath);
          await image
            .clone()
            .webp(config.webp)
            .toFile(baseOutputPath.replace(/\.(jpg|jpeg)$/i, ".webp"));
          await image
            .clone()
            .avif(config.avif)
            .toFile(baseOutputPath.replace(/\.(jpg|jpeg)$/i, ".avif"));
        } else if (metadata.format === "png" || inputPath.match(/\.png$/i)) {
          await image.clone().png(config.png).toFile(baseOutputPath);
          await image
            .clone()
            .webp(config.webp)
            .toFile(baseOutputPath.replace(/\.png$/i, ".webp"));
          await image
            .clone()
            .avif(config.avif)
            .toFile(baseOutputPath.replace(/\.png$/i, ".avif"));
        }
      }

      stats.processed++;
      console.log(`✅ Optimized: ${relativePath}`);
    } catch (error) {
      stats.errors++;
      console.error(`❌ Error processing ${inputPath}:`, error.message);
    }
  }

  // Final report
  console.log("\n✨ Image optimization complete:");
  console.log(`  - ${stats.processed} images optimized`);
  console.log(`  - ${stats.copied} files copied`);
  if (stats.errors > 0) {
    console.log(`  - ${stats.errors} errors encountered`);
  }
})();
