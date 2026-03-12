import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Car, 
  RefreshCw, 
  ExternalLink, 
  Info, 
  AlertCircle,
  Calendar,
  DollarSign,
  Hash,
  MapPin,
  Image as ImageIcon,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Auction {
  id: string;
  clase: string;
  tipo: string;
  marca: string;
  modelo: string;
  placa: string;
  situacionImpositiva: string;
  expensas: string;
  proceso: string;
  valorOriginal: string;
  fechaPublicacion: string;
  ruatDetails?: {
    tipo: string;
    cilindrada: string;
    color: string;
    puertas: string;
  };
  referenceImage?: string;
}

export default function App() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [ruatLoading, setRuatLoading] = useState<string | null>(null);

  const fetchAuctions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/scrape-auctions');
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      setAuctions(data.auctions || []);
    } catch (err: any) {
      setError("Error al conectar con el servidor de monitoreo. " + err.message);
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  };

  const [demoMode, setDemoMode] = useState(false);

  const displayAuctions = demoMode && auctions.length === 0 ? [
    {
      id: 'demo-1',
      clase: 'VEHICULO',
      tipo: 'TOYOTA',
      marca: 'TOYOTA',
      modelo: 'COROLLA',
      placa: '1234ABC',
      situacionImpositiva: 'AL DIA',
      expensas: '0',
      proceso: '123/2024',
      valorOriginal: '15000 USD',
      fechaPublicacion: '2024-03-10'
    },
    {
      id: 'demo-2',
      clase: 'VEHICULO',
      tipo: 'SUZUKI',
      marca: 'SUZUKI',
      modelo: 'VITARA',
      placa: '5678DEF',
      situacionImpositiva: 'PENDIENTE',
      expensas: '500 BOB',
      proceso: '456/2024',
      valorOriginal: '12000 USD',
      fechaPublicacion: '2024-03-11'
    }
  ] : auctions;

  const fetchRuatDetails = async (auction: Auction) => {
    setRuatLoading(auction.id);
    try {
      const response = await fetch('/api/scrape-ruat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: auction.placa })
      });
      const data = await response.json();
      
      // Update auction with RUAT details
      setAuctions(prev => prev.map(a => 
        a.id === auction.id 
          ? { 
              ...a, 
              ruatDetails: data.details,
              referenceImage: `https://picsum.photos/seed/${a.marca}${a.modelo}/400/300` // Placeholder for internet search
            } 
          : a
      ));
      
      if (selectedAuction?.id === auction.id) {
        setSelectedAuction(prev => prev ? { 
          ...prev, 
          ruatDetails: data.details,
          referenceImage: `https://picsum.photos/seed/${prev.marca}${prev.modelo}/400/300`
        } : null);
      }
    } catch (err) {
      console.error("Error fetching RUAT details", err);
    } finally {
      setRuatLoading(null);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#141414]/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#141414] p-1.5 rounded-lg">
              <Car className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Subastas Judiciales LP</h1>
          </div>
          <button 
            onClick={fetchAuctions}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-full text-sm font-medium hover:bg-opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Actualizar
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* List Section */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif italic">Publicaciones Recientes</h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={demoMode} 
                    onChange={(e) => setDemoMode(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#141414] focus:ring-[#141414]"
                  />
                  <span className="text-[10px] font-mono uppercase opacity-50">Modo Demo</span>
                </label>
                <span className="text-xs font-mono uppercase opacity-50">La Paz • Vehículos</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {displayAuctions.map((auction) => (
                <motion.div
                  key={auction.id}
                  layoutId={auction.id}
                  onClick={() => setSelectedAuction(auction)}
                  className={`group bg-white border p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md ${
                    selectedAuction?.id === auction.id ? 'border-[#141414] ring-1 ring-[#141414]' : 'border-[#141414]/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono bg-[#F5F5F0] px-2 py-0.5 rounded uppercase opacity-70">
                          {auction.placa}
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded uppercase">
                          {auction.situacionImpositiva}
                        </span>
                        {auction.id.startsWith('demo-') && (
                          <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded uppercase">
                            Demo
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold">{auction.marca} {auction.modelo}</h3>
                      <p className="text-sm opacity-60 italic font-serif">{auction.tipo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-mono font-bold">{auction.valorOriginal}</p>
                      <p className="text-[10px] opacity-40 uppercase tracking-wider">Valor Original</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-dashed border-[#141414]/10 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[11px] opacity-50">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {auction.fechaPublicacion}</span>
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {auction.proceso}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                  </div>
                </motion.div>
              ))}

              {displayAuctions.length === 0 && !loading && (
                <div className="text-center py-20 opacity-30">
                  <Search className="w-12 h-12 mx-auto mb-4" />
                  <p>No se encontraron subastas reales en este momento.</p>
                  <p className="text-xs mt-2">Prueba activar el "Modo Demo" para ver la interfaz.</p>
                </div>
              )}
            </div>
          </div>

          {/* Detail Section */}
          <div className="lg:col-span-5">
            <AnimatePresence mode="wait">
              {selectedAuction ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-white border border-[#141414] rounded-3xl overflow-hidden sticky top-24"
                >
                  {/* Image Placeholder */}
                  <div className="aspect-video bg-[#141414] relative overflow-hidden">
                    {selectedAuction.referenceImage ? (
                      <img 
                        src={selectedAuction.referenceImage} 
                        alt="Referencia" 
                        className="w-full h-full object-cover opacity-80"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                        <ImageIcon className="w-12 h-12 mb-2" />
                        <p className="text-xs uppercase tracking-widest">Imagen de Referencia</p>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-white text-[#141414] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
                        Vista Previa
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-2xl font-bold">{selectedAuction.marca} {selectedAuction.modelo}</h2>
                        <p className="text-sm opacity-50">Placa: {selectedAuction.placa}</p>
                      </div>
                      <button 
                        onClick={() => fetchRuatDetails(selectedAuction)}
                        disabled={ruatLoading === selectedAuction.id}
                        className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors disabled:opacity-50"
                        title="Consultar RUAT"
                      >
                        {ruatLoading === selectedAuction.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <DetailItem label="Clase" value={selectedAuction.clase} />
                      <DetailItem label="Tipo (Thor)" value={selectedAuction.tipo} />
                      <DetailItem label="Expensas" value={selectedAuction.expensas} />
                      <DetailItem label="Situación" value={selectedAuction.situacionImpositiva} />
                    </div>

                    {/* RUAT Section */}
                    <div className="bg-[#F5F5F0] rounded-2xl p-5 border border-[#141414]/5">
                      <div className="flex items-center gap-2 mb-4">
                        <Info className="w-4 h-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">Datos Técnicos (RUAT)</h3>
                      </div>
                      
                      {selectedAuction.ruatDetails ? (
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                          <DetailItem label="Tipo Real" value={selectedAuction.ruatDetails.tipo} />
                          <DetailItem label="Cilindrada" value={selectedAuction.ruatDetails.cilindrada} />
                          <DetailItem label="Color" value={selectedAuction.ruatDetails.color} />
                          <DetailItem label="Puertas" value={selectedAuction.ruatDetails.puertas} />
                        </div>
                      ) : (
                        <div className="py-4 text-center">
                          <p className="text-[11px] opacity-40 italic">Presiona el botón de actualizar para consultar datos del RUAT</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex gap-3">
                      <a 
                        href="https://thor.organojudicial.gob.bo/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#141414] rounded-xl text-sm font-bold hover:bg-[#141414] hover:text-white transition-all"
                      >
                        Ver en Thor <ExternalLink className="w-4 h-4" />
                      </a>
                      <a 
                        href="https://www.ruat.gob.bo/vehiculos/consultageneral/InicioBusquedaVehiculo.jsf" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#141414] rounded-xl text-sm font-bold hover:bg-[#141414] hover:text-white transition-all"
                      >
                        RUAT <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-[600px] border border-dashed border-[#141414]/20 rounded-3xl flex flex-col items-center justify-center text-[#141414]/30">
                  <Car className="w-16 h-16 mb-4" />
                  <p className="font-serif italic">Selecciona un vehículo para ver detalles</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1">{label}</p>
      <p className="text-sm font-medium">{value || '---'}</p>
    </div>
  );
}
