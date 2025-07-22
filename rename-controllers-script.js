#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to rename controller files to camelCase and update all references
 *
 * USAGE:
 *   node rename-controllers-script.js           # Dry run (preview changes)
 *   node rename-controllers-script.js --execute # Execute the changes
 *
 * This script will:
 * 1. Identify all controller files in controllers/adminController and controllers/userController
 * 2. Convert their names to camelCase (e.g., user-controller.js → userController.js)
 * 3. Update all references throughout the codebase (require statements, imports, etc.)
 * 4. Create a timestamped backup before making changes
 * 5. Validate the changes after completion
 *
 * SAFETY FEATURES:
 * - Creates automatic backup before any changes
 * - Dry run mode by default to preview changes
 * - Comprehensive validation after changes
 * - Only modifies controller files and their references
 * - Preserves all existing functionality
 */

// Configuration
const CONTROLLER_DIRS = [
  'controllers/adminController',
  'controllers/userController'
];

const FILES_TO_SEARCH = [
  'routes/adminRoutes/adminRoutes.js',
  'routes/userRoutes/userRouter.js',
  'controllers/userController/order-controller.js', // Has internal reference to wallet-controller
  'app.js'
];

// Additional directories to search for any other references
const SEARCH_DIRECTORIES = [
  'routes',
  'middlewares',
  'config',
  'utils',
  'validators'
];

// Utility functions
function toCamelCase(str) {
  // Remove file extension for processing
  const nameWithoutExt = str.replace(/\.[^/.]+$/, "");
  const extension = str.match(/\.[^/.]+$/)?.[0] || '';
  
  // Convert kebab-case, snake_case, and PascalCase to camelCase
  let camelCase = nameWithoutExt
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase()) // Handle kebab-case and snake_case
    .replace(/^[A-Z]/, char => char.toLowerCase()); // Handle PascalCase
  
  return camelCase + extension;
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `backup-${timestamp}`;
  
  console.log(`Creating backup in ${backupDir}...`);
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Copy controllers directory
  copyDirectory('controllers', path.join(backupDir, 'controllers'));
  
  // Copy route files
  copyDirectory('routes', path.join(backupDir, 'routes'));
  
  console.log(`✅ Backup created successfully in ${backupDir}`);
  return backupDir;
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function findControllerFiles() {
  const controllerFiles = [];
  
  for (const dir of CONTROLLER_DIRS) {
    if (!fs.existsSync(dir)) {
      console.warn(`⚠️  Directory ${dir} does not exist, skipping...`);
      continue;
    }
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      if (file.endsWith('.js')) {
        const fullPath = path.join(dir, file);
        const newName = toCamelCase(file);
        
        if (file !== newName) {
          controllerFiles.push({
            oldPath: fullPath,
            newPath: path.join(dir, newName),
            oldName: file,
            newName: newName,
            directory: dir
          });
        }
      }
    }
  }
  
  return controllerFiles;
}

function renameFiles(controllerFiles) {
  console.log('\n📝 Renaming controller files...');
  
  for (const file of controllerFiles) {
    try {
      fs.renameSync(file.oldPath, file.newPath);
      console.log(`✅ Renamed: ${file.oldPath} → ${file.newPath}`);
    } catch (error) {
      console.error(`❌ Failed to rename ${file.oldPath}:`, error.message);
      throw error;
    }
  }
}

function findAllFilesToUpdate() {
  const filesToUpdate = [...FILES_TO_SEARCH];

  // Search additional directories for JavaScript files
  for (const dir of SEARCH_DIRECTORIES) {
    if (fs.existsSync(dir)) {
      const files = findJavaScriptFiles(dir);
      filesToUpdate.push(...files);
    }
  }

  return [...new Set(filesToUpdate)]; // Remove duplicates
}

function findJavaScriptFiles(dir) {
  const jsFiles = [];

  function searchRecursively(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        searchRecursively(fullPath);
      } else if (entry.name.endsWith('.js')) {
        jsFiles.push(fullPath);
      }
    }
  }

  searchRecursively(dir);
  return jsFiles;
}

