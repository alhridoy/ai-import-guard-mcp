# Contributing to Affordance Discovery MCP

Thank you for your interest in contributing to the Affordance Discovery MCP server! This project aims to solve the problem of AI agents hallucinating imports by providing real-time discovery of available affordances.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/affordance-discovery-mcp.git
   cd affordance-discovery-mcp
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Run in development mode**:
   ```bash
   npm run dev
   ```

## Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:
   ```bash
   npm test
   npm run build
   ```

4. **Commit your changes**:
   ```bash
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## Code Style

- Use TypeScript for all new code
- Follow the existing code style (ESLint configuration)
- Add JSDoc comments for public APIs
- Use meaningful variable and function names

## Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting PR
- Test with real-world scenarios when possible

## Areas for Contribution

### High Priority
- **Multi-language support**: Add Python, Rust, Go discovery engines
- **Performance optimization**: Improve caching strategies
- **Error handling**: Better error messages and recovery

### Medium Priority
- **Documentation**: Improve examples and guides
- **Integration tests**: Test with popular AI coding tools
- **CLI interface**: Add command-line interface for testing

### Low Priority
- **Web interface**: Dashboard for monitoring
- **Metrics**: Performance and usage analytics
- **Plugin system**: Extensible discovery engines

## Submitting Issues

When submitting issues, please include:

- **Clear description** of the problem
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Environment details** (Node.js version, OS, etc.)
- **Relevant logs** or error messages

## Pull Request Guidelines

- **One feature per PR** - keep changes focused
- **Clear description** of what the PR does
- **Link to related issues** if applicable
- **Update documentation** if needed
- **Add tests** for new functionality

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers get started
- Follow GitHub's community guidelines

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

Thank you for contributing! 🚀
