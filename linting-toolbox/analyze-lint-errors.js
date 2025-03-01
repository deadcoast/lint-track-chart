/* eslint-env node */
import fs from 'fs';
import { clearTimeout, setImmediate, setTimeout } from 'node:timers';

/**
 * Analyzes ESLint JSON output to categorize and prioritize errors
 *
 * USAGE (STEP 2 - Run after setup-linting.js):
 *   npx eslint . --format json | node tools/analyze-lint-errors.js
 *
 * DESCRIPTION:
 *   This tool analyzes ESLint output to provide a comprehensive breakdown of linting issues.
 *   It categorizes issues by rule, file, and directory to help prioritize fixes.
 *   The script processes ESLint JSON output from stdin and displays a detailed report.
 *
 * OPTIONS:
 *   --no-progress    Disable progress bar during processing
 *   --debug          Enable debug logging for troubleshooting
 *   --timeout=<ms>   Set timeout for processing (default: 30000ms)
 *
 * EXAMPLES:
 *   # Analyze all files in the project
 *   npx eslint . --format json | node tools/analyze-lint-errors.js
 *
 *   # Analyze a specific directory
 *   npx eslint src/ --format json | node tools/analyze-lint-errors.js
 *
 *   # Analyze with debug information and no progress bar
 *   npx eslint . --format json | node tools/analyze-lint-errors.js --debug --no-progress
 *
 * OUTPUT FILES:
 *   - lint-analysis-report.json - Detailed JSON report of all linting issues
 *
 * NEXT STEPS AFTER RUNNING:
 *   1. Fix issues: node tools/fix-eslint-by-rule.js
 *   2. Track progress: node tools/track-eslint-progress.js
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  showProgress: !args.includes('--no-progress'),
  debug: args.includes('--debug'),
  timeout: 30000, // Default timeout: 30 seconds
};

// Parse timeout value if provided
const timeoutArg = args.find(arg => arg.startsWith('--timeout='));
if (timeoutArg) {
  const timeoutValue = parseInt(timeoutArg.split('=')[1], 10);
  if (!isNaN(timeoutValue) && timeoutValue > 0) {
    options.timeout = timeoutValue;
  }
}

// Debug logging function
function debug(message) {
  if (options.debug) {
    console.error(`[DEBUG] ${message}`);
  }
}

// Simple progress bar function with error handling
function updateProgressBar(current, total, barLength = 30) {
  if (!options.showProgress) {
    return;
  }

  try {
    const progress = Math.min(100, Math.round((current / total) * 100));
    const filledLength = Math.min(barLength, Math.round((current / total) * barLength));
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    process.stdout.write(`\r[${bar}] ${progress}% | Processed ${current}/${total} files`);

    if (current === total) {
      process.stdout.write('\n');
    }
  } catch (error) {
    console.error(`\nError updating progress bar: ${error.message}`);
    // Disable progress bar if it fails
    options.showProgress = false;
  }
}

// Set a timeout to prevent hanging
const timeoutId = setTimeout(() => {
  console.error(`\n\nScript execution timed out after ${options.timeout}ms`);
  console.error('Try running with --no-progress or increase timeout with --timeout=<ms>');
  process.exit(1);
}, options.timeout);

// Read from stdin (piped from eslint)
let data = '';
let dataSize = 0;
let chunkCount = 0;

debug('Starting to read from stdin...');

process.stdin.on('data', chunk => {
  try {
    chunkCount++;
    dataSize += chunk.length;
    data += chunk;
    debug(`Received chunk #${chunkCount}, size: ${chunk.length} bytes, total: ${dataSize} bytes`);
  } catch (error) {
    console.error(`\nError processing input chunk: ${error.message}`);
  }
});

process.stdin.on('end', () => {
  try {
    debug(`Finished reading input: ${dataSize} bytes in ${chunkCount} chunks`);
    console.log('Parsing ESLint results...');

    if (data.trim() === '') {
      console.error('Error: No input data received. Make sure ESLint is generating output.');
      clearTimeout(timeoutId);
      process.exit(1);
    }

    let lintResults;
    try {
      lintResults = JSON.parse(data);
      debug(`Successfully parsed JSON data: ${lintResults.length} files`);
    } catch (error) {
      console.error(`Error parsing JSON: ${error.message}`);
      console.error('Make sure ESLint is outputting valid JSON format');
      if (options.debug) {
        console.error('First 200 characters of input:');
        console.error(data.substring(0, 200));
      }
      clearTimeout(timeoutId);
      process.exit(1);
    }

    console.log(`Analyzing ${lintResults.length} files for linting issues...`);
    analyzeErrors(lintResults);

    // Clear the timeout since we're done
    clearTimeout(timeoutId);
  } catch (error) {
    console.error(`\nUnexpected error: ${error.message}`);
    clearTimeout(timeoutId);
    process.exit(1);
  }
});

function analyzeErrors(results) {
  try {
    debug('Starting analysis of lint results');

    // Collect all errors and warnings
    const allIssues = [];
    const fileIssueCount = {};
    const ruleFrequency = {};
    const dirStats = {};

    // Setup progress tracking
    const totalFiles = results.length;
    let processedFiles = 0;

    console.log('\nProcessing files:');
    updateProgressBar(0, totalFiles);

    // Process files in batches to avoid blocking the event loop
    const batchSize = 50;
    let currentBatch = 0;

    const processBatch = () => {
      const start = currentBatch * batchSize;
      const end = Math.min(start + batchSize, totalFiles);

      debug(`Processing batch ${currentBatch + 1}: files ${start} to ${end - 1}`);

      for (let i = start; i < end; i++) {
        const result = results[i];
        try {
          processFile(result, allIssues, fileIssueCount, ruleFrequency, dirStats);
          processedFiles++;
          updateProgressBar(processedFiles, totalFiles);
        } catch (error) {
          console.error(`\nError processing file ${result?.filePath || i}: ${error.message}`);
          // Continue with next file
        }
      }

      currentBatch++;

      if (end < totalFiles) {
        // Schedule next batch
        setImmediate(processBatch);
      } else {
        // All batches processed, generate report
        generateReport(allIssues, fileIssueCount, ruleFrequency, dirStats);
      }
    };

    // Start processing batches
    processBatch();
  } catch (error) {
    console.error(`\nError in analyzeErrors: ${error.message}`);
    clearTimeout(timeoutId);
    process.exit(1);
  }
}

function processFile(result, allIssues, fileIssueCount, ruleFrequency, dirStats) {
  const { filePath } = result;
  const fileDir = filePath.split('/').slice(0, -1).join('/');

  // Count issues per directory
  if (!dirStats[fileDir]) {
    dirStats[fileDir] = { errors: 0, warnings: 0 };
  }

  // Track issues per file
  if (!fileIssueCount[filePath]) {
    fileIssueCount[filePath] = 0;
  }

  // Process all messages
  if (Array.isArray(result.messages)) {
    result.messages.forEach(msg => {
      try {
        // Use object destructuring for better readability
        const { ruleId, severity, line, message } = msg;

        allIssues.push({
          filePath,
          ruleId,
          severity: severity === 2 ? 'error' : 'warning',
          line,
          message,
        });

        // Track rule frequency
        if (!ruleFrequency[ruleId]) {
          ruleFrequency[ruleId] = { errors: 0, warnings: 0 };
        }

        if (severity === 2) {
          ruleFrequency[ruleId].errors++;
          dirStats[fileDir].errors++;
        } else {
          ruleFrequency[ruleId].warnings++;
          dirStats[fileDir].warnings++;
        }

        fileIssueCount[filePath]++;
      } catch (error) {
        debug(`Error processing message in ${filePath}: ${error.message}`);
        // Continue with next message
      }
    });
  } else {
    debug(`No messages array in result for ${filePath}`);
  }
}

function generateReport(allIssues, fileIssueCount, ruleFrequency, dirStats) {
  try {
    debug('Generating analysis report');
    console.log('\nGenerating analysis report...');

    // Sort and output top issues by rule
    console.log('\n=== TOP LINTING ISSUES BY RULE ===');
    const sortedRules = Object.entries(ruleFrequency).sort(
      (a, b) => b[1].errors + b[1].warnings - (a[1].errors + a[1].warnings)
    );

    sortedRules.slice(0, 15).forEach(([rule, counts]) => {
      if (rule) {
        // Check for null/undefined rule IDs
        console.log(`${rule}: ${counts.errors} errors, ${counts.warnings} warnings`);
      }
    });

    // Sort and output top issues by file
    console.log('\n=== TOP FILES WITH MOST ISSUES ===');
    const sortedFiles = Object.entries(fileIssueCount).sort((a, b) => b[1] - a[1]);

    sortedFiles.slice(0, 10).forEach(([file, count]) => {
      const shortPath = file.split('/').slice(-3).join('/');
      console.log(`${shortPath}: ${count} issues`);
    });

    // Directory statistics
    console.log('\n=== ISSUES BY DIRECTORY ===');
    const sortedDirs = Object.entries(dirStats).sort(
      (a, b) => b[1].errors + b[1].warnings - (a[1].errors + a[1].warnings)
    );

    sortedDirs.slice(0, 10).forEach(([dir, counts]) => {
      const shortDir = dir.split('/').slice(-2).join('/');
      console.log(`${shortDir}: ${counts.errors} errors, ${counts.warnings} warnings`);
    });

    // Generate fix commands
    console.log('\n=== SUGGESTED FIX COMMANDS ===');
    sortedRules.slice(0, 5).forEach(([rule]) => {
      if (rule) {
        console.log(`npx eslint --cache src/ --rule '{${rule}: error}' --fix`);
      }
    });

    // Overall stats
    const totalErrors = allIssues.filter(issue => issue.severity === 'error').length;
    const totalWarnings = allIssues.filter(issue => issue.severity === 'warning').length;

    console.log('\n=== SUMMARY ===');
    console.log(
      `Total issues: ${allIssues.length} (${totalErrors} errors, ${totalWarnings} warnings)`
    );
    console.log(`Affected files: ${Object.keys(fileIssueCount).length}`);
    console.log(`Rule types: ${Object.keys(ruleFrequency).length}`);

    // Generate report file
    const report = {
      summary: {
        total: allIssues.length,
        errors: totalErrors,
        warnings: totalWarnings,
        files: Object.keys(fileIssueCount).length,
      },
      topRules: sortedRules.slice(0, 20).filter(([rule]) => rule), // Filter out null rules
      topFiles: sortedFiles.slice(0, 20),
      topDirs: sortedDirs.slice(0, 15),
    };

    try {
      fs.writeFileSync('lint-analysis-report.json', JSON.stringify(report, null, 2));
      console.log('\nDetailed report saved to lint-analysis-report.json');
    } catch (error) {
      console.error(`\nError writing report file: ${error.message}`);
    }

    debug('Analysis complete');
  } catch (error) {
    console.error(`\nError generating report: ${error.message}`);
  }
}

// Call the main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error.message);
  process.exit(1);
});