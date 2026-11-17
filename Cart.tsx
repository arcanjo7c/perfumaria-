import { useState } from 'react';
import { supabase } from './lib/supabase';
import { useStore, brl, priceOf, waLink } from './store';

export default function Cart() {
  const { s, cart, setQ, clear, total, open, setOpen } = useStore();
  const [f, setF] = useState({ name: '', type: 'retirada', address: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!open) return null;
  const set = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));

  const finish = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!s?.whatsapp_number) return setErr('A loja ainda não configurou o número de WhatsApp.');
    setBusy(true);
    const { error } = await supabase.rpc('create_order', {
      p_customer_name: f.name, p_delivery_type: f.type,
      p_address: f.type === 'entrega' ? f.address : null, p_notes: f.notes || null,
      p_items: cart.map((l: any) => ({ product_id: l.p.id, quantity: l.q })),
    });
    setBusy(false);
    if (error) return setErr('Não foi possível registrar o pedido. Algum item pode estar indisponível.');
    const lines = cart.map((l: any) => `• ${l.q}x ${l.p.name} – ${brl(priceOf(l.p) * l.q)}`).join('\n');
    const msg = `Olá! Quero fazer um pedido na ${s.store_name}:\n\n${lines}\n\nTotal: ${brl(total)}\nNome: ${f.name}\n${f.type === 'entrega' ? 'Entrega: ' + f.address : 'Retirada na loja'}${f.notes ? '\nObs.: ' + f.notes : ''}\n\nAguardo a confirmação da disponibilidade e da forma de pagamento.`;
    clear();
    window.location.href = waLink(s.whatsapp_number, msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70" onClick={() => setOpen(false)}>
      <aside className="w-full max-w-md h-full overflow-y-auto bg-preto border-l border-ouro/30 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-3xl">Seu pedido</h2>
          <button className="text-2xl" aria-label="Fechar" onClick={() => setOpen(false)}>×</button>
        </div>
        {!cart.length ? <p className="text-marfim/60">Seu carrinho está vazio. Escolha um produto para começar.</p> : (
          <form onSubmit={finish} className="space-y-3">
            {cart.map((l: any) => (
              <div key={l.p.id} className="flex items-center gap-3 border-b border-marfim/10 pb-3">
                <div className="flex-1 text-sm"><p>{l.p.name}</p><p className="text-ouro">{brl(priceOf(l.p) * l.q)}</p></div>
                <button type="button" className="btn-o" onClick={() => setQ(l.p.id, l.q - 1)}>−</button>
                <span className="w-6 text-center">{l.q}</span>
                <button type="button" className="btn-o" onClick={() => setQ(l.p.id, l.q + 1)}>+</button>
              </div>
            ))}
            <p className="flex justify-between text-lg pt-2"><span>Subtotal</span><b className="text-ouro">{brl(total)}</b></p>
            <input className="inp" required minLength={2} placeholder="Seu nome" value={f.name} onChange={e => set('name', e.target.value)} />
            <select className="inp" value={f.type} onChange={e => set('type', e.target.value)}>
              <option value="retirada">Retirada na loja</option><option value="entrega">Entrega</option>
            </select>
            {f.type === 'entrega' && <input className="inp" required minLength={6} placeholder="Endereço completo" value={f.address} onChange={e => set('address', e.target.value)} />}
            <textarea className="inp" rows={2} placeholder="Observações (opcional)" value={f.notes} onChange={e => set('notes', e.target.value)} />
            <p className="text-xs text-marfim/50">O pagamento não é feito no site. Você combina tudo com a loja pelo WhatsApp.</p>
            {err && <p className="text-sm text-red-400">{err}</p>}
            <button className="btn w-full py-3" disabled={busy}>{busy ? 'Enviando…' : 'Finalizar pelo WhatsApp'}</button>
            <button type="button" className="btn-o w-full" onClick={() => setOpen(false)}>Continuar comprando</button>
          </form>
        )}
      </aside>
    </div>
  );
}
