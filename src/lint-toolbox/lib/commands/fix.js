import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getCurrentTheme } from '../themes.js';
import { waitForEnter, updateProgressBar, safeExec } from '../cli.js';
import config from '../../config/default.js';

/**
 * Fix specific ESLint rules interactively
 */
export const fix = async (options) => {
  console.clear();
  console.log('\n' + getCurrentTheme().titleStyle('✓ Fix ESLint Rules'));

  try {
    // Get current ESLint issues
    console.log('Running ESLint to get current issues...');
    const eslintOutput = execSync(
      `npx eslint ${config.sourceGlob} --format json`,
      { encoding: 'utf8' },
    );

    const eslintResults = JSON.parse(eslintOutput);

    if (!eslintResults.length) {
      console.log(getCurrentTheme().successStyle('\n🎉 No ESLint issues found!'));
      await waitForEnter();
      return;
    }

    // Collect all unique rules with their counts
    const ruleStats = new Map();
    eslintResults.forEach((result) => {
      result.messages.forEach((msg) => {
        const count = ruleStats.get(msg.ruleId) || 0;
        ruleStats.set(msg.ruleId, count + 1);
      });
    });

    // Convert to array and sort by frequency
    const sortedRules = Array.from(ruleStats.entries())
      .filter(([rule]) => rule) // Filter out null/undefined rules
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => ({
        rule,
        count,
        examples: eslintResults
          .flatMap((result) =>
            result.messages
              .filter((msg) => msg.ruleId === rule)
              .map((msg) => ({
                file: result.filePath,
                line: msg.line,
                message: msg.message,
              })),
          )
          .slice(0, 3), // Show up to 3 examples
      }));

    console.log(`\n${getCurrentTheme().titleStyle('=== ESLINT RULES SUMMARY ===')}`);
    console.log(`Found ${getCurrentTheme().highlightStyle(sortedRules.length.toString())} rules with issues\n`);

    // Display rule statistics
    sortedRules.forEach(({ rule, count, examples }) => {
      console.log(`${getCurrentTheme().errorStyle(rule)}: ${getCurrentTheme().warningStyle(count.toString())} occurrences`);
      examples.forEach((ex) => {
        console.log(`  ${getCurrentTheme().infoStyle('→')} ${path.relative(process.cwd(), ex.file)}:${ex.line}`);
        console.log(`    ${getCurrentTheme().optionStyle(ex.message)}`);
      });
      console.log('');
    });

    // Ask which rule to fix
    const { selectedRule } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedRule',
        message: 'Which rule would you like to fix?',
        choices: sortedRules.map(({ rule, count }) => ({
          name: `${rule} (${count} issues)`,
          value: rule,
        })),
      },
    ]);

    // Get affected files for the selected rule
    const affectedFiles = new Set();
    eslintResults.forEach((result) => {
      if (result.messages.some((msg) => msg.ruleId === selectedRule)) {
        affectedFiles.add(result.filePath);
      }
    });

    console.log(`\n${getCurrentTheme().titleStyle('=== FIX SUMMARY ===')}`);
    console.log(`Rule: ${getCurrentTheme().errorStyle(selectedRule)}`);
    console.log(`Affected files: ${getCurrentTheme().warningStyle(affectedFiles.size.toString())}`);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Would you like to attempt to fix this rule automatically?',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(getCurrentTheme().infoStyle('\nFix cancelled.'));
      await waitForEnter();
      return;
    }

    // Attempt to fix the selected rule
    console.log(`\n${getCurrentTheme().titleStyle('=== FIXING ISSUES ===')}`);
    console.log('Running ESLint fix...');

    const fixCommand = `npx eslint ${config.sourceGlob} --fix --rule '{"${selectedRule}": "error"}'`;

    try {
      execSync(fixCommand, { encoding: 'utf8' });

      // Check remaining issues
      const afterFixOutput = execSync(
        `npx eslint ${config.sourceGlob} --format json`,
        { encoding: 'utf8' },
      );

      const afterFixResults = JSON.parse(afterFixOutput);
      const remainingCount = afterFixResults
        .flatMap((r) => r.messages)
        .filter((m) => m.ruleId === selectedRule)
        .length;

      const fixedCount = ruleStats.get(selectedRule) - remainingCount;

      if (fixedCount > 0) {
        console.log(getCurrentTheme().successStyle(`\n✓ Successfully fixed ${fixedCount} issues!`));
        if (remainingCount > 0) {
          console.log(getCurrentTheme().warningStyle(`${remainingCount} issues require manual attention.`));
        }
      } else {
        console.log(getCurrentTheme().warningStyle('\nNo issues could be fixed automatically.'));
        console.log('These issues may require manual fixes.');
      }

      // Show example of remaining issues if any
      if (remainingCount > 0) {
        console.log(`\n${getCurrentTheme().titleStyle('=== REMAINING ISSUES ===')}`);
        afterFixResults.forEach((result) => {
          const ruleMessages = result.messages.filter((m) => m.ruleId === selectedRule);
          if (ruleMessages.length > 0) {
            console.log(`\n${getCurrentTheme().highlightStyle(path.relative(process.cwd(), result.filePath))}:`);
            ruleMessages.forEach((msg) => {
              console.log(`  Line ${msg.line}: ${getCurrentTheme().optionStyle(msg.message)}`);
            });
          }
        });
      }

    } catch (error) {
      console.error(getCurrentTheme().errorStyle('\nError while fixing issues:'), error.message);
    }

  } catch (error) {
    console.error(getCurrentTheme().errorStyle('\nError:'), error.message);
  }

  await waitForEnter();
};
