# TaskFlow — Командалық Task Manager (Supabase Edition)

Команда ішінде тапсырма басқару жүйесі. **React + TypeScript + Tailwind CSS + Supabase**.

## Функциялар

- 🔐 **User Authentication** — Supabase Auth арқылы тіркелу / кіру / шығу
- ✅ **Task CRUD** — Тапсырма құру, оқу, жаңарту, өшіру
- 📊 **Task Status** — Күтуде / Орындалуда / Дайын
- 🖱️ **Drag & Drop** — Сүйреп тастау арқылы мәртебесін өзгерту
- 👥 **Team Invitation** — Шақыру коды арқылы командаға қосылу
- 🔔 **Deadline Notification** — Дедлайн жақындағанда ескерту
- ⚡ **Real-time** — Тапсырмалар мен хабарландыруларды нақты уақытта жаңарту

## Технологиялар

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase (Auth, Database, Realtime)
- @dnd-kit (Drag & Drop)
- date-fns
- lucide-react
- react-hot-toast

## Жүктеу және іске қосу

### 1. Supabase орнату

1. [supabase.com](https://supabase.com) тіркеліңіз
2. Жаңа проект құрыңыз
3. SQL Editor ашыңыз
4. `supabase/migrations/001_initial_schema.sql` файлындағы SQL кодты орындаңыз
5. Settings → API ішінен **Project URL** және **anon public** API Key алыңыз

### 2. Жобаны орнату

```bash
# 1. Құралдарды орнату
npm install

# 2. .env файлын жасау
cp .env.example .env

# 3. .env ішіне Supabase деректерін жазу
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_key

# 4. Әзірлеу режимінде іске қосу
npm run dev

# 5. Браузерде ашу
http://localhost:5173
```

## Supabase Authentication баптау

Supabase Dashboard → Authentication → Providers:

- **Email** — қосулы (по умолчанию)
- **Confirm email** — қалауыңызша (өшіруге болады)

## Git Branch Strategy

```
main     ─── production-ready code
  │
  └── dev ─── integration branch
        │
        ├── feature/auth
        ├── feature/task-crud
        ├── feature/drag-drop
        ├── feature/team-invite
        ├── fix/login-redirect
        └── refactor/api-hooks
```

## Commit Naming Convention

| Типі | Сипаттама | Мысал |
|------|-----------|-------|
| `feat:` | Жаңа мүмкіндік | `feat: add task drag-and-drop` |
| `fix:` | Қате түзету | `fix: task status update bug` |
| `docs:` | Құжаттама | `docs: update README` |
| `style:` | Стиль өзгерістері | `style: fix button alignment` |
| `refactor:` | Рефакторинг | `refactor: extract task hook` |
| `test:` | Тесттер | `test: add auth unit tests` |
| `chore:` | Техникалық жұмыс | `chore: update dependencies` |

## Архитектура

```
src/
├── components/      # UI компоненттер
│   ├── Layout.tsx
│   ├── ProtectedRoute.tsx
│   ├── TaskCard.tsx
│   ├── TaskColumn.tsx
│   └── TaskModal.tsx
├── context/         # React Context
│   ├── AuthContext.tsx    # Supabase Auth
│   └── TaskContext.tsx    # Tasks, Teams, Notifications
├── pages/           # Беттер
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   └── TeamPage.tsx
├── services/        # Supabase API
│   └── supabase.ts
├── types/           # TypeScript типтер
│   └── index.ts
└── utils/           # Қосымша функциялар
```

## Лицензия

MIT
