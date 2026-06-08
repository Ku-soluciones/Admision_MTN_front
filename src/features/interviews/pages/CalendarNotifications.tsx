import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { CalendarIcon, ClockIcon, UsersIcon } from '../components/icons/Icons';

const CalendarNotifications: React.FC = () => {
    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold text-azul-monte-tabor">
                            Calendario y Notificaciones
                        </h1>
                        <Link to="/">
                            <Button variant="outline">Volver al Inicio</Button>
                        </Link>
                    </div>
                    <p className="text-gris-piedra">
                        Mantente al día con todas las fechas importantes del proceso de admisión
                    </p>
                </div>

                <Card className="p-6">
                    <h2 className="text-xl font-bold text-azul-monte-tabor mb-6 flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6" />
                        Próximamente
                    </h2>
                    <p className="text-gris-piedra">
                        Esta funcionalidad estará disponible próximamente. 
                        Aquí podrás ver todas las fechas importantes del proceso de admisión.
                    </p>
                </Card>
            </div>
        </div>
    );
};

export default CalendarNotifications;