
import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Button from '../../../admin/components/ui/Button';
import { appUrls } from '../../../admin/utils/appUrls';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isHomePage = location.pathname === '/';
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { user, isAuthenticated } = useAuth();

    const isAdmin = useMemo(() => user?.role === 'ADMIN', [user?.role]);
    const isAnyUserLoggedIn = isAuthenticated;

    const handleLogoutAndGoHome = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isAnyUserLoggedIn) {
            e.preventDefault();
            navigate('/');
        }
    };

    return (
        <header className="bg-blanco-pureza shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center">
                <Link to="/" onClick={handleLogoutAndGoHome} className="flex items-center flex-shrink-0">
                    <img src="https://ik.imagekit.io/11mmsqbe5/mtn-admisiones/Logo%20Colegio%20monte%20tabor%20y%20Nazaret%20II.png" alt="Logo Colegio Monte Tabor y Nazaret" className="h-10 sm:h-12 flex-shrink-0" />
                </Link>

                <div className="ml-auto flex items-center gap-4 sm:gap-6">
                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6 lg:gap-8">
                    <a href={appUrls.home} onClick={handleLogoutAndGoHome} className="text-gris-piedra font-semibold transition-colors duration-150 [@media(hover:hover)]:hover:text-azul-monte-tabor active:scale-95">
                        Inicio
                    </a>
                    <a href={appUrls.studentExams} className="text-gris-piedra font-semibold transition-colors duration-150 [@media(hover:hover)]:hover:text-azul-monte-tabor active:scale-95">Exámenes</a>
                </nav>

                    <div className="hidden sm:flex items-center gap-2">
                        <a href={appUrls.guardianLogin}>
                            <Button size="sm" className="!bg-azul-monte-tabor !text-blanco-pureza">
                                Iniciar sesión
                            </Button>
                        </a>
                        {isHomePage && (
                            <div className="relative group">
                                <a href={appUrls.guardianRegister} onClick={(e) => e.preventDefault()} className="pointer-events-none opacity-50 cursor-not-allowed">
                                    <Button variant="primary" size="sm" className="!text-blanco-pureza">
                                        Postular
                                    </Button>
                                </a>
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                    El proceso de postulación ha finalizado
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800"></div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Hamburger button */}
                    <button
                        className="md:hidden p-2 rounded-lg text-gris-piedra hover:text-azul-monte-tabor hover:bg-gray-100 transition-colors"
                        onClick={() => setIsMobileMenuOpen(prev => !prev)}
                        aria-label="Abrir menú de navegación"
                        aria-expanded={isMobileMenuOpen}
                    >
                        {isMobileMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu — transición suave Emil: ease-out 200ms, scale desde 0.97 */}
            <div
                className="md:hidden overflow-hidden"
                style={{
                    maxHeight: isMobileMenuOpen ? '400px' : '0',
                    opacity: isMobileMenuOpen ? 1 : 0,
                    transform: isMobileMenuOpen ? 'translateY(0)' : 'translateY(-6px)',
                    transition: isMobileMenuOpen
                        ? 'max-height 220ms cubic-bezier(0.23,1,0.32,1), opacity 180ms ease-out, transform 180ms cubic-bezier(0.23,1,0.32,1)'
                        : 'max-height 160ms ease-in, opacity 120ms ease-in, transform 120ms ease-in',
                    borderTop: isMobileMenuOpen ? '1px solid #f3f4f6' : 'none',
                }}
            >
                <nav className="container mx-auto px-4 py-3 flex flex-col gap-1 bg-blanco-pureza shadow-lg">
                    <a
                        href={appUrls.home}
                        onClick={(e) => { handleLogoutAndGoHome(e); setIsMobileMenuOpen(false); }}
                        className="px-4 py-3 rounded-lg font-semibold transition-colors duration-150 text-gris-piedra active:bg-gray-100 [@media(hover:hover)]:hover:bg-gray-50"
                    >
                        Inicio
                    </a>
                    <a
                        href={appUrls.studentExams}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-lg font-semibold transition-colors duration-150 text-gris-piedra active:bg-gray-100 [@media(hover:hover)]:hover:bg-gray-50"
                    >
                        Exámenes
                    </a>
                    <a
                        href={appUrls.guardianLogin}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-lg font-semibold transition-colors duration-150 text-gris-piedra active:bg-gray-100 [@media(hover:hover)]:hover:bg-gray-50"
                    >
                        Portal Familia
                    </a>
                    <div className="pt-2 pb-1 flex flex-col gap-2">
                        <a href={appUrls.guardianLogin} onClick={() => setIsMobileMenuOpen(false)}>
                            <Button className="w-full !bg-azul-monte-tabor !text-blanco-pureza">
                                Iniciar sesión
                            </Button>
                        </a>
                        {isHomePage && (
                            <div className="relative group">
                                <a href={appUrls.guardianRegister} onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); }} className="pointer-events-none opacity-50 cursor-not-allowed">
                                    <Button variant="primary" className="w-full !text-blanco-pureza">
                                        Postular
                                    </Button>
                                </a>
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                    El proceso de postulación ha finalizado
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default Header;
