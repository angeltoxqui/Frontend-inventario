import React from 'react';
import { Order, OrderItem } from '../../types';
import { MapPin, Leaf, Coffee, Instagram } from 'lucide-react';

interface InvoiceTemplateProps {
  order: Order | null;
  subtotal: number;
  tip: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  clientName?: string;
  ref: React.Ref<HTMLDivElement>;
}

// Usamos forwardRef para permitir que la librería de impresión (o el navegador) acceda al componente
export const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>((props, ref) => {
  const { order, subtotal, tip, total, paymentMethod, cashReceived, change, clientName } = props;

  if (!order) return null;

  return (
    <div ref={ref} className="w-[80mm] min-h-screen bg-[#fffdf5] text-stone-900 p-4 font-mono text-xs leading-relaxed relative overflow-hidden print:w-full print:absolute print:top-0 print:left-0">
      
      {/* Elementos decorativos de fondo (Marca de agua sutil) */}
      <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 text-emerald-800 pointer-events-none">
        <Leaf size={120} />
      </div>

      {/* --- HEADER --- */}
      <div className="text-center mb-6 z-10 relative">
        {/* Logo / Nombre - Tipografía Clásica pero Bold */}
        <div className="flex justify-center items-center gap-2 mb-2 text-stone-800">
            <Coffee size={18} className="text-emerald-700"/>
            <h1 className="text-2xl font-serif font-black tracking-tighter uppercase border-b-2 border-emerald-700 pb-1 inline-block">
            Café con K
            </h1>
        </div>
        
        <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-800 mb-1">
          
        </p>
        <p className="text-[10px] text-stone-500 italic">
          
        </p>
        
        <div className="mt-3 flex flex-col items-center gap-1 text-[9px] text-stone-600">
            <span className="flex items-center gap-1"><MapPin size={10}/> Calle del Bosque #123, Ciudad</span>
            <span>NIT: 900.123.456-7</span>
            <span>Tel: (602) 123-4567</span>
        </div>
      </div>

      {/* --- INFO ORDEN --- */}
      <div className="border-t border-dashed border-stone-300 py-3 mb-3">
        <div className="flex justify-between">
            <span>Fecha:</span>
            <span className="font-bold">{new Date().toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
            <span>Ticket #:</span>
            <span className="font-bold">{order.id.slice(0, 6).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
            <span>Mesa:</span>
            <span className="font-bold text-base">{order.tableId.replace('t-', '')}</span>
        </div>
        {clientName && (
            <div className="flex justify-between mt-1">
                <span>Cliente:</span>
                <span className="uppercase">{clientName}</span>
            </div>
        )}
        <div className="flex justify-between mt-1">
            <span>Atendió:</span>
            <span className="uppercase">Staff</span>
        </div>
      </div>

      {/* --- ITEMS --- */}
      <table className="w-full text-left mb-4">
        <thead>
            <tr className="border-b border-stone-800 text-[10px] uppercase">
                <th className="pb-1 w-8">Cant</th>
                <th className="pb-1">Desc</th>
                <th className="pb-1 text-right">Total</th>
            </tr>
        </thead>
        <tbody className="text-[11px]">
            {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-dashed border-stone-200">
                    <td className="py-2 align-top font-bold">{item.quantity}</td>
                    <td className="py-2 align-top">
                        <div className="font-medium text-stone-800">{item.productName}</div>
                        {item.notes && <div className="text-[9px] italic text-stone-500">({item.notes})</div>}
                    </td>
                    <td className="py-2 align-top text-right font-mono">
                        ${(item.price * item.quantity).toLocaleString()}
                    </td>
                </tr>
            ))}
        </tbody>
      </table>

      {/* --- TOTALES --- */}
      <div className="flex justify-end mb-4">
        <div className="w-3/4 space-y-1">
            <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
            </div>
            {tip > 0 && (
                <div className="flex justify-between text-stone-500">
                    <span>Propina (Vol)</span>
                    <span>${tip.toLocaleString()}</span>
                </div>
            )}
            <div className="flex justify-between border-t-2 border-stone-800 pt-1 mt-1 text-base font-black text-stone-900">
                <span>TOTAL</span>
                <span>${total.toLocaleString()}</span>
            </div>
            
            {/* Detalles de Pago */}
            <div className="mt-4 pt-2 border-t border-dashed border-stone-300 text-[10px]">
                <div className="flex justify-between uppercase font-bold text-stone-600">
                    <span>Método:</span>
                    <span>{paymentMethod}</span>
                </div>
                {paymentMethod === 'efectivo' && cashReceived && (
                    <>
                        <div className="flex justify-between">
                            <span>Efectivo:</span>
                            <span>${cashReceived.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-stone-800">
                            <span>Cambio:</span>
                            <span>${change?.toLocaleString()}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="text-center mt-8 border-t border-stone-200 pt-4">
        <p className="font-serif font-bold text-sm text-stone-800 mb-1">¡Gracias por tu visita!</p>
        <p className="text-[10px] text-stone-500 mb-3 px-4">
          
        </p>
        
        <div className="flex justify-center items-center gap-4 text-xs font-bold text-emerald-800 bg-emerald-50 py-2 rounded-lg mx-2 border border-emerald-100">
            <div className="flex items-center gap-1">
                <Instagram size={12}/> @cafeconk
            </div>
            <div>
                
            </div>
        </div>
        
        <p className="text-[8px] text-stone-300 mt-4 uppercase">
            Sistema Rootventory • ID: {order.id.slice(0,8)}
        </p>
      </div>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';