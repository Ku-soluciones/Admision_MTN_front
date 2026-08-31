import { type PropsWithChildren, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap as AcademicCapIcon,
  CalendarDays,
  ClipboardCheck,
  Home as HomeIcon,
  LogOut as LogoutIcon,
  PanelLeftClose as MenuFoldIcon,
  PanelLeft as MenuUnfoldIcon,
  Users as UsersIcon,
} from "lucide-react";
import { LogoIcon } from "../../../admin/components/icons/Icons";
import type { SpecialtyProfile } from "./SpecialtyProfile";

type Section = { key: string; label: string; icon: React.ComponentType<{ className?: string }> };

const evaluatorSections: Section[] = [
  { key: "dashboard", label: "Dashboard", icon: HomeIcon },
  { key: "agenda", label: "Mi Agenda", icon: CalendarDays },
  { key: "evaluaciones", label: "Mis Evaluaciones", icon: ClipboardCheck },
  { key: "postulantes", label: "Mis Postulantes", icon: UsersIcon },
];

const profileLabels: Record<SpecialtyProfile, string> = {
  PSYCHOMOTOR: "Psicomotricidad",
  PSYCHOLOGY: "Psicología",
  INDICATORS: "Indicadores de Ingreso",
  GROUP_OBSERVATION: "Observación Grupal",
  SUPPORT: "Apoyo al Aprendizaje",
  DAP: "DAP",
  ACADEMIC: "Académico",
};

const profileIcons: Record<SpecialtyProfile, React.ComponentType<{ className?: string }>> = {
  PSYCHOMOTOR: ClipboardCheck,
  PSYCHOLOGY: UsersIcon,
  INDICATORS: ClipboardCheck,
  GROUP_OBSERVATION: UsersIcon,
  SUPPORT: AcademicCapIcon,
  DAP: ClipboardCheck,
  ACADEMIC: AcademicCapIcon,
};

interface PrekinderEvaluatorLayoutProps extends PropsWithChildren {
  profile: SpecialtyProfile;
  sections?: Section[];
}

export function PrekinderEvaluatorLayout({
  profile,
  children,
  sections = evaluatorSections,
}: PrekinderEvaluatorLayoutProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("currentProfessor");
    navigate("/prekinder/login");
  };

  const profileIcon = profileIcons[profile];
  const ProfileIcon = profileIcon;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <LogoIcon className="h-8 w-8" />
              <span className="font-bold text-azul-monte-tabor">Prekinder</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-lg p-2 hover:bg-gray-100"
            aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {sidebarCollapsed ? <MenuUnfoldIcon className="h-5 w-5" /> : <MenuFoldIcon className="h-5 w-5" />}
          </button>
        </div>

        {/* Profile Badge */}
        <div className={`border-b border-gray-200 p-4 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
          <div
            className={`flex items-center gap-3 rounded-lg bg-blue-50 p-3 ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100">
              <ProfileIcon className="h-5 w-5 text-blue-700" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-sm font-bold text-gray-900">{profileLabels[profile]}</p>
                <p className="text-xs text-gray-500">Portal del Evaluador</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeSection === section.key
                    ? "bg-azul-monte-tabor text-white"
                    : "text-gray-600 hover:bg-gray-100"
                } ${sidebarCollapsed ? "justify-center" : ""}`}
                title={sidebarCollapsed ? section.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{section.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            title={sidebarCollapsed ? "Cerrar Sesión" : undefined}
          >
            <LogoutIcon className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
