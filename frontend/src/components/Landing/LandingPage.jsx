import { Link } from 'react-router-dom';
import {
  BookOpen,
  Mic,
  Activity,
  Users,
  Sparkles,
  ListChecks,
  ArrowRight,
  Check,
} from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    name: 'Manuscript Intelligence Engine',
    description:
      'Full structural X-ray of your manuscript: duplication detection, character census, timeline anomalies, and lexical fingerprinting.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Mic,
    name: 'Voice Isolation Lab',
    description:
      'Dialogue attribution analysis, voice consistency scoring, and speech-pattern fingerprinting for every character.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Activity,
    name: 'Pacing Architect',
    description:
      'Scene-by-scene rhythm analysis, tension-arc mapping, and chapter-length balance reports.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Users,
    name: 'Character Arc Workshop',
    description:
      'Character development tracking, relationship mapping, motivation consistency, and emotional-arc visualization.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: Sparkles,
    name: 'Prose Refinery',
    description:
      'Craft-level analysis: tic tracking, filter-word detection, show-vs-tell scoring, and sentence rhythm profiling.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  {
    icon: ListChecks,
    name: 'Revision Command Center',
    description:
      'Unified revision workflow with prioritized findings, inline suggestions, and progress tracking across all modules.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
];

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Perfect for trying out Refinery with a short manuscript.',
    features: [
      'Up to 10,000 words',
      '2 analysis modules',
      'Basic structural analysis',
      'Export to DOCX',
    ],
    cta: 'Get Started Free',
    ctaLink: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    description: 'Full-powered manuscript analysis for serious writers.',
    features: [
      'Unlimited word count',
      'All 6 analysis modules',
      'Full structural & prose analysis',
      'Export to DOCX & PDF',
      'Tracked changes & comments',
      'Priority processing',
    ],
    cta: 'Start Pro Trial',
    ctaLink: '/signup',
    highlighted: true,
  },
  {
    name: 'Academic',
    price: '$29',
    period: '/mo',
    description: 'Tailored for dissertations, theses, and scholarly writing.',
    features: [
      'Dissertation support',
      'Committee report generation',
      'Citation analysis',
      'All 6 analysis modules',
      'Academic style guides',
      'Collaborative feedback',
    ],
    cta: 'Start Academic Trial',
    ctaLink: '/signup',
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-parchment text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-display tracking-tight mb-4">
              REFINERY
            </h1>
            <p className="text-xl md:text-2xl text-blue-300 font-medium mb-6">
              Where Prose Becomes Perfect
            </p>
            <p className="text-lg text-ink/40 mb-10 leading-relaxed">
              AI-powered manuscript analysis that goes beyond grammar. Get deep
              structural insights, voice consistency scoring, pacing analysis,
              and craft-level prose refinement — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-ink/80 text-white px-8 py-3.5 rounded-lg text-lg font-semibold transition shadow-lg shadow-blue-600/25"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center space-x-2 border border-slate-500 hover:border-slate-400 text-slate-200 hover:text-white px-8 py-3.5 rounded-lg text-lg font-medium transition"
              >
                <span>Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-ink/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display text-slate-900 mb-4">
              Six Modules. One Manuscript.
            </h2>
            <p className="text-lg text-ink/70 max-w-2xl mx-auto">
              Every angle of your writing, analyzed with precision. From
              high-level structure to individual sentence craft.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.name}
                  className="rounded-3xl border border-ink/10 bg-white/90 p-8 hover:shadow-md transition"
                >
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${feature.bg} mb-5`}
                  >
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {feature.name}
                  </h3>
                  <p className="text-ink/70 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display text-slate-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-ink/70 max-w-2xl mx-auto">
              Start free. Upgrade when you're ready for the full power of
              Refinery.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl border-2 p-8 flex flex-col ${
                  tier.highlighted
                    ? 'border-blue-600 shadow-lg shadow-blue-600/10 relative'
                    : 'border-ink/10'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-display text-slate-900 mb-2">
                  {tier.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-slate-900">
                    {tier.price}
                  </span>
                  <span className="text-ink/60">{tier.period}</span>
                </div>
                <p className="text-sm text-ink/70 mb-6">
                  {tier.description}
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start space-x-2 text-sm"
                    >
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-ink/80">{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={tier.ctaLink}
                  className={`block text-center py-3 rounded-lg font-semibold transition ${
                    tier.highlighted
                      ? 'bg-blue-600 hover:bg-ink/80 text-white shadow-md'
                      : 'bg-ink/10 hover:bg-slate-200 text-slate-900'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-ink/40 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg font-display text-slate-200 mb-2">
            Refinery &mdash; Where Prose Becomes Perfect
          </p>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Refinery. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
