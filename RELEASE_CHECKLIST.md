# Release Checklist

Complete this checklist before every release to production.

---

## Pre-Release Checks

### 1. Code Quality

- [ ] All tests pass: `bun run test`
- [ ] Lint passes: `bun run lint`
- [ ] TypeScript compiles: `bun run typecheck`
- [ ] Build succeeds: `bun run build`

### 2. Documentation

- [ ] README.md is up to date
- [ ] CHANGELOG.md updated with new version entry
- [ ] All doc files in `/docs` are current
- [ ] No TODO/FIXME comments in critical code

### 3. Version Update

- [ ] Update version in `package.json`
- [ ] Update version in `README.md` badge
- [ ] Add entry to `CHANGELOG.md`

### 4. Testing

- [ ] Manual test of core features (see test checklist below)
- [ ] Test on mobile device
- [ ] Test offline functionality
- [ ] Verify GPS tracking works

---

## Version Increment Guide

| Change Type | Increment | Example |
|-------------|-----------|---------|
| Bug fix | Patch | 1.9.1 → 1.9.2 |
| New feature | Minor | 1.9.1 → 1.10.0 |
| Breaking change | Major | 1.9.1 → 2.0.0 |

---

## Release Steps

### Step 1: Final Checks

```
Ask AI: "Run documentation sync check: verify version consistency, check for TODOs, verify all doc files exist."
```

### Step 2: Update Version

Update these files with new version number:
1. `package.json` - "version" field
2. `README.md` - badge URL
3. `CHANGELOG.md` - add new section

### Step 3: Commit and Tag

```
Ask AI: "Create release commit for version X.X.X and create git tag vX.X.X"
```

### Step 4: Push

```
Ask AI: "Push to main and master branches, and push the new tag"
```

### Step 5: Verify Deployment

- [ ] Check Vercel deployment succeeded
- [ ] Test production site
- [ ] Verify CI badge shows green

---

## Core Features Test Checklist

### Work Zone Lookup (`/`)
- [ ] Region dropdown loads
- [ ] Road dropdown populates based on region
- [ ] SLK input works
- [ ] Results display correctly
- [ ] Google Maps links work

### GPS Tracking (`/drive`)
- [ ] GPS acquires position
- [ ] SLK updates in real-time
- [ ] Speed limit displays
- [ ] Direction indicator works

### Offline Mode
- [ ] Data download works
- [ ] App functions without internet
- [ ] Data persists after reload

### AfterCare (`/aftercare`)
- [ ] Job creation works
- [ ] Sign management works
- [ ] Status calculations correct

---

## Rollback Procedure

If release has critical issues:

```
Ask AI: "Rollback to previous version: git reset --hard vX.X.X and force push"
```

Or manually:
```bash
git checkout main
git reset --hard <previous-tag>
git push origin main --force
git push origin master --force
```

---

## Post-Release

- [ ] Verify production site works
- [ ] Check error logs (if applicable)
- [ ] Update worklog.md with release notes
- [ ] Announce release (if applicable)

---

**Current Version: 1.9.1**

**Last Updated: 2026-03-28**
