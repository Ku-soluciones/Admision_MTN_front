
import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { appUrls } from '../../utils/appUrls';
import { authStore, clearAllSessions } from '../../../../packages/backend-sdk/src/index';
import { useHeaderAuthState } from '../../../../packages/shared-ui/src/hooks/useHeaderAuthState';

const Header: React.FC = () => {
    const navigate = useNavigate();
    // Fuente canónica: in-memory authStore (con fallback transicional a
    // localStorage durante el bootstrap F5). Reemplaza el `useEffect` que
    // leía `currentProfessor.isAdmin` directamente desde localStorage, un
    // flag spoofable desde DevTools.
    const { isAdmin, isProfessorLoggedIn, isAnyUserLoggedIn } = useHeaderAuthState();
    const isAdminLoggedIn = isAdmin;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogoutAndGoHome = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isAnyUserLoggedIn) {
            e.preventDefault();
            // Limpia store en memoria + localStorage (todas las claves de rol y
            // sufijos de entorno). El hook re-derivará el estado vacío.
            try { authStore.clear(); } catch { /* no-op */ }
            clearAllSessions();
            navigate('/');
        }
    }, [isAnyUserLoggedIn, navigate]);

    const clearAndGoAdmin = (e: React.MouseEvent) => {
        e.preventDefault();
        try { authStore.clear(); } catch { /* no-op */ }
        clearAllSessions();
        window.location.href = appUrls.adminLogin;
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
                    <a href={appUrls.home} onClick={handleLogoutAndGoHome} className="text-gris-piedra hover:text-azul-monte-tabor font-semibold transition-colors duration-200">
                        Inicio
                    </a>
                    <a href={appUrls.studentExams} className="text-gris-piedra hover:text-azul-monte-tabor font-semibold transition-colors duration-200">Exámenes</a>
                    <a href={appUrls.guardianLogin} className="text-gris-piedra hover:text-azul-monte-tabor font-semibold transition-colors duration-200">Portal Familia</a>
                    {!isProfessorLoggedIn && !isAdminLoggedIn && (
                        <a href={appUrls.professorLogin} className="text-gris-piedra hover:text-azul-monte-tabor font-semibold transition-colors duration-200">Profesores</a>
                    )}
                    {isAnyUserLoggedIn && !isAdminLoggedIn && (
                        <a href={appUrls.adminLogin} onClick={clearAndGoAdmin} className="text-gris-piedra hover:text-azul-monte-tabor font-semibold transition-colors duration-200">Administradores</a>
                    )}
                </nav>

                    <a href={appUrls.freshAdmissions} className="hidden sm:block">
                        <Button variant="primary" size="sm">
                            Iniciar Postulación
                        </Button>
                    </a>
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

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-blanco-pureza border-t border-gray-100 shadow-lg">
                    <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
                        <a
                            href={appUrls.home}
                            onClick={(e) => { handleLogoutAndGoHome(e); setIsMobileMenuOpen(false); }}
                            className="px-4 py-3 rounded-lg font-semibold transition-colors text-gris-piedra hover:bg-gray-50"
                        >
                            Inicio
                        </a>
                        <a
                            href={appUrls.studentExams}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="px-4 py-3 rounded-lg font-semibold transition-colors text-gris-piedra hover:bg-gray-50"
                        >
                            Exámenes
                        </a>
                        <a
                            href={appUrls.guardianLogin}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="px-4 py-3 rounded-lg font-semibold transition-colors text-gris-piedra hover:bg-gray-50"
                        >
                            Portal Familia
                        </a>
                        {!isProfessorLoggedIn && !isAdminLoggedIn && (
                            <a
                                href={appUrls.professorLogin}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-4 py-3 rounded-lg font-semibold transition-colors text-gris-piedra hover:bg-gray-50"
                            >
                                Profesores
                            </a>
                        )}
                        {isAnyUserLoggedIn && !isAdminLoggedIn && (
                            <a
                                href={appUrls.adminLogin}
                                onClick={(e) => { clearAndGoAdmin(e); setIsMobileMenuOpen(false); }}
                                className="px-4 py-3 rounded-lg font-semibold transition-colors text-gris-piedra hover:bg-gray-50"
                            >
                                Administradores
                            </a>
                        )}
                        <div className="pt-2 pb-1">
                            <a href={appUrls.freshAdmissions} onClick={() => setIsMobileMenuOpen(false)}>
                                <Button variant="primary" className="w-full">
                                    Iniciar Postulación
                                </Button>
                            </a>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;
