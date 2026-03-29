# AI Session Starter Prompt

Copy and paste this prompt at the start of each AI session to ensure best practices are followed.

---

## Standard Session Starter

```
I'm working on Roadfinder (TC Work Zone Locator RC 1.9.1).

GitHub: https://github.com/instructor-ship-it/roadfinder
Token: [Your GitHub token here]

BEFORE making any changes:
1. Read /home/z/my-project/worklog.md for session history
2. Run quality checks: bun run lint && bun run test && bun run typecheck
3. Verify current state is clean

WHEN making changes:
1. Update documentation alongside code (README, CHANGELOG, docs/)
2. Run tests before committing
3. Update version in package.json + README badge if it's a release
4. Commit with descriptive message following conventions

AFTER changes are complete:
1. Push to both main AND master branches
2. Update worklog.md with session summary
```

---

## Quick Prompts for Manual Checks

### Before Release

```
Run documentation sync check: verify version consistency between package.json and README, check for TODOs in code, verify all doc files exist.
```

### After Major Feature

```
Check best practice score: run lint, test, typecheck, and report any issues. Calculate the best practice score out of 100.
```

### Monthly Security

```
Run security audit: check for vulnerable dependencies using bun audit, check for outdated packages using bun outdated, and report findings.
```

### Before Version Increment

```
Prepare release for version X.X.X: update package.json, README.md badge, CHANGELOG.md, and create git tag.
```

---

## Version Increment Quick Reference

| Change Type     | Increment | Example        |
| --------------- | --------- | -------------- |
| Bug fix         | Patch     | 1.9.1 → 1.9.2  |
| New feature     | Minor     | 1.9.1 → 1.10.0 |
| Breaking change | Major     | 1.9.1 → 2.0.0  |

---

## Files to Update When Changing Version

1. `package.json` - version field
2. `README.md` - badge URL
3. `CHANGELOG.md` - add new section
4. Git tag: `vX.X.X`

---

## Current Project State

- **Version**: 1.9.7
- **Best Practice Score**: 100/100
- **CI Status**: Active (GitHub Actions)
- **Test Coverage**: 55 tests passing

---

**Save this file to your notes for easy access!**
