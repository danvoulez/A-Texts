# Contributing to ArenaLab

## Development Setup

### Prerequisites
- Node.js 18+ or Node.js 20+
- pnpm 9+
- Wrangler CLI (for Cloudflare Workers)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/arenalab.git
cd arenalab

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Running Locally

```bash
# Start Cloudflare Worker in dev mode
pnpm dev

# This runs: wrangler dev in apps/api-worker
# API available at http://localhost:8787
```

## Project Structure

```
ArenaLab/
├── apps/
│   └── api-worker/          # Cloudflare Worker application
├── packages/
│   ├── atomic/              # JSON✯Atomic schema
│   ├── ledger/              # Append-only ledger
│   ├── search/              # Vector and inverted search
│   ├── predictor/           # Trajectory matching
│   └── ...                  # Other packages
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
└── infra/                   # Infrastructure configs
```

## Coding Standards

### TypeScript
- Use `strict` mode (enforced in tsconfig.base.json)
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Document complex functions with JSDoc

### Style
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline objects/arrays

### Linting
```bash
pnpm lint
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm -C packages/predictor test

# Run tests in watch mode
pnpm test -- --watch
```

## Making Changes

### Branch Naming
- Feature: `feature/description`
- Bug fix: `fix/description`
- Docs: `docs/description`

### Commit Messages
Follow conventional commits:
- `feat: add trajectory matching algorithm`
- `fix: correct confidence calibration`
- `docs: update API documentation`
- `refactor: simplify search module`
- `test: add tests for matcher`

### Pull Request Process

1. **Fork and Clone**
2. **Create Branch**: `git checkout -b feature/my-feature`
3. **Make Changes**: Write code and tests
4. **Test**: `pnpm test` and `pnpm build`
5. **Commit**: Use conventional commit format
6. **Push**: `git push origin feature/my-feature`
7. **Open PR**: Describe changes and link related issues

### PR Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No linter errors
- [ ] Builds successfully
- [ ] All tests pass

## Package Development

### Creating a New Package

```bash
mkdir -p packages/my-package/src
cd packages/my-package

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@arenalab/my-package",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.0.0"
  }
}
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

# Create src/index.ts
echo 'export const hello = () => "Hello from my-package";' > src/index.ts
```

### Building a Package

```bash
cd packages/my-package
pnpm build
```

### Testing a Package

```bash
cd packages/my-package
pnpm test
```

## Documentation

- Keep docs up to date with code changes
- Use markdown for all documentation
- Include code examples where helpful
- Reference Formula.md for detailed algorithms

## Code Review Guidelines

### As Author
- Keep PRs focused and small
- Write clear PR description
- Respond to feedback promptly
- Update based on review comments

### As Reviewer
- Be respectful and constructive
- Focus on correctness, clarity, and maintainability
- Ask questions if something is unclear
- Approve when satisfied or request changes

## Testing Philosophy

- **Unit tests**: Test individual functions
- **Integration tests**: Test module interactions
- **End-to-end tests**: Test API endpoints
- Aim for >80% code coverage
- Test edge cases and error conditions

## Performance

- Profile before optimizing
- Use appropriate data structures
- Avoid premature optimization
- Document performance-critical sections

## Security

- Never commit secrets or API keys
- Use environment variables for config
- Validate all inputs
- Follow principle of least privilege

## Questions?

- Open a GitHub issue for bugs
- Start a discussion for questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
