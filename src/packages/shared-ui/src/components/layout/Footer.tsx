import React, { useState } from 'react';
import { SiInstagram } from 'react-icons/si';
import { appUrls } from '../../../../shared-utils/src/appUrls';

const socialLinks = [
    { href: 'https://www.instagram.com/colegiomontetaborynazaret?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', label: 'Síguenos en Instagram', Icon: SiInstagram },
];

const Footer: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [enviado, setEnviado] = useState(false);
    const [error, setError] = useState('');

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre || !correo || !mensaje) {
            setError('Todos los campos son obligatorios.');
            return;
        }
        setError('');
        window.location.href = `mailto:admisiones@mtn.cl?subject=Contacto%20desde%20web%20MTN&body=Nombre:%20${encodeURIComponent(nombre)}%0ACorreo:%20${encodeURIComponent(correo)}%0AMensaje:%20${encodeURIComponent(mensaje)}`;
        setEnviado(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEnviado(false);
        setNombre('');
        setCorreo('');
        setMensaje('');
        setError('');
    };

    return (
        <footer className="bg-azul-monte-tabor text-blanco-pureza mt-16">
            <div className="container mx-auto px-6 py-10">
                <div className="flex flex-col md:flex-row justify-between gap-10">
                    {/* Columna 1: Datos del Colegio */}
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-lg font-bold text-dorado-nazaret mb-4 font-serif">Colegio Monte Tabor y Nazaret</h3>
                        <address className="not-italic text-sm text-white/65 space-y-1">
                            <p>Avda. Paseo Pie Andino 5894</p>
                            <p>Lo Barnechea</p>
                            <p>Tel: (56-2) 2 7500 900</p>
                            <p>admisiones@mtn.cl</p>
                        </address>
                    </div>
                    {/* Columna 2: Enlaces y Redes Sociales */}
                    <div className="flex-[1.5] flex flex-col sm:flex-row gap-8">
                        {/* Sub-Col 2a: Enlaces */}
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-lg font-bold text-dorado-nazaret mb-4 font-serif">Enlaces Rápidos</h3>
                            <ul className="space-y-2">
                                <li><a href={appUrls.studentExams}
                                                           className="hover:underline text-sm text-white/65">Admisión 2027</a></li>
                             </ul>
                        </div>
                        {/* Sub-Col 2b: Redes */}
                        <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-lg font-bold text-dorado-nazaret mb-4 font-serif">Síguenos</h3>
                            <div className="flex justify-center sm:justify-start items-center gap-3 mt-2">
                                {socialLinks.map(({ href, label, Icon }) => (
                                    <React.Fragment key={label}>
                                        <a
                                            href={href}
                                            aria-label={label}
                                            className="p-2 text-white/55 hover:text-dorado-nazaret transition-colors duration-200"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Icon size={20} aria-hidden={true} />
                                        </a>
                                        <a
                                            href={href}
                                            className="text-sm text-white/65 hover:text-dorado-nazaret transition-colors duration-200"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            @colegiomontetaborynazaret
                                        </a>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="border-t border-white/15 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-white/45">
                    <p>&copy; {new Date().getFullYear()} Colegio Monte Tabor y Nazaret. Todos los derechos reservados.</p>
                    <div className="flex items-center gap-4">
                        <a href={appUrls.professorLogin} className="text-white/45 hover:text-dorado-nazaret transition-colors text-xs underline underline-offset-2">Profesores</a>
                        <a href={appUrls.adminLogin} className="text-white/45 hover:text-dorado-nazaret transition-colors text-xs underline underline-offset-2">Acceso personal MTN</a>
                    </div>
                </div>
            </div>
            {/* Modal de contacto */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="contact-modal-title"
                >
                    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
                        <button
                            className="absolute top-2 right-2 text-gray-400 hover:text-rojo-sagrado text-2xl"
                            onClick={closeModal}
                            aria-label="Cerrar formulario de contacto"
                        >&times;</button>
                        {!enviado ? (
                            <form onSubmit={handleSend} className="space-y-4">
                                <h2 id="contact-modal-title" className="text-2xl font-bold text-azul-monte-tabor mb-2">Contacto</h2>
                                <div>
                                    <label htmlFor="contact-nombre" className="sr-only">Nombre</label>
                                    <input id="contact-nombre" type="text" className="w-full border rounded p-2" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} required />
                                </div>
                                <div>
                                    <label htmlFor="contact-correo" className="sr-only">Correo electrónico</label>
                                    <input id="contact-correo" type="email" className="w-full border rounded p-2" placeholder="Correo electrónico" value={correo} onChange={e => setCorreo(e.target.value)} required />
                                </div>
                                <div>
                                    <label htmlFor="contact-mensaje" className="sr-only">Mensaje</label>
                                    <textarea id="contact-mensaje" className="w-full border rounded p-2" placeholder="Mensaje" rows={4} value={mensaje} onChange={e => setMensaje(e.target.value)} required />
                                </div>
                                {error && <p className="text-rojo-sagrado text-sm" role="alert">{error}</p>}
                                <button type="submit" className="w-full bg-dorado-nazaret text-azul-monte-tabor font-bold py-2 rounded hover:bg-amber-400 transition">Enviar</button>
                            </form>
                        ) : (
                            <div className="text-center py-8">
                                <h2 id="contact-modal-title" className="text-2xl font-bold text-azul-monte-tabor mb-2">¡Mensaje preparado!</h2>
                                <p className="text-gris-piedra mb-4">Se abrirá tu cliente de correo para enviar el mensaje a <b>admisiones@mtn.cl</b>.</p>
                                <button className="mt-4 bg-dorado-nazaret text-azul-monte-tabor font-bold py-2 px-6 rounded hover:bg-amber-400 transition" onClick={closeModal}>Cerrar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </footer>
    );
};

export default Footer;
