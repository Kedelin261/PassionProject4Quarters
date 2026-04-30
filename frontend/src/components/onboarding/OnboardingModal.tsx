import { X, Zap } from 'lucide-react'
import { useOnboarding } from '../../context/OnboardingContext'
import VideoSlideshow from './VideoSlideshow'

export default function OnboardingModal() {
  const { showModal, closeModal, openTour, skipAndComplete } = useOnboarding()

  if (!showModal) return null

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* Modal */}
      <div className="relative bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Getting Started with 4 Quarters</div>
              <div className="text-surface-500 text-xs">Your 12-week execution system — learn how it works</div>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="text-surface-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video / Slideshow */}
        <VideoSlideshow
          onStartTour={openTour}
          onSkip={skipAndComplete}
        />
      </div>
    </div>
  )
}
