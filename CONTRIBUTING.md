# Contributing to Stock Management System

Thank you for your interest in contributing to the Stock Management System! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

1. **Search existing issues** first to avoid duplicates
2. **Use the issue template** when creating new issues
3. **Provide detailed information** including:
   - Steps to reproduce the problem
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Environment details (OS, Node.js version, etc.)

### Suggesting Features

1. **Check existing feature requests** to avoid duplicates
2. **Describe the feature** clearly and explain why it would be useful
3. **Provide examples** of how the feature would work
4. **Consider the scope** - keep features focused and manageable

### Code Contributions

#### Getting Started

1. **Fork the repository**
2. **Clone your fork** locally
3. **Create a feature branch** from `main`
4. **Set up the development environment**

```bash
git clone https://github.com/your-username/stock-management-system.git
cd stock-management-system
npm install
cp .env.example .env.local
# Configure your .env.local file
npm run init-db
npm run dev
```

#### Development Guidelines

##### Code Style

- **Use TypeScript** for all new code
- **Follow existing code patterns** and conventions
- **Use meaningful variable and function names**
- **Add comments** for complex logic
- **Keep functions small** and focused on a single responsibility

##### Component Guidelines

- **Use functional components** with hooks
- **Implement proper error boundaries**
- **Follow the existing component structure**
- **Use TypeScript interfaces** for props and state
- **Implement proper loading states**

##### API Guidelines

- **Use proper HTTP status codes**
- **Implement comprehensive error handling**
- **Validate all inputs** using Zod or similar
- **Use parameterized queries** to prevent SQL injection
- **Follow RESTful conventions**

##### Database Guidelines

- **Use migrations** for schema changes
- **Add proper indexes** for performance
- **Use foreign key constraints** where appropriate
- **Follow naming conventions** (snake_case for columns)

#### Testing

- **Write tests** for new features and bug fixes
- **Ensure all tests pass** before submitting
- **Test both happy path and error cases**
- **Test database operations** with proper cleanup

```bash
npm test
npm run test:coverage
```

#### Commit Guidelines

Use conventional commit messages:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add password reset functionality
fix(api): resolve user authentication issue
docs(readme): update installation instructions
```

#### Pull Request Process

1. **Create a descriptive title** for your PR
2. **Fill out the PR template** completely
3. **Link related issues** using keywords (fixes #123)
4. **Ensure CI passes** (tests, linting, build)
5. **Request review** from maintainers
6. **Address feedback** promptly and professionally

##### PR Checklist

- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated (if needed)
- [ ] No breaking changes (or properly documented)
- [ ] Commit messages follow conventions
- [ ] PR description is clear and complete

## 🏗️ Project Structure

Understanding the project structure will help you contribute effectively:

```
stock-management-system/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── login/             # Authentication
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature components
├── lib/                  # Utility functions
├── scripts/              # Database and utility scripts
└── public/               # Static assets
```

## 🔧 Development Setup

### Prerequisites

- Node.js 18.17.0+
- MySQL 8.0+
- Git

### Environment Setup

1. **Copy environment file**:
```bash
cp .env.example .env.local
```

2. **Configure database**:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=stock
```

3. **Initialize database**:
```bash
npm run init-db
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run linting
- `npm run test-db` - Test database connection

## 📋 Issue Labels

We use labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `priority: high` - High priority issue
- `priority: low` - Low priority issue

## 🎯 Areas for Contribution

We welcome contributions in these areas:

### High Priority
- Bug fixes and stability improvements
- Performance optimizations
- Security enhancements
- Test coverage improvements

### Medium Priority
- New features (discuss first)
- UI/UX improvements
- Documentation improvements
- Code refactoring

### Low Priority
- Code style improvements
- Minor feature enhancements
- Example applications

## 📞 Getting Help

If you need help:

1. **Check the documentation** first
2. **Search existing issues** for similar problems
3. **Create a new issue** with the "question" label
4. **Join our discussions** for general questions

## 🏆 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes for significant contributions
- Special thanks in documentation

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You

Thank you for contributing to the Stock Management System! Your efforts help make this project better for everyone.
