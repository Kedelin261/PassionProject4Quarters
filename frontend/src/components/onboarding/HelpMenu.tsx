import { useState, useRef, useEffect } from 'react'
import { HelpCircle, PlayCircle, Map, X } from 'lucide-react'
import { useOnboarding } from '../../context/OnboardingContext'

export default function HelpMenu() {
  const [open, setOpen] = useState(false)
  const { openModal, openTour } = useOnboarding()
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleWatchVideo() {
    setOpen(false)
    openModal()
  }

  function handleStartTour() {
    setOpen(false)
    openTour()
  }

  return (
    <div ref={ref} className="relative px-4 pb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-surface-500 hover:text-white hover:bg-surface-800 text-sm transition-all group"
      >
        <HelpCircle size={16} className="group-hover:text-brand-400 transition-colors" />
        <span>Getting Started</span>
        {open && <X size={13} className="ml-auto opacity-60" />}
      </button>

      {open && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-surface-800 border border-surface-700 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-surface-700">
            <div className="text-surface-400 text-xs font-medium uppercase tracking-wider">Help & Onboarding</div>
          </div>
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={handleWatchVideo}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-300 hover:text-white hover:bg-surface-700 text-sm transition-all text-left"
            >
              <PlayCircle size={16} className="text-brand-400 flex-shrink-0" />
              <div>
                <div className="font-medium">Watch Intro</div>
                <div className="text-surface-500 text-xs">13-section system walkthrough</div>
              </div>
            </button>
            <button
              onClick={handleStartTour}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-300 hover:text-white hover:bg-surface-700 text-sm transition-all text-left"
            >
              <Map size={16} className="text-emerald-400 flex-shrink-0" />
              <div>
                <div className="font-medium">Guided Tour</div>
                <div className="text-surface-500 text-xs">10-step interactive walkthrough</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
