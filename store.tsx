import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './lib/supabase';
import type { Product, StoreSettings } from './types';

export const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const priceOf = (p: Product) => p.promo_price ?? p.price;
export const waLink = (num: string | null | undefined, text: string) => {
  let d = (num || '').replace(/\D/g, '');
  if (d && d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
};

type Line = { p: Product; q: number };
const Ctx = createContext<any>(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<StoreSettings | null>(null);
  const [cart, setCart] = useState<Line[]>(() => { try { return JSON.parse(localStorage.getItem('eb_cart') || '[]'); } catch { return []; } });
  const [open, setOpen] = useState(false);
  useEffect(() => { supabase.from('store_settings').select('*').eq('id', 1).single().then(({ data }) => setS(data)); }, []);
  useEffect(() => { try { localStorage.setItem('eb_cart', JSON.stringify(cart)); } catch { /* ignora */ } }, [cart]);
  const add = (p: Product) => { setCart(c => c.some(l => l.p.id === p.id) ? c.map(l => l.p.id === p.id ? { ...l, q: Math.min(99, l.q + 1) } : l) : [...c, { p, q: 1 }]); setOpen(true); };
  const setQ = (id: string, q: number) => setCart(c => q < 1 ? c.filter(l => l.p.id !== id) : c.map(l => l.p.id === id ? { ...l, q: Math.min(99, q) } : l));
  const total = cart.reduce((t, l) => t + priceOf(l.p) * l.q, 0);
  return <Ctx.Provider value={{ s, cart, add, setQ, clear: () => setCart([]), total, open, setOpen }}>{children}</Ctx.Provider>;
}