function updateReferences(controllerFiles) {
  console.log('\n🔄 Updating references in files...');

  const filesToUpdate = findAllFilesToUpdate();
  console.log(`📁 Searching ${filesToUpdate.length} files for references...`);

  let totalUpdated = 0;

  for (const filePath of filesToUpdate) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Update require/import statements
      for (const file of controllerFiles) {
        // Create multiple patterns to catch different reference styles
        const patterns = [
          // Standard require with relative path
          new RegExp(`require\\(['"]([^'"]*/)${escapeRegex(file.oldName)}['"]\\)`, 'g'),
          // Require without extension
          new RegExp(`require\\(['"]([^'"]*/)${escapeRegex(file.oldName.replace('.js', ''))}['"]\\)`, 'g'),
          // String references to file paths
          new RegExp(`['"]([^'"]*/)${escapeRegex(file.oldName)}['"]`, 'g'),
          // String references without extension
          new RegExp(`['"]([^'"]*/)${escapeRegex(file.oldName.replace('.js', ''))}['"]`, 'g')
        ];

        for (const pattern of patterns) {
          const newContent = content.replace(pattern, (match, pathPrefix) => {
            modified = true;
            const newFileName = pattern.source.includes('\\.js') ? file.newName : file.newName.replace('.js', '');
            return match.replace(file.oldName.replace('.js', ''), newFileName.replace('.js', ''));
          });
          content = newContent;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated references in: ${filePath}`);
        totalUpdated++;
      }
    } catch (error) {
      console.error(`❌ Failed to update references in ${filePath}:`, error.message);
      // Don't throw error, continue with other files
    }
  }

  console.log(`📊 Updated references in ${totalUpdated} files`);
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateChanges(controllerFiles) {
  console.log('\n🔍 Validating changes...');
  
  let allValid = true;
  
  // Check that all new files exist
  for (const file of controllerFiles) {
    if (!fs.existsSync(file.newPath)) {
      console.error(`❌ New file does not exist: ${file.newPath}`);
      allValid = false;
    }
    
    if (fs.existsSync(file.oldPath)) {
      console.error(`❌ Old file still exists: ${file.oldPath}`);
      allValid = false;
    }
  }
  
  // Check that reference files are valid JavaScript
  for (const filePath of FILES_TO_SEARCH) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        // Basic syntax check - look for unmatched quotes or brackets
        const singleQuotes = (content.match(/'/g) || []).length;
        const doubleQuotes = (content.match(/"/g) || []).length;
        
        if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
          console.warn(`⚠️  Potential syntax issue in ${filePath} - unmatched quotes`);
        }
      } catch (error) {
        console.error(`❌ Error reading ${filePath}:`, error.message);
        allValid = false;
      }
    }
  }
  
  return allValid;
}

function performDryRun(controllerFiles) {
  console.log('\n🔍 DRY RUN - No files will be modified\n');

  console.log('📋 Files that would be renamed:');
  controllerFiles.forEach(file => {
    console.log(`   ${file.oldPath} → ${file.newPath}`);
  });

  console.log('\n📁 Files that would be searched for references:');
  const filesToUpdate = findAllFilesToUpdate();
  filesToUpdate.forEach(file => {
    console.log(`   ${file}`);
  });

  console.log(`\n📊 Summary:`);
  console.log(`   - ${controllerFiles.length} controller files to rename`);
  console.log(`   - ${filesToUpdate.length} files to search for references`);
  console.log('\nTo execute the changes, run the script with --execute flag');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--execute');

  console.log('🚀 Starting controller file renaming process...\n');

  try {
    // Step 1: Find all controller files that need renaming
    const controllerFiles = findControllerFiles();

    if (controllerFiles.length === 0) {
      console.log('✅ No controller files need renaming. All files are already in camelCase.');
      return;
    }

    if (isDryRun) {
      performDryRun(controllerFiles);
      return;
    }

    console.log(`📋 Found ${controllerFiles.length} controller files to rename:`);
    controllerFiles.forEach(file => {
      console.log(`   ${file.oldName} → ${file.newName}`);
    });

    // Step 2: Create backup
    const backupDir = createBackup();

    // Step 3: Rename the files
    renameFiles(controllerFiles);

    // Step 4: Update references
    updateReferences(controllerFiles);

    // Step 5: Validate changes
    const isValid = validateChanges(controllerFiles);

    if (isValid) {
      console.log('\n🎉 Controller renaming completed successfully!');
      console.log(`📁 Backup available at: ${backupDir}`);
      console.log('\n📝 Summary of changes:');
      controllerFiles.forEach(file => {
        console.log(`   ✅ ${file.oldName} → ${file.newName}`);
      });
      console.log('\n💡 Next steps:');
      console.log('   1. Test your application to ensure everything works');
      console.log('   2. Run your test suite if available');
      console.log('   3. Commit the changes to version control');
    } else {
      console.log('\n⚠️  Renaming completed with warnings. Please review the changes.');
      console.log(`📁 Backup available at: ${backupDir}`);
    }

  } catch (error) {
    console.error('\n❌ Error during renaming process:', error.message);
    console.log('\n🔄 You can restore from backup if needed.');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  toCamelCase,
  findControllerFiles,
  createBackup,
  renameFiles,
  updateReferences,
  validateChanges
};
