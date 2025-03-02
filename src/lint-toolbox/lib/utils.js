import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getCurrentTheme } from './themes.js';

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Path to directory
 */
export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get all files in a directory recursively
 * @param {string} dir - Directory to search
 * @param {Array<string>} [extensions] - Optional file extensions to filter by
 * @returns {Array<string>} Array of file paths
 */
export function getAllFiles(dir, extensions = []) {
  const files = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile()) {
        if (extensions.length === 0 ||
            extensions.includes(path.extname(entry.name).toLowerCase().slice(1))) {
          files.push(fullPath);
        }
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * Check if a command exists in the system
 * @param {string} command - Command to check
 * @returns {boolean} Whether the command exists
 */
export function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the size of a file or directory
 * @param {string} path - Path to file or directory
 * @returns {number} Size in bytes
 */
export function getSize(path) {
  const stats = fs.statSync(path);

  if (stats.isFile()) {
    return stats.size;
  }

  if (stats.isDirectory()) {
    return fs.readdirSync(path)
      .map((file) => getSize(path + '/' + file))
      .reduce((acc, size) => acc + size, 0);
  }

  return 0;
}

/**
 * Read a JSON file safely
 * @param {string} filePath - Path to JSON file
 * @param {*} defaultValue - Default value if file doesn't exist or is invalid
 * @returns {*} Parsed JSON or default value
 */
export function readJsonSafe(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

/**
 * Write a JSON file safely
 * @param {string} filePath - Path to JSON file
 * @param {*} data - Data to write
 * @param {boolean} [pretty=true] - Whether to pretty print
 */
export function writeJsonSafe(filePath, data, pretty = true) {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    fs.writeFileSync(filePath, content);
  } catch (error) {
    console.error(getCurrentTheme().errorStyle('Error writing JSON file:'), error.message);
  }
}

/**
 * Get relative time string
 * @param {Date} date - Date to format
 * @returns {string} Relative time string
 */
export function getRelativeTimeString(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
}

/**
 * Create a backup of a file
 * @param {string} filePath - Path to file
 * @returns {string} Backup file path
 */
export function createBackup(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const dir = path.dirname(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(dir, `${base}.${timestamp}${ext}`);

  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
