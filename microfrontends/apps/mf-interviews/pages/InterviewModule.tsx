import React from 'react';
import { useNavigate } from 'react-router-dom';
import InterviewManagement from '../components/interviews/InterviewManagement';

const InterviewModule: React.FC = () => {
    const navigate = useNavigate();
    
    const handleBack = () => {
        navigate('/');
    };

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="container mx-auto px-6 max-w-7xl">
                <InterviewManagement 
                    onBack={handleBack}
                    className="w-full"
                />
            </div>
        </div>
    );
};

export default InterviewModule;