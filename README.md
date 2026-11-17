# Essência & Beleza — loja virtual

React + Vite + TypeScript + Tailwind + Supabase. Pedidos finalizados pelo WhatsApp (sem pagamento online).

## 1. Rodar localmente
```bash
npm install
cp .env.example .env     # preencha URL e chave anon do Supabase
npm run dev
```

## 2. Supabase
1. Crie um projeto em supabase.com.
2. SQL Editor: rode `supabase/schema.sql` e depois `supabase/seed.sql`.
3. Authentication > Users: crie o usuário administrador (e-mail e senha).
4. Torne-o admin (SQL Editor):
   `update public.profiles set role='admin' where id=(select id from auth.users where email='SEU-EMAIL');`
5. Settings > API: copie a **URL** e a chave **anon** para o `.env`. Nunca use a `service_role` no site.
6. Entre em `/admin`, abra Configurações e informe WhatsApp, Instagram, endereço e horários.

## 3. Catálogo real
No painel, em Produtos, cadastre os itens com foto, preço e disponibilidade. Apague os exemplos: `delete from public.products where is_demo;`

## 4. Publicar
1. Envie a pasta para um repositório no GitHub (o `.env` não deve ir junto).
2. Na Vercel, importe o repositório e adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Deploy. O `vercel.json` já cuida das rotas.
4. No Supabase, em Authentication > URL Configuration, informe o domínio publicado.

## 5. Testes antes de entregar
- Login em `/admin` e acesso negado para conta sem role admin.
- Cadastrar, editar, excluir produto e enviar imagem.
- Adicionar ao carrinho, alterar quantidade, finalizar e conferir a mensagem no WhatsApp e o pedido no painel.
- Mudar status do pedido; finalizar e ver "Mais vendidos".
- Com a chave anon, tentar `insert/update/delete` em `products` e `select` em `orders`: deve falhar (RLS).
- Layout em celular, tablet e desktop.
