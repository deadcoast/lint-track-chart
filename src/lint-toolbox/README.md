# TypeScript Linting Toolbox

A modular toolbox for tracking, visualizing, and improving TypeScript code quality.

## Features

- 📊 Track and visualize linting progress over time
- 🛠️ Fix specific ESLint rules interactively
- 📈 Generate HTML reports with interactive charts
- 🔍 Compare different versions of your codebase
- 🎨 Customizable themes

## Installation

1. Install dependencies:

```bash
npm install
```

2. Make the script executable:

```bash
chmod +x index.js
```

## Usage

Run the toolbox:

```bash
./index.js
```

Or:

```bash
npm start
```

## Directory Structure

```
lint-toolbox/
├── index.js          # Main entry point
├── package.json      # Dependencies
├── lib/
│   ├── cli.js        # CLI menu and display functions
│   ├── commands/     # Command implementations
│   │   ├── track.js  # Linting analysis
│   │   ├── chart.js  # Progress visualization
│   │   ├── html.js   # HTML report generation
│   │   ├── fix.js    # Rule fixing
│   │   ├── compare.js # Version comparison
│   │   └── theme.js  # Theme management
│   ├── themes.js     # Theme definitions
│   └── utils.js      # Common utilities
├── templates/
│   └── report.html   # HTML report template
└── config/
    └── default.js    # Default configuration
```

## Extending

To add new commands:

1. Create a new file in `lib/commands/`
2. Implement your command function
3. Import it in `index.js`
4. Add it to the menu options

## License

MIT
