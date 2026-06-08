
import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import { appUrls } from '../../utils/appUrls';
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
                <div className="flex-1">
                    <Link to="/" onClick={handleLogoutAndGoHome} className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <img src="https://ik.imagekit.io/11mmsqbe5/mtn-admisiones/logoMTN.png?updatedAt=1780848171943" alt="Logo Colegio Monte Tabor y Nazaret" className="h-10 sm:h-12 flex-shrink-0" />
                        <span className="text-base sm:text-xl font-bold text-azul-monte-tabor font-serif hidden xs:block truncate">
                            Colegio Monte Tabor y Nazaret
                        </span>
                    </Link>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6 lg:gap-8">
                    <a href={appUrls.home} onClick={handleLogoutAndGoHome} className="text-gris-piedra font-semibold transition-colors duration-150 [@media(hover:hover)]:hover:text-azul-monte-tabor active:scale-95">
                        Inicio
                    </a>
                    <a href={appUrls.studentExams} className="text-gris-piedra font-semibold transition-colors duration-150 [@media(hover:hover)]:hover:text-azul-monte-tabor active:scale-95">Exámenes</a>
                    {isAdmin && (
                        <a
                            href={appUrls.adminDashboard}
                            className="text-gris-piedra px-3 py-1 rounded-lg transition-all duration-150 [@media(hover:hover)]:hover:text-azul-monte-tabor [@media(hover:hover)]:hover:bg-dorado-nazaret/10 active:scale-95"
                        >
                            Admin
                        </a>
                    )}
                </nav>

                <div className="flex-1 flex justify-end items-center gap-2 sm:gap-4">
                    {!isAnyUserLoggedIn && (
                        <div className="hidden sm:flex items-center gap-2">
                            <a href={appUrls.guardianLogin}>
                                <Button size="sm" className="!bg-azul-monte-tabor !text-blanco-pureza">
                                    Iniciar sesión
                                </Button>
                            </a>
                            {isHomePage && (
                                <a href={appUrls.guardianRegister}>
                                    <Button variant="primary" size="sm" className="!text-blanco-pureza">
                                        Postular
                                    </Button>
                                </a>
                            )}
                        </div>
                    )}
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
                    {isAdmin && (
                        <a
                            href={appUrls.adminDashboard}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="px-4 py-3 rounded-lg font-semibold transition-colors duration-150 text-gris-piedra active:bg-gray-100 [@media(hover:hover)]:hover:bg-gray-50"
                        >
                            Admin
                        </a>
                    )}
                    {!isAnyUserLoggedIn && (
                        <div className="pt-2 pb-1 flex flex-col gap-2">
                            <a href={appUrls.guardianLogin} onClick={() => setIsMobileMenuOpen(false)}>
                                <Button className="w-full !bg-azul-monte-tabor !text-blanco-pureza">
                                    Iniciar sesión
                                </Button>
                            </a>
                            {isHomePage && (
                                <a href={appUrls.guardianRegister} onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="primary" className="w-full !text-blanco-pureza">
                                        Postular
                                    </Button>
                                </a>
                            )}
                        </div>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Header;
