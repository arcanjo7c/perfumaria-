-- ESSÊNCIA & BELEZA — schema completo. Execute no SQL Editor do Supabase.

-- ========== TABELAS ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  brand text not null check (brand in ('Natura','O Boticário')),
  description text,
  price numeric(10,2) not null check (price >= 0),
  promo_price numeric(10,2) check (promo_price is null or (promo_price >= 0 and promo_price < price)),
  image_url text,
  available boolean not null default true,
  featured boolean not null default false,
  is_demo boolean not null default false,   -- marca dados demonstrativos
  sales_count int not null default 0,       -- base de "mais vendidos"
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  delivery_type text not null check (delivery_type in ('entrega','retirada')),
  address text,
  notes text,
  status text not null default 'novo'
    check (status in ('novo','em_atendimento','confirmado','finalizado','cancelado')),
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  check (delivery_type = 'retirada' or coalesce(char_length(address),0) > 5)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0 and quantity <= 99)
);

create table public.store_settings (
  id int primary key default 1 check (id = 1),  -- linha única
  store_name text not null default 'Essência & Beleza',
  whatsapp_number text,
  instagram_url text,
  address text default 'Araci – Bahia',
  opening_hours text
);
insert into public.store_settings (id) values (1);

-- ========== ÍNDICES ==========
create index on public.products (category_id);
create index on public.products (brand);
create index on public.products (featured) where featured;
create index on public.products (price);
create index on public.orders (status, created_at desc);
create index on public.order_items (order_id);

-- ========== FUNÇÕES ==========
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- cria o profile (role 'user') quando um usuário é criado no Auth
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pedido público: preços e total vêm do banco, nunca do navegador.
-- p_items = [{"product_id":"uuid","quantity":2}, ...]
create or replace function public.create_order(
  p_customer_name text, p_delivery_type text, p_address text, p_notes text, p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_order uuid; v_total numeric(10,2) := 0; r record; p public.products%rowtype; v_price numeric(10,2);
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Carrinho vazio';
  end if;
  insert into public.orders (customer_name, delivery_type, address, notes)
    values (trim(p_customer_name), p_delivery_type, nullif(trim(p_address),''), nullif(trim(p_notes),''))
    returning id into v_order;
  for r in select (e->>'product_id')::uuid as pid, (e->>'quantity')::int as qty
           from jsonb_array_elements(p_items) e loop
    select * into p from public.products where id = r.pid and available;
    if not found then raise exception 'Produto indisponível'; end if;
    v_price := coalesce(p.promo_price, p.price);
    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity)
      values (v_order, p.id, p.name, v_price, r.qty);
    v_total := v_total + v_price * r.qty;
  end loop;
  update public.orders set total = v_total where id = v_order;
  return v_order;
end $$;
revoke all on function public.create_order from public;
grant execute on function public.create_order to anon, authenticated;

-- ========== RLS ==========
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.store_settings enable row level security;

create policy "perfil: ler o próprio ou admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "categorias: público lê ativas" on public.categories
  for select using (active or public.is_admin());
create policy "categorias: admin escreve" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "produtos: público lê" on public.products for select using (true);
create policy "produtos: admin escreve" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "config: público lê" on public.store_settings for select using (true);
create policy "config: admin altera" on public.store_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- pedidos: clientes NÃO leem nem escrevem direto (usam create_order)
create policy "pedidos: admin tudo" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());
create policy "itens: admin tudo" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ========== STORAGE ==========
insert into storage.buckets (id, name, public) values ('product-images','product-images', true)
  on conflict (id) do nothing;
create policy "imagens: público lê" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "imagens: admin envia" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "imagens: admin altera" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());
create policy "imagens: admin apaga" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- ========== PRIMEIRO ADMIN ==========
-- 1) Crie o usuário em Authentication > Users. 2) Rode, trocando o e-mail:
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'SEU-EMAIL@exemplo.com');

-- ========== MAIS VENDIDOS ==========
-- soma as quantidades em products.sales_count quando um pedido vira "finalizado"
create or replace function public.bump_sales() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finalizado' and old.status <> 'finalizado' then
    update public.products p set sales_count = p.sales_count + i.quantity
      from public.order_items i where i.order_id = new.id and p.id = i.product_id;
  end if;
  return new;
end $$;
create trigger orders_bump_sales after update of status on public.orders
  for each row execute function public.bump_sales();
