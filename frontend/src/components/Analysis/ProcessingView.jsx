import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getManuscriptAnalyses } from '../../services/api';
import {
  BookOpen,
  Mic,
  Activity,
  Users,
  Sparkles,
  ListChecks,
  CheckCircle,
  Loader,
} from 'lucide-react';

const modules = [
  { key: 'intelligence', label: 'Intelligence Engine', icon: BookOpen, delay: 0 },
  { key: 'voice', label: 'Voice Isolation', icon: Mic, delay: 6000 },
  { key: 'pacing', label: 'Pacing Architect', icon: Activity, delay: 12000 },
  { key: 'character', label: 'Character Arc', icon: Users, delay: 18000 },
  { key: 'prose', label: 'Prose Refinery', icon: Sparkles, delay: 24000 },
  { key: 'revision', label: 'Revision Center', icon: ListChecks, delay: 30000 },
];

export default function ProcessingView() {
  const { manuscriptId } = useParams();
  const navigate = useNavigate();
  const [completedModules, setCompletedModules] = useState(new Set());
  const [activeModule, setActiveModule] = useState(0);
  const startTimeRef = useRef(Date.now());
  const pollIntervalRef = useRef(null);
  const simulationIntervalRef = useRef(null);

  // Simulate module progress for visual feedback
  useEffect(() => {
    simulationIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;

      // Determine which modules should appear "completed" based on elapsed time
      const newCompleted = new Set();
      let currentActive = 0;

      modules.forEach((mod, index) => {
        if (elapsed > mod.delay + 5000) {
          newCompleted.add(mod.key);
          currentActive = index + 1;
        } else if (elapsed > mod.delay) {
          currentActive = index;
        }
      });

      setCompletedModules(newCompleted);
      setActiveModule(Math.min(currentActive, modules.length - 1));
    }, 500);

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  // Poll for actual analysis completion
  useEffect(() => {
    const checkAnalysis = async () => {
      try {
        const res = await getManuscriptAnalyses(manuscriptId);
        const analyses = res.data;

        // Check if any analysis has completed
        const hasCompleted = Array.isArray(analyses)
          ? analyses.some((a) => a.status === 'completed')
          : analyses.status === 'completed';

        if (hasCompleted) {
          // Clear intervals and navigate
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
          navigate(`/manuscript/${manuscriptId}`);
        }
      } catch (_err) {
        // Silently retry on next poll
      }
    };

    // Start polling every 5 seconds
    pollIntervalRef.current = setInterval(checkAnalysis, 5000);
    // Also check immediately
    checkAnalysis();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [manuscriptId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Animated spinner */}
        <div className="relative w-32 h-32 mx-auto mb-10">
          {/* Outer pulsing ring */}
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
          {/* Middle rotating ring */}
          <div
            className="absolute inset-2 rounded-full border-4 border-transparent border-t-blue-400 border-r-blue-400 animate-spin"
            style={{ animationDuration: '1.5s' }}
          />
          {/* Inner pulsing dot cluster */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-12 h-12">
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-400 rounded-full animate-pulse"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="absolute bottom-0 left-0 w-3 h-3 bg-blue-300 rounded-full animate-pulse"
                style={{ animationDelay: '300ms' }}
              />
              <div
                className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-full animate-pulse"
                style={{ animationDelay: '600ms' }}
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
          Analyzing your manuscript...
        </h1>
        <p className="text-slate-400 mb-10">
          Running all modules to give you a complete picture.
        </p>

        {/* Module progress indicators */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-8 text-left">
          <div className="space-y-4">
            {modules.map((mod, index) => {
              const Icon = mod.icon;
              const isCompleted = completedModules.has(mod.key);
              const isActive = index === activeModule && !isCompleted;

              return (
                <div
                  key={mod.key}
                  className={`flex items-center space-x-3 transition-opacity duration-500 ${
                    index > activeModule && !isCompleted
                      ? 'opacity-40'
                      : 'opacity-100'
                  }`}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : isActive ? (
                      <Loader className="h-5 w-5 text-blue-400 animate-spin" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-slate-600" />
                    )}
                  </div>

                  {/* Module icon */}
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 ${
                      isCompleted
                        ? 'text-green-400'
                        : isActive
                        ? 'text-blue-400'
                        : 'text-slate-500'
                    }`}
                  />

                  {/* Label */}
                  <span
                    className={`text-sm font-medium ${
                      isCompleted
                        ? 'text-green-300'
                        : isActive
                        ? 'text-blue-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {mod.label}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <span className="text-xs text-blue-400/70 ml-auto">
                      Processing...
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-xs text-green-400/70 ml-auto">
                      Done
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Time estimate note */}
        <p className="text-sm text-slate-500">
          This usually takes 30&ndash;60 seconds. You can wait here or come
          back to your dashboard.
        </p>
      </div>
    </div>
  );
}
