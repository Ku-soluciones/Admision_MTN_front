
import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Button from '../ui/Button';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Hide header on login pages
    const loginRoutes = ['/login', '/profesor/login', '/familia/login', '/apoderado/login', '/postulacion'];
    const isLoginPage = loginRoutes.includes(location.pathname);
    const navLinkClasses = "text-gris-piedra hover:text-azul-monte-tabor font-semibold transition-colors duration-200";
    const activeLinkClasses = "text-azul-monte-tabor";
    const [isAdmin, setIsAdmin] = useState(false);
    const [isProfessorLoggedIn, setIsProfessorLoggedIn] = useState(false);
    const [isAnyUserLoggedIn, setIsAnyUserLoggedIn] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Verificar si el usuario actual es admin, profesor o cualquier usuario autenticado
    useEffect(() => {
        const checkAuthStatus = () => {
            // Verificar múltiples fuentes de autenticación
            const currentProfessor = localStorage.getItem('currentProfessor');
            const authToken = localStorage.getItem('auth_token');
            const professorToken = localStorage.getItem('professor_token');
            const apoderadoToken = localStorage.getItem('apoderado_token');

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
            localStorage.removeItem('auth_token');
            localStorage.removeItem('professor_token');
            localStorage.removeItem('apoderado_token');
            localStorage.removeItem('currentProfessor');
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

    // Don't render header on login pages
    if (isLoginPage) {
        return null;
    }

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
                    <NavLink
                        to="/"
                        onClick={handleLogoutAndGoHome}
                        className={({ isActive }) => isActive ? `${navLinkClasses} ${activeLinkClasses}`: navLinkClasses}
                    >
                        Inicio
                    </NavLink>
                    <NavLink to="/examenes" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeLinkClasses}`: navLinkClasses}>Exámenes</NavLink>
                    <NavLink to="/apoderado/login" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeLinkClasses}`: navLinkClasses}>Portal Familia</NavLink>
                    {!isProfessorLoggedIn && (
                        <NavLink to="/profesor/login" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeLinkClasses}`: navLinkClasses}>Profesores</NavLink>
                    )}
                    {isAdmin && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) => isActive ?
                                `${navLinkClasses} ${activeLinkClasses} bg-dorado-nazaret/10 px-3 py-1 rounded-lg border border-dorado-nazaret/20` :
                                `${navLinkClasses} hover:bg-dorado-nazaret/10 px-3 py-1 rounded-lg transition-all duration-200`
                            }
                        >
                            ⚙️ Admin
                        </NavLink>
                    )}
                </nav>

                <div className="flex items-center gap-2 sm:gap-4">
                    {!isAnyUserLoggedIn && (
                        <Link to="/apoderado/login" className="hidden sm:block">
                            <Button variant="primary" size="sm">
                                Iniciar Postulación
                            </Button>
                        </Link>
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
                        <NavLink
                            to="/"
                            onClick={(e) => { handleLogoutAndGoHome(e); setIsMobileMenuOpen(false); }}
                            className={({ isActive }) => `px-4 py-3 rounded-lg font-semibold transition-colors ${isActive ? 'text-azul-monte-tabor bg-blue-50' : 'text-gris-piedra hover:bg-gray-50'}`}
                        >
                            Inicio
                        </NavLink>
                        <NavLink
                            to="/examenes"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) => `px-4 py-3 rounded-lg font-semibold transition-colors ${isActive ? 'text-azul-monte-tabor bg-blue-50' : 'text-gris-piedra hover:bg-gray-50'}`}
                        >
                            Exámenes
                        </NavLink>
                        <NavLink
                            to="/apoderado/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) => `px-4 py-3 rounded-lg font-semibold transition-colors ${isActive ? 'text-azul-monte-tabor bg-blue-50' : 'text-gris-piedra hover:bg-gray-50'}`}
                        >
                            Portal Familia
                        </NavLink>
                        {!isProfessorLoggedIn && (
                            <NavLink
                                to="/profesor/login"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={({ isActive }) => `px-4 py-3 rounded-lg font-semibold transition-colors ${isActive ? 'text-azul-monte-tabor bg-blue-50' : 'text-gris-piedra hover:bg-gray-50'}`}
                            >
                                Profesores
                            </NavLink>
                        )}
                        {isAdmin && (
                            <NavLink
                                to="/admin"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={({ isActive }) => `px-4 py-3 rounded-lg font-semibold transition-colors ${isActive ? 'text-azul-monte-tabor bg-blue-50' : 'text-gris-piedra hover:bg-gray-50'}`}
                            >
                                ⚙️ Admin
                            </NavLink>
                        )}
                        {!isAnyUserLoggedIn && (
                            <div className="pt-2 pb-1">
                                <Link to="/apoderado/login" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="primary" className="w-full">
                                        Iniciar Postulación
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;