'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Download,
  Map,
  Navigation,
  Wifi,
  CloudOff,
  CheckCircle,
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const ONBOARDING_COMPLETE_KEY = 'tc-onboarding-complete';
const ONBOARDING_VERSION = 1;

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to TC Work Zone Locator',
    description:
      "A mobile-first tool designed for Traffic Controllers in Western Australia. Let's get you set up in a few quick steps.",
    icon: <span className="text-4xl">🚧</span>,
  },
  {
    id: 'offline',
    title: 'Download Offline Data',
    description:
      'Download road data to use the app without internet. Essential for remote work sites where coverage is limited.',
    icon: <Download className="w-10 h-10 text-cyan-400" />,
    action: {
      label: 'Download Now',
      href: '/?expand=offline',
    },
  },
  {
    id: 'lookup',
    title: 'Find Your Work Zone',
    description:
      'Select a region and road, enter SLK values, and get coordinates, speed zones, and signage info instantly.',
    icon: <Map className="w-10 h-10 text-green-400" />,
  },
  {
    id: 'tracking',
    title: 'Real-Time GPS Tracking',
    description:
      'Track your position on the road in real-time. See your SLK position, speed limit, and destination ETA while driving.',
    icon: <Navigation className="w-10 h-10 text-blue-400" />,
  },
  {
    id: 'ready',
    title: "You're All Set!",
    description:
      'The app works offline after downloading data. Tap the menu (☰) for tools like AfterCare tracking, Traffic Counter, and more.',
    icon: <CheckCircle className="w-10 h-10 text-green-400" />,
  },
];

interface OnboardingProps {
  onComplete?: () => void;
  onDismiss?: () => void;
}

/**
 * First-run onboarding overlay for new users
 * Guides users through key features and setup
 */
export function Onboarding({ onComplete, onDismiss }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if onboarding has been completed
    const stored = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    let shouldShow = false;
    if (stored) {
      try {
        const { version, completed } = JSON.parse(stored);
        if (!completed || version < ONBOARDING_VERSION) {
          shouldShow = true;
        }
      } catch {
        // Invalid data, show onboarding
        shouldShow = true;
      }
    } else {
      shouldShow = true;
    }

    if (shouldShow) {
      // Defer setState to after render using setTimeout
      const timer = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(
      ONBOARDING_COMPLETE_KEY,
      JSON.stringify({
        version: ONBOARDING_VERSION,
        completed: true,
        completedAt: new Date().toISOString(),
      })
    );
    setIsVisible(false);
    onComplete?.();
  };

  const handleDismiss = () => {
    // Mark as completed even if dismissed
    localStorage.setItem(
      ONBOARDING_COMPLETE_KEY,
      JSON.stringify({ version: ONBOARDING_VERSION, completed: true, dismissed: true })
    );
    setIsVisible(false);
    onDismiss?.();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleDismiss();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div
      className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-sm bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative p-6 pb-0">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-300 p-1"
            aria-label="Skip onboarding"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress dots */}
          <div
            className="flex justify-center gap-1.5 mb-6"
            role="tablist"
            aria-label="Onboarding progress"
          >
            {steps.map((_, index) => (
              <button
                key={index}
                role="tab"
                aria-selected={index === currentStep}
                aria-label={`Step ${index + 1} of ${steps.length}`}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentStep ? 'bg-cyan-400' : 'bg-gray-600',
                  index < currentStep && 'bg-cyan-600'
                )}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4" aria-hidden="true">
            {step.icon}
          </div>

          {/* Title */}
          <h2 id="onboarding-title" className="text-xl font-semibold text-white text-center">
            {step.title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          <p className="text-gray-300 text-center text-sm leading-relaxed">{step.description}</p>

          {/* Action button if available */}
          {step.action && (
            <div className="mt-4">
              {step.action.href ? (
                <a
                  href={step.action.href}
                  onClick={handleComplete}
                  className="block w-full text-center bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {step.action.label}
                </a>
              ) : (
                <Button
                  onClick={() => {
                    step.action?.onClick?.();
                    handleComplete();
                  }}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 h-12"
                >
                  {step.action.label}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between gap-3">
            {!isFirstStep ? (
              <Button
                onClick={handlePrev}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 h-11"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <Button
                onClick={handleSkip}
                variant="ghost"
                className="flex-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700 h-11"
              >
                Skip
              </Button>
            )}

            <Button onClick={handleNext} className="flex-1 bg-cyan-600 hover:bg-cyan-700 h-11">
              {isLastStep ? "Let's Go!" : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-gray-500 mt-3">
            {currentStep + 1} of {steps.length}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if onboarding should be shown
 */
export function useOnboardingStatus() {
  const [shouldShow, setShouldShow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    let show = false;
    if (!stored) {
      show = true;
    } else {
      try {
        const { version, completed } = JSON.parse(stored);
        show = !completed || version < ONBOARDING_VERSION;
      } catch {
        show = true;
      }
    }
    // Use microtask to defer setState
    Promise.resolve().then(() => {
      setShouldShow(show);
      setIsLoading(false);
    });
  }, []);

  return { shouldShow, isLoading };
}

/**
 * Reset onboarding (for testing or user preference)
 */
export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}

/**
 * Compact onboarding checklist for settings
 */
export function OnboardingChecklist() {
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    // Check if offline data is downloaded
    const checkOffline = async () => {
      if ('indexedDB' in window) {
        try {
          const { isOfflineDataAvailable } = await import('@/lib/offline-db');
          const available = await isOfflineDataAvailable();
          setOfflineReady(available);
        } catch {
          setOfflineReady(false);
        }
      }
    };
    checkOffline();
  }, []);

  const checklist = [
    {
      id: 'offline',
      label: 'Download offline data',
      completed: offlineReady,
      href: '/?expand=offline',
    },
    {
      id: 'region',
      label: 'Set default region',
      completed: false, // Can check localStorage if needed
      href: '/?expand=prefs',
    },
    {
      id: 'calibrate',
      label: 'Calibrate GPS (optional)',
      completed: false,
      href: '/calibrate',
    },
  ];

  const allComplete = checklist.every((item) => item.completed);

  if (allComplete) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 rounded-lg p-3">
        <CheckCircle className="w-5 h-5" />
        <span>Setup complete! You're ready to go.</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <CloudOff className="w-4 h-4 text-cyan-400" />
        Quick Setup
      </h3>
      <ul className="space-y-2">
        {checklist.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              className={cn(
                'flex items-center gap-2 text-sm py-1.5 px-2 rounded transition-colors',
                item.completed
                  ? 'text-green-400 bg-green-900/20'
                  : 'text-gray-300 hover:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs',
                  item.completed ? 'border-green-500 bg-green-500 text-white' : 'border-gray-600'
                )}
              >
                {item.completed && '✓'}
              </span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
