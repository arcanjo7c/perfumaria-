import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { brl } from './store';

const STATUS = ['novo', 'em_atendimento', 'confirmado', 'finalizado', 'cancelado'];
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function Login() {
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');
  const go = async (ev: React.FormEvent) => { ev.preventDefault(); const { error } = await supabase.auth.signInWithPassword({ email: e, password: p }); if (error) setErr('E-mail ou senha incorretos.'); };
  return (
    <form onSubmit={go} className="min-h-screen grid place-items-center p-5">
      <div className="w-full max-w-sm space-y-3">
        <h1 className="font-display text-4xl text-ouro">Painel da loja</h1>
        <input className="inp" type="email" required placeholder="E-mail" value={e} onChange={x => setE(x.target.value)} />
        <input className="inp" type="password" required placeholder="Senha" value={p} onChange={x => setP(x.target.value)} />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button className="btn w-full py-3">Entrar</button>
      </div>
    </form>
  );
}

function Dash() {
  const [o, setO] = useState<any[]>([]); const [p, setP] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('orders').select('id,total,status,created_at').then(r => setO(r.data || []));
    supabase.from('products').select('name,available,sales_count').then(r => setP(r.data || []));
  }, []);
  const today = new Date().toDateString();
  const cards: [string, string | number][] = [
    ['Total de pedidos', o.length],
    ['Pedidos do dia', o.filter(x => new Date(x.created_at).toDateString() === today).length],
    ['Produtos cadastrados', p.length],
    ['Produtos indisponíveis', p.filter(x => !x.available).length],
    ['Vendas finalizadas', brl(o.filter(x => x.status === 'finalizado').reduce((t, x) => t + Number(x.total), 0))],
  ];
  const top = [...p].filter(x => x.sales_count > 0).sort((a, b) => b.sales_count - a.sales_count).slice(0, 5);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{cards.map(([t, v]) => <div key={t} className="border border-ouro/20 p-4"><p className="text-xs text-marfim/60">{t}</p><p className="font-display text-3xl text-ouro">{v}</p></div>)}</div>
      <div><h3 className="font-display text-2xl mb-2">Mais vendidos</h3>{top.length ? top.map(x => <p key={x.name}>{x.name} – {x.sales_count}</p>) : <p className="text-marfim/60">As vendas aparecem aqui quando você marca pedidos como finalizados.</p>}</div>
    </div>
  );
}

function Prods() {
  const [list, setList] = useState<any[]>([]); const [cats, setCats] = useState<any[]>([]); const [f, setF] = useState<any>(null); const [msg, setMsg] = useState('');
  const load = () => { supabase.from('products').select('*').order('created_at', { ascending: false }).then(r => setList(r.data || [])); };
  useEffect(() => { load(); supabase.from('categories').select('*').order('sort_order').then(r => setCats(r.data || [])); }, []);
  const blank = { name: '', brand: 'Natura', category_id: '', description: '', price: '', promo_price: '', available: true, featured: false, image_url: '' };
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const upload = async (file: File) => {
    const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''))}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) return setMsg('Falha no upload: ' + error.message);
    set('image_url', supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const row = { name: f.name, brand: f.brand, category_id: f.category_id || null, description: f.description || null, price: +f.price,
      promo_price: f.promo_price === '' || f.promo_price == null ? null : +f.promo_price, available: f.available, featured: f.featured, image_url: f.image_url || null, is_demo: false };
    const { error } = f.id ? await supabase.from('products').update(row).eq('id', f.id)
      : await supabase.from('products').insert({ ...row, slug: slugify(f.name) + '-' + Math.random().toString(36).slice(2, 6) });
    if (error) return setMsg(error.message);
    setF(null); setMsg(''); load();
  };
  const del = async (p: any) => { if (confirm(`Excluir "${p.name}"?`)) { await supabase.from('products').delete().eq('id', p.id); load(); } };

  if (f) return (
    <form onSubmit={save} className="max-w-xl space-y-3">
      <input className="inp" required placeholder="Nome" value={f.name} onChange={e => set('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <select className="inp" value={f.brand} onChange={e => set('brand', e.target.value)}><option>Natura</option><option>O Boticário</option></select>
        <select className="inp" value={f.category_id || ''} onChange={e => set('category_id', e.target.value)}><option value="">Sem categoria</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input className="inp" required type="number" step="0.01" min="0" placeholder="Preço (R$)" value={f.price} onChange={e => set('price', e.target.value)} />
        <input className="inp" type="number" step="0.01" min="0" placeholder="Preço promocional (opcional)" value={f.promo_price ?? ''} onChange={e => set('promo_price', e.target.value)} />
      </div>
      <textarea className="inp" rows={3} placeholder="Descrição" value={f.description || ''} onChange={e => set('description', e.target.value)} />
      <div className="flex items-center gap-3">{f.image_url && <img src={f.image_url} alt="" className="h-16 w-16 object-cover" />}<input type="file" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} /></div>
      <label className="flex gap-2"><input type="checkbox" checked={f.available} onChange={e => set('available', e.target.checked)} /> Disponível</label>
      <label className="flex gap-2"><input type="checkbox" checked={f.featured} onChange={e => set('featured', e.target.checked)} /> Produto em destaque</label>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      <div className="flex gap-2"><button className="btn">Salvar produto</button><button type="button" className="btn-o" onClick={() => { setF(null); setMsg(''); }}>Cancelar</button></div>
    </form>
  );
  return (
    <div className="space-y-3">
      <button className="btn" onClick={() => setF(blank)}>Novo produto</button>
      {list.map(p => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-marfim/10 py-2 text-sm">
          <span className="flex-1 min-w-40">{p.name} <span className="text-marfim/50">({p.brand})</span>{p.is_demo && <b className="ml-2 text-ouro">demo</b>}</span>
          <span>{brl(p.promo_price ?? p.price)}</span><span>{p.available ? 'Disponível' : 'Indisponível'}</span>
          <button className="btn-o" onClick={() => setF({ ...p, price: String(p.price), promo_price: p.promo_price ?? '' })}>Editar</button>
          <button className="btn-o" onClick={() => del(p)}>Excluir</button>
        </div>
      ))}
    </div>
  );
}

