
import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../admin/components/ui/Button';
import { appUrls } from '../../../admin/utils/appUrls';
import { authStore, clearAllSessions } from '../../../../packages/backend-sdk/src/index';
import { useHeaderAuthState } from '../../../../packages/shared-ui/src/hooks/useHeaderAuthState';

const Header: React.FC = () => {
    const navigate = useNavigate();
    // Fuente canónica: in-memory authStore (con fallback transicional a
    // localStorage durante bootstrap F5). Ver `useHeaderAuthState`.
    const { isAdmin, isAnyUserLoggedIn } = useHeaderAuthState();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogoutAndGoHome = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isAnyUserLoggedIn) {
            e.preventDefault();
            try { authStore.clear(); } catch { /* no-op */ }
            clearAllSessions();
            navigate('/');
        }
    }, [isAnyUserLoggedIn, navigate]);

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
                </nav>

                    <div className="hidden sm:flex items-center gap-2">
                        <a href={appUrls.guardianLogin}>
                            <Button size="sm" className="!bg-azul-monte-tabor !text-blanco-pureza">
                                Iniciar sesión
                            </Button>
                        </a>
                        <a href={appUrls.guardianRegister}>
                            <Button variant="primary" size="sm" className="!text-blanco-pureza">
                                Postular
                            </Button>
                        </a>
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
                        <div className="pt-2 pb-1 flex flex-col gap-2">
                            <a href={appUrls.guardianLogin} onClick={() => setIsMobileMenuOpen(false)}>
                                <Button className="w-full !bg-azul-monte-tabor !text-blanco-pureza">
                                    Iniciar sesión
                                </Button>
                            </a>
                            <a href={appUrls.guardianRegister} onClick={() => setIsMobileMenuOpen(false)}>
                                <Button variant="primary" className="w-full !text-blanco-pureza">
                                    Postular
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
