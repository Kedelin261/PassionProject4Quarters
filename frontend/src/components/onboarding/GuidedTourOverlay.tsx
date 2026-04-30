import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, CheckCircle2 } from 'lucide-react'
import { useOnboarding } from '../../context/OnboardingContext'

interface TourStep {
  route: string
  target: string
  title: string
  description: string
}

const STEPS: TourStep[] = [
  {
    route: '/vision',
    target: '[data-tour="nav-vision"]',
    title: 'Step 1 of 10 — Define Your Vision',
    description:
      'Start here. Your Vision is the life you are building — written with emotional specificity. Without a clear why, daily execution collapses the moment it gets hard. Click Vision in the sidebar to set yours.',
  },
  {
    route: '/goals',
    target: '[data-tour="nav-goals"]',
    title: 'Step 2 of 10 — 12-Week Goals',
    description:
      'Create an active 12-week cycle and set your top 3 goals. Maximum 3 — no exceptions. Focus is the rule here. A 12-week urgency window replaces the year-long permission to procrastinate.',
  },
  {
    route: '/goals',
    target: '[data-tour="nav-goals"]',
    title: 'Step 3 of 10 — Monthly Targets',
    description:
      'Inside each 12-week goal, add Monthly Goals for months 1, 2, and 3. Each month must have a specific, measurable outcome that builds toward the quarter. Expand a goal in List View to add them.',
  },
  {
    route: '/goals',
    target: '[data-tour="nav-goals"]',
    title: 'Step 4 of 10 — Weekly & Daily Execution',
    description:
      'Monthly goals break into weekly goals, and weekly goals break into daily tasks. This is reverse-engineering: start at the 12-week outcome and work backward to what you do today.',
  },
  {
    route: '/goals',
    target: '[data-tour="nav-goals"]',
    title: 'Step 5 of 10 — Pyramid View',
    description:
      'Toggle to Pyramid View in the Goals tab to see your full execution stack — from today\'s habits at the base to your 12-week outcome at the peak. Click any item for details and quick updates.',
  },
  {
    route: '/habits',
    target: '[data-tour="nav-habits"]',
    title: 'Step 6 of 10 — Habit Tracker',
    description:
      'Habits are your consistency engine. Log "execute" habits (did you do it?) and "avoid" habits (did you resist?). Habit success is 40% of your daily grade. Skip habits, watch your score fall.',
  },
  {
    route: '/time-blocking',
    target: '[data-tour="nav-time-blocking"]',
    title: 'Step 7 of 10 — Time Blocking',
    description:
      'What gets scheduled gets done. Block time for your goals before your calendar fills with other people\'s priorities. Link blocks to your active goals for full traceability.',
  },
  {
    route: '/accountability',
    target: '[data-tour="nav-accountability"]',
    title: 'Step 8 of 10 — Accountability Partners',
    description:
      'Invite a partner, share your scores, create challenges. Research is unambiguous — performance improves when someone is watching. An accountability partner is not optional, it is infrastructure.',
  },
  {
    route: '/standups',
    target: '[data-tour="nav-standups"]',
    title: 'Step 9 of 10 — Standups & Reflections',
    description:
      'Daily standups and end-of-day reflections keep you honest. Weekly and quarterly check-ins track momentum across the full cycle. Reflection is not journaling — it is a performance audit.',
  },
  {
    route: '/ai-coach',
    target: '[data-tour="nav-ai-coach"]',
    title: 'Step 10 of 10 — AI Coach',
    description:
      'Your AI Coach knows your goals, scores, and habits. Ask for standup prep, a reflection, or straight coaching when you are stuck. It will not let you rationalize a bad week into a good story.',
  },
]

function findElement(selector: string): Promise<Element | null> {
  return new Promise(resolve => {
    let attempts = 0
    const check = () => {
      const el = document.querySelector(selector)
      if (el) return resolve(el)
      if (++attempts >= 12) return resolve(null)
      setTimeout(check, 80)
    }
    check()
  })
}

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

