import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, SkipForward, Map } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '../ui/Button'

interface Slide {
  section: number
  icon: string
  title: string
  body: string[]
}

const SLIDES: Slide[] = [
  {
    section: 0,
    icon: '⚡',
    title: 'Welcome to 4 Quarters',
    body: [
      '"Plans don\'t fail because it is a bad plan, plans fail when execution lacks."',
      '4 Quarters is not a planner. It is an execution engine built on The 12 Week Year.',
      'What you are about to see is a system that closes the gap between intention and result.',
    ],
  },
  {
    section: 1,
    icon: '🎯',
    title: 'What This App Is',
    body: [
      'Most people plan well. Almost nobody executes well. That gap is the problem 4 Quarters solves.',
      'Every feature in this app exists to force you from planning mode into execution mode.',
      'You will not find a "someday" bucket here. Every goal connects directly to what you do today.',
    ],
  },
  {
    section: 2,
    icon: '👁️',
    title: 'Vision — Your Why',
    body: [
      'Go to Vision first. Write the life you are building in specific, emotional terms.',
      'Include your emotional connection — who you are doing it for, what it feels like to win.',
      'Execution without vision is just noise. Vision without execution is just a dream.',
    ],
  },
  {
    section: 3,
    icon: '🏆',
    title: '12-Week Goals — Maximum 3',
    body: [
      'A 12-month year gives you permission to procrastinate for 10 months. 12 weeks does not.',
      'You are hard-capped at 3 goals. Not because you lack ambition — because focus multiplies output.',
      'Create your 12-week cycle in the Goals tab, then set your top 3 non-negotiable outcomes.',
    ],
  },
  {
    section: 4,
    icon: '📊',
    title: 'Monthly → Weekly → Daily Hierarchy',
    body: [
      'Every 12-week goal breaks into 3 monthly targets (Month 1, Month 2, Month 3).',
      'Monthly targets break into weekly goals. Weekly goals break into daily tasks.',
      'This is reverse engineering: start with your 12-week outcome and work backward to today.',
    ],
  },
  {
    section: 5,
    icon: '🔺',
    title: 'Pyramid View — See Your Execution Stack',
    body: [
      'Switch to Pyramid View in the Goals tab to see how your execution connects bottom to top.',
      'Daily habits → Daily goals → Weekly goals → Monthly targets → 12-Week outcome → Vision.',
      'If your daily habits fail, your pyramid shows exactly where the execution chain breaks.',
    ],
  },
  {
    section: 6,
    icon: '🔥',
    title: 'Habit Tracker — Consistency Engine',
    body: [
      'Habits are behaviors, not outcomes. Track what you do consistently and what you successfully avoid.',
      '"Execute" habits: scored by whether you did them. "Avoid" habits: scored by whether you resisted.',
      'Your habit score is 40% of your daily grade. Neglect habits and your score falls — no exceptions.',
    ],
  },
  {
    section: 7,
    icon: '📅',
    title: 'Time Blocking — Own Your Calendar',
    body: [
      'What gets scheduled gets done. What does not get scheduled gets stolen.',
      'In Time Blocking, plan your day in advance. Assign blocks to your most important goals.',
      'One hour of planning your day before 9 AM is worth three hours of reactive scrambling.',
    ],
  },
  {
    section: 8,
    icon: '📈',
    title: 'Scoring System — Accountability Math',
    body: [
      'Your Daily Score = 60% goal completion + 40% habit success. No partial credit for almost.',
      'Letter grades: A = 90%+, B = 80%+, C = 70%+, D = 60%+. Below 60% is a failing day.',
      'Your 7-day rolling average is visible in the Dashboard. It does not lie.',
    ],
  },
  {
    section: 9,
    icon: '🤝',
    title: 'Accountability — Your Force Multiplier',
    body: [
      'Research is clear: humans perform measurably better when someone is watching.',
      'Add accountability partners, create challenges, share scores, and refuse to accept excuses.',
      'An accountability partner who sees your score every day is worth more than any app feature.',
    ],
  },
  {
    section: 10,
    icon: '📋',
    title: 'Standups & Reflections',
    body: [
      'Daily standup: what did you complete? What is your focus today? What is in your way?',
      'End-of-day reflection: honest accounting. What did you miss? Why? What changes tomorrow?',
      'Weekly and quarterly check-ins track momentum across the full 12-week cycle.',
    ],
  },
  {
    section: 11,
    icon: '🤖',
    title: 'AI Coach — Direct, Data-Driven Guidance',
    body: [
      'Your AI Coach has access to your vision, goals, scores, and habits.',
      'Ask for a standup prep, a reflection prompt, or a straight answer about your performance.',
      'It is empathetic. It is direct. It will not let you rationalize a bad week into a good story.',
    ],
  },
  {
    section: 12,
    icon: '🚀',
    title: 'Now Stop Planning. Start Executing.',
    body: [
      'You now understand the system. The only thing left is to use it.',
      'Start by writing your Vision. Then create your 12-week cycle. Then set your first 3 goals.',
      '"Execution is the only thing that separates people who dream from people who win." — Start now.',
    ],
  },
]

