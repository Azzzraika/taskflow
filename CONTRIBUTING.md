# Contributing Guide

## Branch Strategy (Git Flow)

```
main     ─── production-ready code
  │
  └── dev ─── integration branch for features
        │
        ├── feature/auth         ─── жаңа мүмкіндік
        ├── feature/task-crud
        ├── feature/drag-drop
        ├── fix/login-redirect   ─── қате түзету
        └── refactor/api-hooks   ─── рефакторинг
```

## Workflow

1. **Жаңа жұмыс бастар алдында:**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/твоя-фича
   ```

2. **Commit жасағанда:**
   ```bash
   git add .
   git commit -m "feat: add user authentication"
   ```

3. **Push және Pull Request:**
   ```bash
   git push origin feature/твоя-фича
   # GitHub-та PR жаса: feature/твоя-фича → dev
   ```

## Commit Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Типтер:**
- `feat` — жаңа мүмкіндік
- `fix` — қате түзету
- `docs` — құжаттама
- `style` — форматтау (пробел, нүкте-үтір)
- `refactor` — код рефакторингі
- `test` — тесттер
- `chore` — build, deps

**Мысалдар:**
```
feat(auth): add password reset
fix(task): correct status update after drag
docs(readme): add setup instructions
refactor(hooks): extract useTaskFilter hook
```

## Code Style

- **TypeScript**: қатаң типтер, `any` қолданба
- **Компоненттер**: функционалды, PascalCase
- **Хуктар**: `use` префиксі, camelCase
- **CSS**: Tailwind класстарын қолдан
- **Файлдар**: `kebab-case.tsx`

## PR Requirements

- [ ] Код өзіңді тексерілген
- [ ] `npm run lint` қатесіз өтеді
- [ ] `npm run build` қатесіз жиналады
- [ ] PR сипаттамасы бар
- [ ] Reviewer тағайындалған
