# Contributing to TC Work Zone Locator

Thank you for your interest in contributing to the TC Work Zone Locator project!

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Git
- A GitHub account

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/roadfinder.git
   cd roadfinder
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Start development server**
   ```bash
   bun run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📝 Code Standards

### TypeScript

- Use TypeScript for all new files
- Define interfaces for all data structures
- Use union types for constrained string values
- Avoid `any` type when possible

### Code Style

- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Indentation**: 2 spaces
- **Line width**: 100 characters max

Run Prettier before committing:
```bash
npx prettier --write .
```

### Component Structure

```
src/
├── app/                    # Next.js App Router pages
│   └── [page]/
│       └── page.tsx
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── [Component].tsx     # Custom components
└── lib/
    └── [module].ts         # Utility functions and data
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `SavedLocations.tsx` |
| Functions | camelCase | `getWorkZone()` |
| Interfaces | PascalCase | `WorkZoneResult` |
| Constants | SCREAMING_SNAKE | `DEFAULT_REGION` |
| Files | kebab-case | `route-optimizer.ts` |

## 🧪 Testing

### Manual Testing

Before submitting a PR, test these core features:

1. **Work Zone Lookup**
   - Select region and road
   - Enter SLK values
   - Verify results display correctly

2. **GPS Tracking** (`/drive`)
   - Start tracking
   - Verify SLK updates
   - Check speed limit display

3. **Offline Mode**
   - Download data
   - Disable network
   - Verify offline functionality

4. **AfterCare** (`/aftercare`)
   - Create job
   - Add signs
   - Test status calculations

### Test Checklist

See `docs/RC1_Test_Checklist.md` for comprehensive testing guide.

## 🔧 Development Guidelines

### State Management

- Use React `useState` for local component state
- Use `useMemo` for expensive calculations
- Use `localStorage` for user preferences
- Use `IndexedDB` for large datasets (roads, speed zones)

### API Routes

- Place in `src/app/api/[route]/route.ts`
- Use standard HTTP methods (GET, POST, DELETE)
- Return JSON responses with proper status codes

### Adding New Features

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes following code standards**

3. **Update documentation**
   - Update relevant docs in `/docs`
   - Update `PROJECT_CONTEXT.md` if architecture changes
   - Add to `worklog.md`

4. **Commit with descriptive message**
   ```bash
   git commit -m "Add: Feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📚 Documentation

### Key Documentation Files

| File | Purpose |
|------|---------|
| `PROJECT_CONTEXT.md` | Main project context for AI sessions |
| `docs/TC_Work_Zone_Locator_RC1_Documentation.md` | Full application documentation |
| `docs/TC_Work_Zone_Locator_Data_Dictionary.md` | Data structures reference |
| `docs/RC1_Test_Checklist.md` | Testing checklist |

### Updating Version

When making changes, update version in:
1. `package.json` - `version` field
2. `PROJECT_CONTEXT.md` - `Current Version` field
3. Page headers (if displaying version)

## 🐛 Bug Reports

When reporting bugs, include:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser/device info
5. Console errors (if any)

## 📦 Project Structure

```
roadfinder/
├── src/
│   ├── app/              # Next.js pages and API routes
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utilities and data management
├── docs/                 # Documentation
├── public/               # Static assets
├── scripts/              # Build and utility scripts
└── worklog.md            # Development history
```

## 🙏 Recognition

Contributors will be recognized in the project documentation.

---

Questions? Open an issue or discussion on GitHub.