const SLIDE_DURATION = 11000

interface Props {
  onStartTour: () => void
  onSkip: () => void
}

export default function VideoSlideshow({ onStartTour, onSkip }: Props) {
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = SLIDES.length
  const isLast = current === total - 1

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const p = Math.min((elapsed / SLIDE_DURATION) * 100, 100)
      setProgress(p)
      if (elapsed >= SLIDE_DURATION) {
        clearInterval(timerRef.current!)
        setCurrent(s => {
          if (s < total - 1) return s + 1
          setPlaying(false)
          return s
        })
      }
    }, 40)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [current, playing])

  function goTo(index: number) {
    setProgress(0)
    setCurrent(index)
  }
  function prev() { if (current > 0) goTo(current - 1) }
  function next() { if (current < total - 1) goTo(current + 1) }

  const slide = SLIDES[current]

  return (
    <div className="flex flex-col" style={{ height: '520px' }}>
      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 py-6 text-center">
        <div className="text-6xl mb-5 select-none" role="img">{slide.icon}</div>

        <div className="text-brand-400 text-xs font-semibold uppercase tracking-widest mb-2">
          {slide.section === 0 ? 'Introduction' : `Section ${slide.section} of 12`}
        </div>

        <h2 className="text-white text-xl font-bold mb-5">{slide.title}</h2>

        <div className="space-y-3 max-w-lg">
          {slide.body.map((line, i) => (
            <p
              key={i}
              className={clsx(
                'text-sm leading-relaxed',
                i === 0 && slide.section === 0
                  ? 'text-brand-300 font-medium italic'
                  : 'text-surface-300'
              )}
            >
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Dot navigation */}
      <div className="flex justify-center gap-1 pb-3 px-6 flex-wrap">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={clsx(
              'transition-all duration-200 rounded-full',
              i === current
                ? 'w-5 h-1.5 bg-brand-400'
                : 'w-1.5 h-1.5 bg-surface-700 hover:bg-surface-500'
            )}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-surface-800 mx-6 mb-4 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full"
          style={{ width: `${progress}%`, transition: playing ? 'none' : undefined }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-6 pb-5">
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            disabled={current === 0}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-all disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setPlaying(p => !p)}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-all"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={next}
            disabled={isLast}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-all disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
          <span className="text-surface-600 text-xs ml-2 tabular-nums">
            {current + 1}&thinsp;/&thinsp;{total}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!isLast && (
            <button
              onClick={() => goTo(total - 1)}
              className="flex items-center gap-1.5 text-surface-500 hover:text-surface-300 text-xs transition-colors"
            >
              <SkipForward size={13} />
              Jump to end
            </button>
          )}
          <button
            onClick={onSkip}
            className="text-surface-500 hover:text-surface-300 text-xs transition-colors"
          >
            Skip
          </button>
          <Button size="sm" onClick={onStartTour}>
            <Map size={14} />
            {isLast ? 'Start Guided Tour' : 'Take the Tour'}
          </Button>
        </div>
      </div>
    </div>
  )
}
