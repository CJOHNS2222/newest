import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, ShoppingBasket, CalendarDays, UtensilsCrossed, Users } from 'lucide-react';

interface TutorialProps {
  onClose: () => void;
}

export const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Smart Pantry Chef",
      description: "Your AI-powered kitchen assistant. Let's take a quick tour.",
      icon: <Sparkles className="w-12 h-12 text-[var(--accent-color)]" />,
    },
    {
      title: "Pantry & Shopping",
      description: "Separate tabs for what you HAVE and what you NEED. Scan receipts to update your pantry instantly.",
      icon: <ShoppingBasket className="w-12 h-12 text-[var(--accent-color)]" />,
    },
    {
      title: "AI Recipe Chef",
      description: "Find recipes based on your exact pantry items. See community ratings and save your favorites.",
      icon: <UtensilsCrossed className="w-12 h-12 text-[var(--accent-color)]" />,
    },
    {
      title: "Community & Sharing",
      description: "Check the 'Social' tab to see what others are cooking and rating. Invite your family to share the pantry.",
      icon: <Users className="w-12 h-12 text-[var(--accent-color)]" />,
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-theme-secondary border border-theme w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent-color)] to-transparent"></div>
        
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 opacity-50 hover:opacity-100 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          <div className="mb-6 p-4 bg-theme-primary rounded-full border border-theme shadow-inner">
            {steps[step].icon}
          </div>
          
          <h3 className="text-2xl font-serif font-bold text-theme-primary mb-3">
            {steps[step].title}
          </h3>
          
          <p className="text-theme-secondary opacity-70 text-sm leading-relaxed mb-8 min-h-[80px]">
            {steps[step].description}
          </p>

          <div className="flex items-center justify-between w-full mt-auto">
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === step ? 'bg-[var(--accent-color)] w-4' : 'bg-theme opacity-30'}`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {step > 0 && (
                <button 
                  onClick={handlePrev}
                  className="p-2 opacity-60 hover:opacity-100 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <button 
                onClick={handleNext}
                className="bg-[var(--accent-color)] hover:opacity-90 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg"
              >
                {step === steps.length - 1 ? "Get Started" : "Next"}
                {step < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};