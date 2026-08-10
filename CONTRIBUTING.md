# Contributing to Compoviz

Thanks for your interest in contributing to Compoviz! 🎉

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22.12.0 or newer
- Corepack with the repository-pinned Yarn 4 release

### Local Development

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/compoviz.git
   cd compoviz
   ```

3. Install dependencies:

   ```bash
   corepack enable
   yarn install --immutable
   ```

4. Start the development server:

   ```bash
   # Optional: To disable Vercel Analytics just copy the .env.example file with:
   cp .env.example .env
   ```

   ```bash
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

### Testing

Run the test suite locally to ensure everything is working:

```bash
# Run all tests once
yarn test

# Run tests in watch mode
yarn test:watch

# Open Vitest UI for a better experience
yarn test:ui
```

### Scripts for Development & Testing

Below is a guide for local development, from cloning the repository to running and cleaning up Docker development environments. Each step is mapped to the corresponding Yarn script.

| Use Case                                | Command to Run                                                      | What It Does / Underlying Command                             |
| --------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| Clone & cd into repository              | `git clone https://github.com/magistrser/compoviz.git && cd compoviz` | Clones the Compoviz repository and changes into the directory |
| Install dependencies                    | `yarn install --immutable`                                          | Installs the locked Yarn dependency graph                     |
| Start Vite dev server (hot reload)      | `yarn dev`                                                          | `vite` on port 3000                                           |
| Build production bundle                 | `yarn build`                                                        | `tsc -b && vite build`                                        |
| Lint codebase                           | `yarn lint`                                                         | ESLint for TypeScript and TSX                                 |
| Typecheck codebase                      | `yarn typecheck`                                                    | Strict TypeScript without emitting files                      |
| Check formatting                        | `yarn format:check`                                                 | Prettier verification                                         |
| Run all quality checks                  | `yarn check`                                                        | Lint, typecheck, formatting, and tests                        |
| Run all tests (CI mode)                 | `yarn test`                                                         | `vitest run`                                                  |
| Run tests in watch mode                 | `yarn test:watch`                                                   | `vitest`                                                      |
| Run interactive test UI                 | `yarn test:ui`                                                      | `vitest --ui`                                                 |
| Preview production build                | `yarn preview`                                                      | `vite preview` on port 4173                                   |
| Build & Start container (with logging)  | `yarn docker:dev`                                                   | `docker compose up`                                           |
| Build & Start container (detached)      | `yarn docker:dev -- -d`                                             | `docker compose up -d`                                        |
| Restart running container               | `yarn docker:restart`                                               | `docker compose restart`                                      |
| Rebuild image and start container       | `yarn docker:rebuild`                                               | `yarn docker:dev --build`                                     |
| Stop and remove containers              | `yarn docker:down`                                                  | `docker compose down`                                         |
| Remove locally built image              | `yarn docker:image-rm`                                              | `docker image rm compoviz-dev:latest`                         |
| All-in-one stop & remove image          | `yarn docker:clean`                                                 | `docker compose down --rmi local --volumes`                   |
| Run docker compose with pre-built image | `docker compose -f compose/docker-compose.yml up -d`                | Runs docker compose using the pre-built image                 |

## How to Contribute

### Reporting Bugs

- Use the bug report template when creating an issue
- Include your browser version, OS, and steps to reproduce
- If possible, attach the problematic `docker-compose.yml` file

### Suggesting Features

- Use the feature request template
- Explain the use case and why it would benefit other users
- Check existing issues first to avoid duplicates

### Submitting Pull Requests

1. **Discuss first for big changes**: Open an issue to discuss major changes before investing time in a PR
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**: Keep commits focused and write clear commit messages
4. **Test locally**: Make sure the app builds and runs without errors
5. **Push and create a PR**: Push to your fork and submit a pull request

## Code Style

- Follow the existing code style in the project
- Use meaningful variable and function names
- Add comments for complex logic

## Project Structure

```
src/
├── app/            # BrowserRouter, provider stack, and route constants
├── pages/          # Lazy route entry points
├── components/     # Shared React components
├── features/       # Feature-local editor, diagram, and sidebar modules
├── hooks/          # Custom React hooks
├── models/         # Compose contracts and canonical AST
├── utils/          # Parsing, rendering, and support utilities
├── workers/        # Typed parser worker entry point
└── styles/         # Global SCSS
```

## Questions?

Feel free to open a discussion or reach out via GitHub issues.

Thanks for contributing! 🐳
