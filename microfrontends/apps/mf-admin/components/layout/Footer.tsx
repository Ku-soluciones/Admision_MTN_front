import React, { useState } from 'react';
import { Facebook, Instagram, Linkedin } from 'lucide-react';
import { microfrontendUrls } from '../../utils/microfrontendUrls';

const Footer: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [nombre, setNombre] = useState("");
    const [correo, setCorreo] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [enviado, setEnviado] = useState(false);
    const [error, setError] = useState("");

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre || !correo || !mensaje) {
            setError("Todos los campos son obligatorios.");
            return;
        }
        setError("");
        // Simular envío (mailto)
        window.location.href = `mailto:admision@mtn.cl?subject=Contacto%20desde%20web%20MTN&body=Nombre:%20${encodeURIComponent(nombre)}%0ACorreo:%20${encodeURIComponent(correo)}%0AMensaje:%20${encodeURIComponent(mensaje)}`;
        setEnviado(true);
    };

    return (
        <footer className="bg-azul-monte-tabor text-blanco-pureza mt-16">
            <div className="container mx-auto px-6 py-10">
                <div className="flex flex-col md:flex-row justify-between gap-10">
                    {/* Columna 1: Datos del Colegio */}
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-lg font-bold text-dorado-nazaret mb-4 font-serif">Colegio Monte Tabor y Nazaret</h3>
                        <address className="not-italic text-sm text-gray-300 space-y-1">
                            <p>Avda. Paseo Pie Andino 5894</p>
                            <p>Lo Barnechea</p>
                            <p>Tel: (56-2) 2 7500 900</p>
                            <p>admision@mtn.cl</p>
                        </address>
                    </div>
                    {/* Columna 2: Enlaces y Redes Sociales */}
                    <div className="flex-[1.5] flex flex-col sm:flex-row gap-8">
                        {/* Sub-Col 2a: Enlaces */}
                        <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-lg font-bold text-dorado-nazaret mb-4 font-serif">Enlaces Rápidos</h3>
                        <ul className="space-y-2">
                                <li><a href="#" className="hover:underline text-sm text-gray-300">Nuestro Proyecto Educativo</a></li>
                                <li><a href="#" className="hover:underline text-sm text-gray-300">Admisión 2025</a></li>
                                <li><button onClick={() => setShowModal(true)} className="hover:underline text-sm text-gray-300 bg-transparent border-none p-0 m-0 cursor-pointer">Contacto</button></li>
                        </ul>
                    </div>
                        {/* Sub-Col 2b: Redes */}
                        <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-lg font-bold text-dorado-nazaret mb-4 font-serif">Síguenos</h3>
                            <div className="flex justify-center sm:justify-start gap-4 mt-2">
                               <a href="#" aria-label="Facebook" className="p-2 rounded-full bg-white/10 hover:bg-dorado-nazaret/20 hover:scale-110 transition-all duration-200">
                                   <Facebook className="w-7 h-7" strokeWidth={2} />
                               </a>
                               <a href="#" aria-label="Instagram" className="p-2 rounded-full bg-white/10 hover:bg-dorado-nazaret/20 hover:scale-110 transition-all duration-200">
                                   <Instagram className="w-7 h-7" strokeWidth={2} />
                               </a>
                               <a href="#" aria-label="LinkedIn" className="p-2 rounded-full bg-white/10 hover:bg-dorado-nazaret/20 hover:scale-110 transition-all duration-200">
                                   <Linkedin className="w-7 h-7" strokeWidth={2} />
                               </a>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="border-t border-blue-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400">
                    <p>&copy; {new Date().getFullYear()} Colegio Monte Tabor y Nazaret. Todos los derechos reservados.</p>
                    <a
                        href={microfrontendUrls.adminLogin}
                        className="text-gray-400 hover:text-dorado-nazaret transition-colors text-xs underline underline-offset-2"
                    >
                        Acceso personal MTN
                    </a>
                </div>
            </div>
            {/* Modal de contacto */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
                        <button className="absolute top-2 right-2 text-gray-400 hover:text-rojo-sagrado text-2xl" onClick={() => { setShowModal(false); setEnviado(false); setNombre(""); setCorreo(""); setMensaje(""); setError(""); }}>&times;</button>
                        {!enviado ? (
                            <form onSubmit={handleSend} className="space-y-4">
                                <h2 className="text-2xl font-bold text-azul-monte-tabor mb-2">Contacto</h2>
                                <input type="text" className="w-full border rounded p-2" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} required />
                                <input type="email" className="w-full border rounded p-2" placeholder="Correo electrónico" value={correo} onChange={e => setCorreo(e.target.value)} required />
                                <textarea className="w-full border rounded p-2" placeholder="Mensaje" rows={4} value={mensaje} onChange={e => setMensaje(e.target.value)} required />
                                {error && <p className="text-rojo-sagrado text-sm">{error}</p>}
                                <button type="submit" className="w-full bg-dorado-nazaret text-azul-monte-tabor font-bold py-2 rounded hover:bg-amber-400 transition">Enviar</button>
                            </form>
                        ) : (
                            <div className="text-center py-8">
                                <h2 className="text-2xl font-bold text-azul-monte-tabor mb-2">¡Mensaje preparado!</h2>
                                <p className="text-gris-piedra mb-4">Se abrirá tu cliente de correo para enviar el mensaje a <b>admision@mtn.cl</b>.</p>
                                <button className="mt-4 bg-dorado-nazaret text-azul-monte-tabor font-bold py-2 px-6 rounded hover:bg-amber-400 transition" onClick={() => { setShowModal(false); setEnviado(false); setNombre(""); setCorreo(""); setMensaje(""); setError(""); }}>Cerrar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </footer>
    );
};

export default Footer;