function Orders() {
  const [list, setList] = useState<any[]>([]); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const load = () => {
    let q = supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to + 'T23:59:59');
    q.then(r => setList(r.data || []));
  };
  useEffect(() => { load(); }, [from, to]);
  const setStatus = async (id: string, status: string) => { await supabase.from('orders').update({ status }).eq('id', id); load(); };
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-center text-sm">De <input className="inp w-auto" type="date" value={from} onChange={e => setFrom(e.target.value)} /> até <input className="inp w-auto" type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      {!list.length && <p className="text-marfim/60">Nenhum pedido no período.</p>}
      {list.map(o => (
        <div key={o.id} className="border border-ouro/20 p-4 text-sm space-y-1">
          <div className="flex flex-wrap justify-between gap-2"><b>{o.customer_name}</b><span>{new Date(o.created_at).toLocaleString('pt-BR')}</span></div>
          <p>{o.delivery_type === 'entrega' ? 'Entrega: ' + o.address : 'Retirada na loja'}{o.notes && ` · Obs.: ${o.notes}`}</p>
          {o.order_items.map((i: any) => <p key={i.id} className="text-marfim/70">{i.quantity}x {i.product_name} – {brl(i.unit_price * i.quantity)}</p>)}
          <div className="flex items-center gap-3 pt-2"><b className="text-ouro">{brl(o.total)}</b>
            <select className="inp w-auto" value={o.status} onChange={e => setStatus(o.id, e.target.value)}>{STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
        </div>
      ))}
    </div>
  );
}

function Config() {
  const [f, setF] = useState<any>(null); const [m, setM] = useState('');
  useEffect(() => { supabase.from('store_settings').select('*').eq('id', 1).single().then(r => setF(r.data)); }, []);
  if (!f) return null;
  const keys: [string, string][] = [['store_name', 'Nome da loja'], ['whatsapp_number', 'WhatsApp com DDD (ex.: 75999999999)'], ['instagram_url', 'Link do Instagram'], ['address', 'Endereço'], ['opening_hours', 'Horários de atendimento']];
  const save = async (e: React.FormEvent) => { e.preventDefault(); const { id, ...rest } = f; const { error } = await supabase.from('store_settings').update(rest).eq('id', 1); setM(error ? error.message : 'Configurações salvas.'); };
  return (
    <form onSubmit={save} className="max-w-xl space-y-3">
      {keys.map(([k, l]) => <label key={k} className="block text-sm">{l}<input className="inp mt-1" value={f[k] || ''} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}
      {m && <p className="text-sm text-ouro">{m}</p>}
      <button className="btn">Salvar configurações</button>
    </form>
  );
}

export default function Admin() {
  const [ses, setSes] = useState<Session | null | undefined>(undefined);
  const [ok, setOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState('Dashboard');
  useEffect(() => {
    document.title = 'Painel | Aura Dourada Perfumaria';
    supabase.auth.getSession().then(({ data }) => setSes(data.session));
    const { data } = supabase.auth.onAuthStateChange((_, s) => setSes(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { setOk(null); if (ses) supabase.from('profiles').select('role').eq('id', ses.user.id).single().then(({ data }) => setOk(data?.role === 'admin')); }, [ses]);
  if (ses === undefined) return null;
  if (!ses) return <Login />;
  if (ok === null) return null;
  if (!ok) return <div className="p-10 space-y-4"><p>Esta conta não tem acesso de administrador.</p><button className="btn" onClick={() => supabase.auth.signOut()}>Sair</button></div>;
  const tabs: Record<string, JSX.Element> = { Dashboard: <Dash />, Produtos: <Prods />, Pedidos: <Orders />, Configurações: <Config /> };
  return (
    <div className="mx-auto max-w-6xl p-5">
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <h1 className="font-display text-3xl text-ouro mr-4">Painel</h1>
        {Object.keys(tabs).map(t => <button key={t} className={t === tab ? 'btn' : 'btn-o'} onClick={() => setTab(t)}>{t}</button>)}
        <button className="btn-o ml-auto" onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
      {tabs[tab]}
    </div>
  );
}
