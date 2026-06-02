# Aços Vital — Sistema de Advertências

Sistema web para registro e acompanhamento de advertências da segurança do trabalho.

---

## Configuração inicial (fazer uma vez)

### 1. Supabase — criar o banco

1. Acesse supabase.com e abra seu projeto
2. No menu lateral, clique em **SQL Editor**
3. Cole o conteúdo do arquivo `supabase-setup.sql` e clique em **Run**
4. Vá em **Project Settings → API** e copie:
   - `Project URL` → NEXT_PUBLIC_SUPABASE_URL
   - `anon public` → NEXT_PUBLIC_SUPABASE_ANON_KEY

### 2. Variáveis de ambiente

Copie `.env.local.example` → `.env.local` e cole as chaves do Supabase.

### 3. Criar usuário no Supabase Auth

1. No Supabase → **Authentication → Users**
2. Clique em **Add user** e cadastre o e-mail da segurança do trabalho

### 4. GitHub

```bash
git init
git add .
git commit -m "primeiro commit"
git remote add origin https://github.com/SEU_USUARIO/acos-vital-advertencias.git
git push -u origin main
```

### 5. Vercel — deploy automático

1. vercel.com → New Project → importar repo do GitHub
2. Em Environment Variables, adicione as duas variáveis
3. Deploy

A cada `git push`, o Vercel faz o deploy automaticamente.

---

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000
