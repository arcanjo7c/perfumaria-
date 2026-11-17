import { useEffect, useMemo, useState } from 'react';
import { supabase } from "./lib/supabase";
import { useStore, brl, priceOf, waLink } from './store';
import type { Product, Category } from './types';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function Card({ p }: { p: Product }) {
  const { add, s } = useStore();
  const share = () => navigator.share
    ? navigator.share({ title: p.name, url: location.origin }).catch(() => {})
    : window.open(waLink(null, `${p.name} – ${location.origin}`), '_blank');
  return (
    <article className="group border border-ouro/20 bg-white/[0.03] flex flex-col transition hover:border-ouro/60">
      <div className="aspect-square bg-gradient-to-br from-ouro/10 to-transparent overflow-hidden">
        {p.image_url
          ? <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          : <div className="h-full grid place-items-center font-display text-xl text-ouro/60">{p.brand}</div>}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <span className="text-xs text-ouro">{p.brand}</span>
        <h3 className="font-display text-xl leading-tight">{p.name}</h3>
        {p.description && <p className="text-sm text-marfim/60 line-clamp-2">{p.description}</p>}
        <div className="mt-auto pt-2">
          {p.is_demo ? <p className="text-sm text-marfim/50">Exemplo demonstrativo</p> : (
            <p>{p.promo_price != null && <s className="text-marfim/40 mr-2 text-sm">{brl(p.price)}</s>}<b className="text-ouro">{brl(priceOf(p))}</b></p>
          )}
          <div className="flex gap-2 mt-3">
            {p.available && !p.is_demo
              ? <button className="btn flex-1" onClick={() => add(p)}>Adicionar</button>
              : <a className="btn flex-1 text-center" target="_blank" rel="noreferrer" href={waLink(s?.whatsapp_number, `Olá! Gostaria de consultar a disponibilidade de: ${p.name}`)}>Consultar disponibilidade</a>}
            <button className="btn-o" aria-label="Compartilhar produto" onClick={share}>↗</button>
          </div>
        </div>
      </div>
    </article>
  );
}

const Grid = ({ items }: { items: Product[] }) => <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{items.map(p => <Card key={p.id} p={p} />)}</div>;

export default function Loja() {
  const [ps, setPs] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState(''); const [brand, setBrand] = useState(''); const [cat, setCat] = useState(''); const [max, setMax] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('active', true).order('sort_order'),
    ]).then(([a, b]) => { if (a.error || b.error) setErr('Não foi possível carregar o catálogo agora.'); setPs(a.data || []); setCats(b.data || []); });
  }, []);

  const filtered = useMemo(() => ps.filter(p =>
    (!brand || p.brand === brand) && (!cat || p.category_id === cat) && (!max || priceOf(p) <= +max) &&
    (!q || norm(p.name + ' ' + (p.description || '')).includes(norm(q)))), [ps, q, brand, cat, max]);
  const idle = !q && !brand && !cat && !max;
  const shelves: [string, string, Product[]][] = [
    ['destaques', 'Produtos em destaque', ps.filter(p => p.featured)],
    ['ofertas', 'Ofertas especiais', ps.filter(p => p.promo_price != null)],
    ['vendidos', 'Mais vendidos', [...ps].filter(p => p.sales_count > 0).sort((a, b) => b.sales_count - a.sales_count).slice(0, 4)],
    ['kits', 'Kits para presentear', ps.filter(p => cats.find(c => c.id === p.category_id)?.slug === 'kits-para-presente')],
  ];

  return (
    <>
      <section className="relative overflow-hidden" style={{ background: 'radial-gradient(60% 80% at 75% 20%, rgba(201,164,92,.22), transparent 70%)' }}>
        <div className="mx-auto max-w-6xl px-5 py-24 md:py-36">
          <h1 className="font-display text-5xl md:text-7xl max-w-2xl leading-[1.05]">Sua beleza merece uma essência especial.</h1>
          <p className="mt-5 text-marfim/70 max-w-md">Perfumes, hidratantes e cuidados pessoais Natura e O Boticário, em Araci – BA.</p>
          <a href="#catalogo" className="btn inline-block mt-8 px-6 py-3">Conhecer produtos</a>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 space-y-16">
        <div className="grid grid-cols-2 gap-4">
          {['Natura', 'O Boticário'].map(b => (
            <a key={b} href="#catalogo" onClick={() => setBrand(b)} className="border border-ouro/30 p-8 text-center font-display text-3xl transition hover:bg-ouro hover:text-preto">{b}</a>
          ))}
        </div>

        {idle && shelves.filter(x => x[2].length).map(([id, t, items]) => (
          <section key={id} id={id}><h2 className="font-display text-4xl mb-6">{t}</h2><Grid items={items} /></section>
        ))}

        <section id="catalogo" className="scroll-mt-20">
          <h2 className="font-display text-4xl mb-6">Catálogo</h2>
          <div className="grid gap-3 md:grid-cols-4 mb-8">
            <input className="inp md:col-span-4" type="search" placeholder="Pesquisar produto" value={q} onChange={e => setQ(e.target.value)} />
            <select className="inp" value={brand} onChange={e => setBrand(e.target.value)}><option value="">Todas as marcas</option><option>Natura</option><option>O Boticário</option></select>
            <select className="inp" value={cat} onChange={e => setCat(e.target.value)}><option value="">Todas as categorias</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input className="inp" type="number" min="0" placeholder="Preço máximo (R$)" value={max} onChange={e => setMax(e.target.value)} />
            <button className="btn-o" onClick={() => { setQ(''); setBrand(''); setCat(''); setMax(''); }}>Limpar filtros</button>
          </div>
          {err && <p className="text-red-400 mb-4">{err}</p>}
          {filtered.length ? <Grid items={filtered} /> : <p className="text-marfim/60">Nenhum produto encontrado. Tente outros filtros ou chame a loja no WhatsApp.</p>}
        </section>
      </div>
    </>
  );
}