export default function GuidedTourOverlay() {
  const { showTour, closeTour, skipAndComplete } = useOnboarding()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [visible, setVisible] = useState(false)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const targetElRef = useRef<Element | null>(null)

  const PAD = 6

  const positionSpotlight = useCallback((el: Element) => {
    const r = el.getBoundingClientRect()
    setSpotlight({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    })
  }, [])

  const goToStep = useCallback(async (index: number) => {
    setVisible(false)
    setSpotlight(null)
    const s = STEPS[index]
    navigate(s.route)
    const el = await findElement(s.target)
    if (el) {
      targetElRef.current = el
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      positionSpotlight(el)
    }
    setStep(index)
    setVisible(true)
  }, [navigate, positionSpotlight])

  // Initial step on mount
  useEffect(() => {
    if (showTour) {
      setStep(0)
      goToStep(0)
    }
  }, [showTour]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep spotlight in sync with window resize
  useLayoutEffect(() => {
    if (!showTour) return
    const onResize = () => {
      if (targetElRef.current) positionSpotlight(targetElRef.current)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [showTour, positionSpotlight])

  // Observe target element size changes
  useEffect(() => {
    if (!showTour || !targetElRef.current) return
    resizeObserverRef.current = new ResizeObserver(() => {
      if (targetElRef.current) positionSpotlight(targetElRef.current)
    })
    resizeObserverRef.current.observe(targetElRef.current)
    return () => resizeObserverRef.current?.disconnect()
  }, [step, showTour, positionSpotlight])

  if (!showTour) return null

  const isFirst = step === 0
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  // Tooltip position: to the right of spotlight, vertically centered on it
  const tooltipLeft = spotlight ? spotlight.left + spotlight.width + 16 : 280
  const tooltipTop = spotlight ? Math.max(16, spotlight.top + spotlight.height / 2 - 140) : 200
  // Clamp so tooltip doesn't go off right edge
  const clampedLeft = Math.min(tooltipLeft, window.innerWidth - 340)

  async function handleNext() {
    if (isLast) {
      await closeTour()
    } else {
      goToStep(step + 1)
    }
  }

  async function handleBack() {
    if (!isFirst) goToStep(step - 1)
  }

  async function handleSkip() {
    await skipAndComplete()
  }

  return (
    <>
      {/* Spotlight overlay — pointer-events none so the app is still interactive */}
      <div
        className="fixed inset-0 z-[950] pointer-events-none overflow-hidden"
        style={{ transition: 'opacity 0.2s', opacity: visible ? 1 : 0 }}
      >
        {spotlight && (
          <div
            style={{
              position: 'absolute',
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)',
              borderRadius: 10,
              border: '2px solid rgba(99,102,241,0.75)',
              transition: 'top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease',
            }}
          />
        )}
      </div>

      {/* Tooltip card — pointer-events auto */}
      <div
        className="fixed z-[960] pointer-events-auto"
        style={{
          top: tooltipTop,
          left: clampedLeft,
          width: 316,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-0.5 bg-surface-800">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="text-brand-400 text-xs font-semibold uppercase tracking-wider leading-tight">
                {current.title}
              </div>
              <button
                onClick={handleSkip}
                className="text-surface-600 hover:text-surface-400 transition-colors flex-shrink-0 mt-0.5"
                aria-label="Exit tour"
              >
                <X size={15} />
              </button>
            </div>

            {/* Description */}
            <p className="text-surface-300 text-sm leading-relaxed mb-4">
              {current.description}
            </p>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1 mb-4">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-200 ${
                    i === step
                      ? 'w-4 h-1.5 bg-brand-400'
                      : i < step
                        ? 'w-1.5 h-1.5 bg-brand-600/60'
                        : 'w-1.5 h-1.5 bg-surface-700'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-surface-600 hover:text-surface-400 text-xs transition-colors"
              >
                Exit Tour
              </button>

              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1 text-surface-400 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-surface-700 hover:border-surface-600 transition-all"
                  >
                    <ChevronLeft size={13} />
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs px-4 py-1.5 rounded-lg font-medium transition-all"
                >
                  {isLast ? (
                    <>
                      <CheckCircle2 size={13} />
                      Finish
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pointer arrow pointing left toward the spotlight */}
        {spotlight && (
          <div
            className="absolute"
            style={{
              top: '50%',
              left: -8,
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '8px solid rgb(var(--surface-700, 55 65 81))',
            }}
          />
        )}
      </div>
    </>
  )
}
