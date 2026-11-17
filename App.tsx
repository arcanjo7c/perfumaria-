import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider, useStore, waLink } from './store';
import Cart from './Cart';
import Loja from './Loja';
import Admin from './Admin';

function Shell({ children }: { children: React.ReactNode }) {
  const { s, cart, setOpen } = useStore();
  const [menu, setMenu] = useState(false);
  const name = s?.store_name || 'Essência & Beleza';
  const links: [string, string][] = [['Produtos', '#catalogo'], ['Ofertas', '#ofertas']];
  return (
    <>
      <header className="sticky top-0 z-40 bg-preto/90 backdrop-blur border-b border-ouro/20">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <a href="/" className="font-display text-2xl text-ouro">{name}</a>
          <nav className={`${menu ? 'flex' : 'hidden'} md:flex absolute md:static top-16 inset-x-0 flex-col md:flex-row gap-4 bg-preto md:bg-transparent p-5 md:p-0 text-sm`}>
            {links.map(([t, h]) => <a key={t} href={h} onClick={() => setMenu(false)}>{t}</a>)}
            {s?.instagram_url && <a href={s.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}
            <a href={waLink(s?.whatsapp_number, 'Olá! Vim pelo site.')} target="_blank" rel="noreferrer">WhatsApp</a>
          </nav>
          <div className="flex gap-2">
            <button className="btn-o" onClick={() => setOpen(true)}>Carrinho ({cart.reduce((t: number, l: any) => t + l.q, 0)})</button>
            <button className="btn-o md:hidden" aria-label="Menu" onClick={() => setMenu(m => !m)}>☰</button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-ouro/20 mt-20 py-10 text-sm text-marfim/70">
        <div className="mx-auto max-w-6xl px-5 grid gap-2">
          <p className="font-display text-xl text-ouro">{name}</p>
          {s?.address && <p>{s.address}</p>}
          {s?.opening_hours && <p>Atendimento: {s.opening_hours}</p>}
          {s?.instagram_url && <a href={s.instagram_url} target="_blank" rel="noreferrer" className="underline">Instagram</a>}
          <p className="text-xs text-marfim/50">Revenda independente de produtos Natura e O Boticário. Não somos loja oficial das marcas.</p>
        </div>
      </footer>
      <a href={waLink(s?.whatsapp_number, 'Olá! Vim pelo site e gostaria de atendimento.')} target="_blank" rel="noreferrer"
        className="fixed bottom-5 right-5 z-40 bg-[#25D366] text-preto font-medium px-5 py-3 rounded-full shadow-lg">WhatsApp</a>
      <Cart />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Shell><Loja /></Shell>} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}
