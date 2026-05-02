
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import { microfrontendUrls } from '../../utils/microfrontendUrls';
import { getStorageKey, BASE_STORAGE_KEYS } from '../../../../packages/backend-sdk/src/index';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isHomePage = location.pathname === '/';
    const [isAdmin, setIsAdmin] = useState(false);
    const [isProfessorLoggedIn, setIsProfessorLoggedIn] = useState(false);
    const [isAnyUserLoggedIn, setIsAnyUserLoggedIn] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Verificar si el usuario actual es admin, profesor o cualquier usuario autenticado
    useEffect(() => {
        const checkAuthStatus = () => {
            // Verificar múltiples fuentes de autenticación
            const currentProfessor = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR));
            const authToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
            const professorToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
            const apoderadoToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.APODERADO_TOKEN));

            // Verificar si hay profesor autenticado
            const hasProfessorAuth = !!(professorToken && currentProfessor);
            setIsProfessorLoggedIn(hasProfessorAuth);

            // Verificar si hay CUALQUIER usuario autenticado
            const hasAnyAuth = !!(authToken || professorToken || apoderadoToken);
            setIsAnyUserLoggedIn(hasAnyAuth);

            // Solo mostrar admin si hay un token válido Y datos de profesor admin
            if ((authToken || professorToken) && currentProfessor) {
                try {
                    const professorData = JSON.parse(currentProfessor);
                    setIsAdmin(professorData.isAdmin === true);
                } catch (error) {
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
        };

        checkAuthStatus();

        // Escuchar cambios en localStorage
        const handleStorageChange = () => {
            checkAuthStatus();
        };

        window.addEventListener('storage', handleStorageChange);

        // También verificar cuando cambie el contenido actual
        const interval = setInterval(checkAuthStatus, 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    // Función para hacer logout completo
    const handleLogoutAndGoHome = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Solo hacer logout si hay un usuario autenticado
        if (isAnyUserLoggedIn) {
            e.preventDefault(); // Prevenir navegación predeterminada

            // Limpiar TODOS los tokens y datos de autenticación
            localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
            localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
            localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.APODERADO_TOKEN));
            localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR));
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentApoderado');

            // Actualizar estados locales
            setIsAdmin(false);
            setIsProfessorLoggedIn(false);
            setIsAnyUserLoggedIn(false);

            // Navegar a la página de inicio
            navigate('/');

            // Forzar recarga para limpiar cualquier estado en memoria
            window.location.reload();
        }
        // Si no hay usuario autenticado, dejar que el link funcione normalmente
    };

    const navigateTo = (url: string) => {
        window.location.href = url;
    };

    return (
        <header className="bg-blanco-pureza shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
                <Link to="/" onClick={handleLogoutAndGoHome} className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <img src="/images/logoMTN.png" alt="Logo Colegio Monte Tabor y Nazaret" className="h-10 sm:h-12 flex-shrink-0" />
                    <span className="text-base sm:text-xl font-bold text-azul-monte-tabor font-serif hidden xs:block truncate">
                        Colegio Monte Tabor y Nazaret
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6 lg:gap-8">
                    <a href={microfrontendUrls.home} onClick={handleLogoutAndGoHome} className="text-gris-piedra hover:text-azul-monte-tabor font-semibold transition-colors duration-200">
                        Inicio
                    </a>
                    <a href={microfrontendUrls.studentExams} className="text-gris-piedra hover:text-azul-monte-tabor font-semibold transition-colors duration-200">Exámenes</a>
                    <a href={microfrontendUrls.guardianLogin} className="text-gris-piedra hover:text-azul-monte-tabor font-semibold transition-colors duration-200">Portal Familia</a>
                    {!isProfessorLoggedIn && (
                        <a href={microfrontendUrls.professorLogin} className="text-gris-piedra hover:text-azul-monte-tabor font-semibold transition-colors duration-200">Profesores</a>
                    )}
                    {isAdmin && (
                        <a
                            href={microfrontendUrls.adminDashboard}
                            className="text-gris-piedra hover:text-azul-monte-tabor hover:bg-dorado-nazaret/10 px-3 py-1 rounded-lg transition-all duration-200"
                        >
                            Admin
                        </a>
                    )}
                </nav>

                <div className="flex items-center gap-2 sm:gap-4">
                    {!isAnyUserLoggedIn && isHomePage && (
                        <div className="hidden sm:flex items-center gap-3">
                            <a href={microfrontendUrls.guardianLogin} className="text-gris-piedra hover:text-azul-monte-tabor font-semibold transition-colors duration-200">
                                Iniciar sesión
                            </a>
                            <a href={microfrontendUrls.admissions}>
                                <Button variant="primary" size="sm" className="!text-blanco-pureza">
                                    Postular
                                </Button>
                            </a>
                        </div>
                    )}
                    {!isAnyUserLoggedIn && !isHomePage && (
                        <a href={microfrontendUrls.admissions} className="hidden sm:block">
                            <Button variant="primary" size="sm">
                                Iniciar Postulación
                            </Button>
                        </a>
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

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-blanco-pureza border-t border-gray-100 shadow-lg">
                    <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
                        <a
                            href={microfrontendUrls.home}
                            onClick={(e) => { handleLogoutAndGoHome(e); setIsMobileMenuOpen(false); }}
                            className="px-4 py-3 rounded-lg font-semibold transition-colors text-gris-piedra hover:bg-gray-50"
                        >
                            Inicio
                        </a>
                        <a
                            href={microfrontendUrls.studentExams}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="px-4 py-3 rounded-lg font-semibold transition-colors text-gris-piedra hover:bg-gray-50"
                        >
                            Exámenes
                        </a>
                        <a
                            href={microfrontendUrls.guardianLogin}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="px-4 py-3 rounded-lg font-semibold transition-colors text-gris-piedra hover:bg-gray-50"
                        >
                            Portal Familia
                        </a>
                        {!isProfessorLoggedIn && (
                            <a
                                href={microfrontendUrls.professorLogin}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-4 py-3 rounded-lg font-semibold transition-colors text-gris-piedra hover:bg-gray-50"
                            >
                                Profesores
                            </a>
                        )}
                        {isAdmin && (
                            <a
                                href={microfrontendUrls.adminDashboard}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-4 py-3 rounded-lg font-semibold transition-colors text-gris-piedra hover:bg-gray-50"
                            >
                                Admin
                            </a>
                        )}
                        {!isAnyUserLoggedIn && isHomePage && (
                            <div className="pt-2 pb-1 flex flex-col gap-2">
                                <a href={microfrontendUrls.guardianLogin} onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="outline" className="w-full">
                                        Iniciar sesión
                                    </Button>
                                </a>
                                <a href={microfrontendUrls.admissions} onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="primary" className="w-full !text-blanco-pureza">
                                        Postular
                                    </Button>
                                </a>
                            </div>
                        )}
                        {!isAnyUserLoggedIn && !isHomePage && (
                            <div className="pt-2 pb-1">
                                <a href={microfrontendUrls.admissions} onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="primary" className="w-full">
                                        Iniciar Postulación
                                    </Button>
                                </a>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;
