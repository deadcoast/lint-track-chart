import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { ESLint } from 'eslint';
import { getCurrentTheme } from '../themes.js';
import { waitForEnter } from '../cli.js';
import config from '../../config/default.js';

/**
 * Track current linting status and progress
 */
export const track = async (options = {}) => {
  console.clear();
  console.log('\n' + getCurrentTheme().titleStyle('✓ Tracking Linting Progress'));

  try {
    // Get config paths
    const reportDir = path.join(process.cwd(), config.paths.reports);
    const logFile = path.join(reportDir, 'lint.log');
    
    // Ensure directories exist
    fs.mkdirSync(reportDir, { recursive: true });

    // Determine source path
    const sourcePath = options.path || process.cwd();
    const patterns = options.type === 'custom' 
      ? [options.path]
      : ['**/*.{js,jsx,ts,tsx,mjs}'];

    // Add ignore patterns from config
    const ignorePatterns = config.eslint.ignorePattern;

    // Run ESLint analysis
    console.log('\nAnalyzing codebase...');

    // Initialize ESLint instance with minimal configuration for ESLint v9+
    const eslint = new ESLint({
      // Use the simplest configuration
      overrideConfig: {},
      // Don't error on unmatched patterns
      errorOnUnmatchedPattern: false
    });
    
    let eslintResults;
    let formattedResults;
    
    try {
      // Run linting
      eslintResults = await eslint.lintFiles(patterns);

      // Format results
      const formatter = await eslint.loadFormatter('json');
      const resultText = await formatter.format(eslintResults);
      formattedResults = JSON.parse(resultText);
    } catch (eslintError) {
      console.error(getCurrentTheme().errorStyle('\nESLint analysis failed:'));
      console.error(getCurrentTheme().errorStyle(eslintError.message));
      await waitForEnter();
      return;
    }

    // Calculate statistics
    const stats = {
      totalFiles: formattedResults.length,
      filesWithIssues: 0,
      errors: 0,
      warnings: 0,
      formatting: 0,
      ruleStats: new Map(),
      worstFiles: [],
      issuesByDirectory: new Map(),
    };

    // Process results
    formattedResults.forEach((result) => {
      if (result.messages.length > 0) {
        stats.filesWithIssues++;

        // Count errors and warnings
        const fileStats = {
          errors: 0,
          warnings: 0,
          formatting: 0,
        };

        result.messages.forEach((msg) => {
          if (msg.severity === 2) {
            stats.errors++;
            fileStats.errors++;
          } else if (msg.severity === 1) {
            stats.warnings++;
            fileStats.warnings++;
          }

          // Track rule statistics
          if (msg.ruleId) {
            const count = stats.ruleStats.get(msg.ruleId) || 0;
            stats.ruleStats.set(msg.ruleId, count + 1);
          }
        });

        // Track worst files
        stats.worstFiles.push({
          file: path.relative(process.cwd(), result.filePath),
          total: fileStats.errors + fileStats.warnings,
          errors: fileStats.errors,
          warnings: fileStats.warnings,
        });

        // Track directory statistics
        const dir = path.dirname(path.relative(process.cwd(), result.filePath));
        const dirStats = stats.issuesByDirectory.get(dir) || {
          errors: 0,
          warnings: 0,
          total: 0,
        };
        dirStats.errors += fileStats.errors;
        dirStats.warnings += fileStats.warnings;
        dirStats.total += fileStats.errors + fileStats.warnings;
        stats.issuesByDirectory.set(dir, dirStats);
      }
    });

    // Sort worst files by total issues
    stats.worstFiles.sort((a, b) => b.total - a.total);

    // Convert directory stats to array and sort
    stats.issuesByDirectory = Array.from(stats.issuesByDirectory.entries())
      .map(([directory, stats]) => ({ directory, ...stats }))
      .sort((a, b) => b.total - a.total);

    // Display results
    console.log(`\n${getCurrentTheme().titleStyle('=== LINTING SUMMARY ===')}`);
    console.log(`Total files scanned: ${getCurrentTheme().infoStyle(stats.totalFiles.toString())}`);
    console.log(`Files with issues: ${getCurrentTheme().warningStyle(stats.filesWithIssues.toString())}`);
    console.log(`Total errors: ${getCurrentTheme().errorStyle(stats.errors.toString())}`);
    console.log(`Total warnings: ${getCurrentTheme().warningStyle(stats.warnings.toString())}`);

    // Display worst offending files
    if (stats.worstFiles.length > 0) {
      console.log(`\n${getCurrentTheme().titleStyle('=== TOP 5 FILES WITH MOST ISSUES ===')}`);
      stats.worstFiles.slice(0, 5).forEach((file, index) => {
        console.log(`${index + 1}. ${file.file}`);
        console.log(`   ${getCurrentTheme().errorStyle(file.errors.toString())} errors, ${getCurrentTheme().warningStyle(file.warnings.toString())} warnings`);
      });
    }

    // Display directory breakdown
    if (stats.issuesByDirectory.length > 0) {
      console.log(`\n${getCurrentTheme().titleStyle('=== DIRECTORY BREAKDOWN ===')}`);
      stats.issuesByDirectory.slice(0, 5).forEach((dir, index) => {
        console.log(`${index + 1}. ${dir.directory}`);
        console.log(`   ${getCurrentTheme().errorStyle(dir.errors.toString())} errors, ${getCurrentTheme().warningStyle(dir.warnings.toString())} warnings`);
      });
    }

    // Display most common rules
    console.log(`\n${getCurrentTheme().titleStyle('=== MOST COMMON ISSUES ===')}`);
    Array.from(stats.ruleStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([rule, count]) => {
        console.log(`${rule}: ${getCurrentTheme().warningStyle(count.toString())} occurrences`);
      });

    // Save results to log file
    const timestamp = new Date().toISOString();
    const logEntry = `===== ${timestamp} =====\n${stats.errors + stats.warnings} problems (${stats.errors} errors, ${stats.warnings} warnings)\n`;

    fs.appendFileSync(logFile, logEntry);

    // Save detailed results to JSON
    const jsonResults = {
      timestamp,
      stats: {
        totalFiles: stats.totalFiles,
        filesWithIssues: stats.filesWithIssues,
        errors: stats.errors,
        warnings: stats.warnings,
      },
      worstFiles: stats.worstFiles,
      issuesByDirectory: stats.issuesByDirectory,
      ruleStats: Array.from(stats.ruleStats.entries()).map(([rule, count]) => ({
        rule,
        count,
      })),
    };

    // Save current results and move previous to backup
    const jsonPath = path.join(reportDir, 'lint-results.json');
    const previousPath = path.join(reportDir, 'previous.json');
    if (fs.existsSync(jsonPath)) {
      fs.renameSync(jsonPath, previousPath);
    }
    fs.writeFileSync(jsonPath, JSON.stringify(jsonResults, null, 2));

    console.log(`\n${getCurrentTheme().successStyle('✓ Analysis complete!')}`);
    console.log(`Results saved to ${getCurrentTheme().infoStyle(logFile)}`);
    console.log(`Detailed report saved to ${getCurrentTheme().infoStyle(jsonPath)}`);

  } catch (error) {
    console.error(`\n${getCurrentTheme().errorStyle('Error tracking linting progress:')}`, error.message);
  }

  await waitForEnter();
};
