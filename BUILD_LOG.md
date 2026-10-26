# Orbit Build Log

This file is a chronological record of what I built during the Meta Global AI Developer Hackathon, why I built it, and what I learned along the way.

---

## October 26, 2026

### Project Setup

**Built**
- Created the public `orbit` GitHub repository.
- Cloned the repository locally using GitHub Desktop.
- Opened the project in VS Code.
- Initialized a React application with Vite.
- Selected JavaScript and ESLint.
- Installed npm dependencies.
- Started the Vite development server at `localhost:5173`.

**Learned**
- React is being used to build Orbit's interface with reusable components.
- Vite creates and runs the development environment.
- npm installs and manages project dependencies.
- `node_modules` contains installed packages and normally should not be edited manually.
- ESLint checks JavaScript and React code for potential problems.
- `localhost` means the application is currently running only on my computer.

**Why it matters**
This created the technical foundation for Orbit before adding any AI functionality.

---

### First Orbit UI

**Built**
- Removed the default Vite starter interface.
- Replaced it with the first Orbit-specific React screen.
- Added the Orbit name, learning loop, and initial product description.

**Learned**
- `main.jsx` starts the React application and renders the `App` component.
- `App.jsx` contains the main React component.
- A React component can be a JavaScript function.
- The function returns JSX describing what should appear in the browser.
- Vite's Hot Module Replacement updates the browser automatically when files are saved.

**Why it matters**
This was the first point where the application stopped being the default Vite template and became Orbit-specific code.

**Commit**
`Create first Orbit UI`

---

## Next

Build the first interactive Orbit interface before connecting Meta Muse.