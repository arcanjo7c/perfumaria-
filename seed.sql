-- Categorias reais da loja + exemplos demonstrativos (sem preço, sem estoque).
insert into public.categories (name, slug, sort_order) values
 ('Perfumes masculinos','perfumes-masculinos',1),('Perfumes femininos','perfumes-femininos',2),
 ('Perfumes unissex','perfumes-unissex',3),('Hidratantes','hidratantes',4),('Sabonetes','sabonetes',5),
 ('Cuidados pessoais','cuidados-pessoais',6),('Maquiagem','maquiagem',7),
 ('Kits para presente','kits-para-presente',8),('Promoções','promocoes',9);

insert into public.products (category_id, name, slug, brand, description, price, available, is_demo)
select c.id, 'Exemplo demonstrativo – ' || c.name, 'demo-' || c.slug, b, 'Substitua pelo produto real no painel.', 0, false, true
from public.categories c, (values ('Natura')) v(b) where c.slug in ('perfumes-femininos','hidratantes','kits-para-presente');
-- Para remover os exemplos:  delete from public.products where is_demo;
