# Content Fox

An AI-powered story context tool built with Tauri, React, and TypeScript.

## Features

- **Desktop Mode**: High-performance desktop application built with Tauri.
- **Web Mode**: Fully functional web application that runs directly in your browser.
- **Hybrid Logic**: Core processing logic is implemented in TypeScript, enabling a unified experience across platforms.
- **Privacy First**: Local file processing in Desktop mode and in-memory processing in Web mode.

## Development

To start the application in development mode with Hot Module Replacement (HMR):

### Recommended Command
Using `npm`:
```bash
npm run tauri dev
```

Or using `cargo tauri`:
```bash
cargo tauri dev
```

> **Note:** Do not use `cargo run` directly for development. `cargo tauri dev` is required because it automatically starts the Vite development server for the React frontend and manages the connection between the Rust backend and the UI.

## Web Deployment (GitHub Pages)

This project is configured to be easily deployed to GitHub Pages.

1. Push your code to the `main` branch of your GitHub repository.
2. Go to **Settings** > **Pages** in your repository.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` will automatically build and deploy the app whenever you push to `main`.

## Building Desktop Version

To build the production version of the desktop application:
```bash
npm run tauri build
```
This will generate the installers for your current platform.
