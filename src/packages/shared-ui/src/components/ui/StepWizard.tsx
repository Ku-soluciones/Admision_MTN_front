import React from 'react';

interface Step {
    id: string;
    title: string;
    description?: string;
}

interface StepWizardProps {
    steps: Step[];
    currentStep: string;
    onStepChange: (stepId: string) => void;
    children: React.ReactNode;
    onComplete?: () => void;
    isComplete?: boolean;
}

const StepWizard: React.FC<StepWizardProps> = ({
    steps,
    currentStep,
    onStepChange,
    children,
    onComplete,
    isComplete = false
}) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
        <div className="w-full">
            {/* Progress bar */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gris-piedra">
                        Paso {currentIndex + 1} de {steps.length}
                    </span>
                    <span className="text-sm font-medium text-azul-monte-tabor">
                        {steps[currentIndex]?.title}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                        className="h-full bg-azul-monte-tabor rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Step indicators */}
            <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
                {steps.map((step, index) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = index < currentIndex || isComplete;

                    return (
                        <React.Fragment key={step.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    // Only allow going back or to current/completed steps
                                    if (index <= currentIndex || isComplete) {
                                        onStepChange(step.id);
                                    }
                                }}
                                className={`flex flex-col items-center min-w-[80px] ${
                                    isActive ? 'opacity-100' : isCompleted ? 'opacity-75 hover:opacity-100' : 'opacity-40 cursor-not-allowed'
                                } transition-opacity`}
                                disabled={!isActive && !isCompleted && !isComplete}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                    isActive
                                        ? 'bg-azul-monte-tabor text-white ring-4 ring-azul-monte-tabor ring-opacity-30'
                                        : isCompleted
                                        ? 'bg-verde-esperanza text-white'
                                        : 'bg-gray-300 text-gray-500'
                                }`}>
                                    {isCompleted ? '✓' : index + 1}
                                </div>
                                <span className={`text-xs mt-1 text-center max-w-[80px] truncate ${
                                    isActive ? 'font-semibold text-azul-monte-tabor' : 'text-gris-piedra'
                                }`}>
                                    {step.title}
                                </span>
                            </button>
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 ${
                                    index < currentIndex ? 'bg-verde-esperanza' : 'bg-gray-200'
                                }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Step content */}
            <div className="step-content">
                {children}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                    type="button"
                    onClick={() => {
                        if (currentIndex > 0) {
                            onStepChange(steps[currentIndex - 1].id);
                        }
                    }}
                    disabled={currentIndex === 0}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                        currentIndex === 0
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-azul-monte-tabor hover:bg-gray-100'
                    }`}
                >
                    ← Anterior
                </button>

                {currentIndex < steps.length - 1 ? (
                    <button
                        type="button"
                        onClick={() => {
                            onStepChange(steps[currentIndex + 1].id);
                        }}
                        className="px-6 py-2.5 bg-azul-monte-tabor text-white rounded-lg font-medium hover:bg-blue-800 transition-colors"
                    >
                        Siguiente →
                    </button>
                ) : onComplete ? (
                    <button
                        type="button"
                        onClick={onComplete}
                        className="px-6 py-2.5 bg-verde-esperanza text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                        ✓ Guardar Entrevista
                    </button>
                ) : null}
            </div>
        </div>
    );
};

export { StepWizard };
export default StepWizard;
