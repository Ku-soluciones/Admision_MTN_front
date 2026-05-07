import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { FileText, Users, CheckCircle, Calculator, BookOpen, Globe } from 'lucide-react';
import { microfrontendUrls } from '../utils/microfrontendUrls';

const HomePage: React.FC = () => {
    const admissionSteps = [
        { title: 'Registro y Postulación', description: 'Complete el formulario en línea con los datos del postulante y la familia.', icon: <FileText className="w-12 h-12 text-dorado-nazaret" /> },
        { title: 'Entrevistas Familiares', description: 'Agende y asista a una entrevista con nuestro equipo de admisiones.', icon: <Users className="w-12 h-12 text-dorado-nazaret" /> },
        { title: 'Publicación de Resultados', description: 'Consulte los resultados del proceso de admisión en las fechas publicadas.', icon: <CheckCircle className="w-12 h-12 text-dorado-nazaret" /> },
    ];

    const admissionTimeline = [
        {
            date: 'AGOSTO 2025',
            event: 'Apertura de Postulaciones',
            description: 'Inicio del periodo oficial para la recepción de documentos y solicitudes en línea.',
            current: true,
            status: 'active',
        },
        {
            date: 'SEPTIEMBRE - OCTUBRE 2025',
            event: 'Exámenes y Entrevistas',
            description: 'Periodo de evaluaciones académicas y encuentros personales con las familias postulantes.',
            current: false,
            status: 'upcoming',
        },
        {
            date: 'NOVIEMBRE 2025',
            event: 'Publicación de Resultados',
            description: 'Comunicación oficial de las admisiones y formalización de la matrícula para el ciclo 2026.',
            current: false,
            status: 'future',
        },
    ];

    return (
        <div className="bg-blanco-pureza">
            {/* Hero Section */}
            <section className="relative text-blanco-pureza py-[7.5rem] sm:py-48 text-center bg-cover bg-center" style={{ backgroundImage: `url('/images/colegio.png')`}}>
                {/* Overlay azul con opacidad 85% */}
                <div className="absolute inset-0 bg-azul-monte-tabor" style={{ opacity: 0.85, filter: 'brightness(0.75)' }}></div>
                <div className="relative container mx-auto px-4 sm:px-6">
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-serif mb-4 animate-fade-in-down">Formando líderes con espíritu de servicio</h1>
                    <p className="text-base sm:text-xl text-gray-200 mb-8 max-w-3xl mx-auto">Únanse a una comunidad educativa comprometida con la excelencia académica y formación católica</p>
                    <div className="flex justify-center">
                        <a href={microfrontendUrls.admissions}>
                            <Button size="lg" variant="primary" className="!text-blanco-pureza">
                                Iniciar postulación
                            </Button>
                        </a>
                    </div>
                </div>
            </section>

            {/* Steps Section */}
            <section className="py-12 sm:py-20 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl sm:text-4xl font-bold text-azul-monte-tabor mb-4 font-serif text-center">Proceso de Admisión</h2>
                    <p className="text-gris-piedra mb-12 max-w-2xl mx-auto text-center">Un camino claro y guiado para formar parte de nuestra comunidad educativa.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                        {admissionSteps.map((step, index) => (
                            <div key={index} className="bg-blanco-pureza p-8 rounded-2xl border border-gray-200 text-center">
                                <div className="flex justify-center mb-4">{step.icon}</div>
                                <h3 className="text-lg font-bold text-azul-monte-tabor mb-3">{step.title}</h3>
                                <p className="text-gris-piedra text-sm">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Exam Portal Section */}
            <section className="py-12 sm:py-20 bg-gray-100">
                <div className="container mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-2xl sm:text-4xl font-bold text-azul-monte-tabor mb-4 font-serif">Portal de Exámenes de Admisión</h2>
                    <p className="text-gris-piedra mb-8 max-w-3xl mx-auto text-base sm:text-lg">
                        Una vez completada tu postulación, podrás acceder al portal de exámenes para programar
                        y rendir las evaluaciones de Matemática, Lenguaje e Inglés.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 text-center">
                        <div className="bg-blanco-pureza p-8 rounded-2xl border border-gray-200">
                            <div className="flex justify-center mb-4">
                                <Calculator className="w-10 h-10 text-dorado-nazaret" />
                            </div>
                            <h3 className="font-bold text-azul-monte-tabor text-lg mb-3">Matemática</h3>
                            <p className="text-gris-piedra text-sm">Evaluación adaptada según tu nivel educativo</p>
                        </div>
                        <div className="bg-blanco-pureza p-8 rounded-2xl border border-gray-200">
                            <div className="flex justify-center mb-4">
                                <BookOpen className="w-10 h-10 text-dorado-nazaret" />
                            </div>
                            <h3 className="font-bold text-azul-monte-tabor text-lg mb-3">Lenguaje</h3>
                            <p className="text-gris-piedra text-sm">Comprensión lectora y expresión escrita</p>
                        </div>
                        <div className="bg-blanco-pureza p-8 rounded-2xl border border-gray-200">
                            <div className="flex justify-center mb-4">
                                <Globe className="w-10 h-10 text-dorado-nazaret" />
                            </div>
                            <h3 className="font-bold text-azul-monte-tabor text-lg mb-3">Inglés</h3>
                            <p className="text-gris-piedra text-sm">Gramática, vocabulario y comprensión</p>
                        </div>
                    </div>
                    <a href={microfrontendUrls.studentExams}>
                        <Button size="lg" variant="secondary">
                            Conocer Portal de Exámenes
                        </Button>
                    </a>
                </div>
            </section>

            {/* Timeline Section */}
            <section className="py-12 sm:py-20 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-2xl sm:text-4xl font-bold text-azul-monte-tabor mb-3 font-serif">Calendario de Admisión 2025</h2>
                        <p className="text-dorado-nazaret font-medium">Fechas clave e hitos importantes para tu postulación</p>
                    </div>
                    {/* Desktop: alternating timeline */}
                    <div className="hidden sm:block relative max-w-3xl mx-auto">
                        <div className="absolute left-1/2 h-full w-0.5 bg-gray-300 transform -translate-x-1/2"></div>
                        {admissionTimeline.map((item, index) => (
                            <div key={index} className="flex items-center w-full mb-16">
                                <div className="flex-1 pr-10 text-right">
                                    {index % 2 === 0 ? (
                                        <>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${item.status === 'future' ? 'text-gray-400' : 'text-dorado-nazaret'}`}>{item.date}</p>
                                            <p className={`font-bold text-base ${item.status === 'future' ? 'text-gray-400' : 'text-azul-monte-tabor'}`}>{item.event}</p>
                                        </>
                                    ) : (
                                        <p className="text-gris-piedra text-sm">{item.description}</p>
                                    )}
                                </div>
                                <div className="flex-shrink-0 z-10 w-3">
                                    <div className={`w-3 h-3 rounded-full ${item.current ? 'bg-dorado-nazaret' : item.status === 'future' ? 'bg-gray-300' : 'bg-azul-monte-tabor'}`}></div>
                                </div>
                                <div className="flex-1 pl-10 text-left">
                                    {index % 2 === 0 ? (
                                        <p className="text-gris-piedra text-sm">{item.description}</p>
                                    ) : (
                                        <>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${item.status === 'future' ? 'text-gray-400' : 'text-dorado-nazaret'}`}>{item.date}</p>
                                            <p className={`font-bold text-base ${item.status === 'future' ? 'text-gray-400' : 'text-azul-monte-tabor'}`}>{item.event}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Mobile: vertical list */}
                    <div className="sm:hidden space-y-4 max-w-sm mx-auto">
                        {admissionTimeline.map((item, index) => (
                            <div key={index} className={`flex items-start gap-4 p-4 rounded-lg border-l-4 ${item.current ? 'border-dorado-nazaret bg-amber-50' : item.status === 'future' ? 'border-gray-300 bg-gray-100' : 'border-azul-monte-tabor bg-blanco-pureza'}`}>
                                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${item.current ? 'bg-dorado-nazaret' : item.status === 'future' ? 'bg-gray-300' : 'bg-azul-monte-tabor'}`}></div>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${item.status === 'future' ? 'text-gray-400' : 'text-dorado-nazaret'}`}>{item.date}</p>
                                    <p className={`font-bold text-sm mb-1 ${item.status === 'future' ? 'text-gray-400' : 'text-azul-monte-tabor'}`}>{item.event}</p>
                                    <p className="text-gris-piedra text-sm">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Sección de Contacto */}
            <section className="py-12 sm:py-16 bg-blanco-pureza border-t border-gray-200">
                <div className="container mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-azul-monte-tabor mb-4 font-serif">¿Tienes Preguntas?</h2>
                    <p className="text-gris-piedra text-lg mb-8 max-w-2xl mx-auto">
                        Nuestro equipo está aquí para ayudarte en todo el proceso de admisión
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button variant="outline" size="lg">
                            Contactar Admisión
                        </Button>
                        <Button variant="secondary" size="lg">
                            Agendar Visita
                        </Button>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default HomePage;
