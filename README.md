# TypeScript Linting System

A comprehensive linting solution for TypeScript projects that helps you track, visualize, and fix code quality issues over time.

## Features

- ✅ Track ESLint and Prettier issues in TypeScript files
- 📊 Visualize your linting progress with ASCII charts
- 🛠️ Automatically fix issues for specific ESLint rules
- 📝 Generate detailed reports on your code quality progress
- 📈 Analyze trends and estimate completion time

## Installation

1. Place the following files in your project:

   - `lint-tracker.js` - The main linting tool
   - `.eslintrc.js` - ESLint configuration
   - `.prettierrc.json` - Prettier configuration

2. Install required dependencies:

```bash
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier eslint-config-prettier eslint-plugin-prettier eslint-plugin-import
```

## Usage

The `lint-tracker.js` script provides three main commands:

### 1. Track Your Progress

This records your current linting status to track progress over time:

```bash
node lint-tracker.js track
```

Options:
- `--details` - Include details about top issues (default)
- `--no-details` - Don't include details
- `--no-prettier` - Skip Prettier check
- `--top=N` - Number of top issues to display (default: 5)
- `--timeout=N` - Timeout in seconds (default: 60)

### 2. Visualize Your Progress

Generate a chart showing your linting progress over time:

```bash
node lint-tracker.js chart
```

Options:
- `--format=ascii` - Generate ASCII chart (default)
- `--format=json` - Output data as JSON

### 3. Fix Specific Issues

Automatically fix issues for a specific ESLint rule:

```bash
node lint-tracker.js fix --rule="@typescript-eslint/no-explicit-any"
```

Options:
- `--rule=RULE` - ESLint rule to fix (required)
- `--dry-run` - Show what would be fixed without making changes

### Global Options

These options work with all commands:

- `--help, -h` - Show help information
- `--no-color` - Disable colored output
- `--verbose` - Show detailed information
- `--silent` - Suppress non-essential output

## Workflow

For the best results, follow this workflow:

1. **Initial Assessment**: Run `node lint-tracker.js track` to create your baseline
2. **Visualize Issues**: Run `node lint-tracker.js chart` to see your starting point
3. **Fix Top Issues**: Use `node lint-tracker.js fix --rule="RULE"` to fix the most frequent issues
4. **Track Progress**: Run `track` again to record your improvements
5. **Repeat**: Continue this cycle until all issues are fixed

## Output Files

The tool creates and updates the following files:

- `lint-progress.log` - Contains history of linting progress entries

## Customization

You can modify the tool to fit your project's needs by editing the CONFIG object in `lint-tracker.js`:

```javascript
const CONFIG = {
  // File paths
  logFile: 'lint-progress.log',
  
  // File patterns for linting
  filePatterns: ['ts', 'tsx'],
  fileGlobs: '"src/**/*.ts" "src/**/*.tsx"',
  
  // Directories to ignore
  ignoreDirs: ['node_modules', 'dist', 'build', '.git'],
  
  // Analysis options
  includeDetails: true,
  topIssuesCount: 5,
  checkPrettier: true,
  
  // Performance settings
  timeout: 60, // seconds
};
```

## Best Practices

1. Run the tracker regularly after fixing batches of issues
2. Focus on fixing one rule at a time for better progress
3. Start with auto-fixable rules to make rapid progress
4. Use the chart to celebrate your improvements
5. Consider running the tool in CI/CD pipelines to track progress in PRs

## Troubleshooting

If you encounter any issues:

- Ensure all dependencies are installed correctly
- Check that your ESLint and Prettier configurations are valid
- Try running with `--verbose` flag for more detailed output
- For timeout errors, increase the timeout with `--timeout=120`