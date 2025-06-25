import React, { useState, useEffect } from 'react';
import { ThumbsDown, Meh, ThumbsUp } from 'lucide-react';

interface RatingComponentProps {
  bookId: string;
  onRatingChange: (bookId: string, rating: number) => void;
  currentRating?: number;
  disabled?: boolean;
}

const RatingComponent: React.FC<RatingComponentProps> = ({
  bookId,
  onRatingChange,
  currentRating,
  disabled = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // LOGGING: Track prop changes
  useEffect(() => {
    console.log(`🎯 RatingComponent [${bookId}] - Props changed:`, {
      currentRating,
      disabled,
      isSubmitting,
      timestamp: new Date().toISOString()
    });
  }, [currentRating, disabled, isSubmitting, bookId]);

  // LOGGING: Track component renders
  useEffect(() => {
    console.log(`🔄 RatingComponent [${bookId}] - Component rendered`, {
      currentRating,
      isSubmitting,
      disabled
    });
  });

  const handleRatingClick = async (rating: number) => {
    console.log(`👆 RatingComponent [${bookId}] - Rating clicked:`, {
      rating,
      currentRating,
      disabled,
      isSubmitting,
      canProceed: !disabled && !isSubmitting
    });

    if (disabled || isSubmitting) {
      console.log(`🚫 RatingComponent [${bookId}] - Click blocked:`, { disabled, isSubmitting });
      return;
    }
    
    console.log(`⏳ RatingComponent [${bookId}] - Setting isSubmitting to true`);
    setIsSubmitting(true);
    
    try {
      console.log(`📤 RatingComponent [${bookId}] - Calling onRatingChange with rating:`, rating);
      await onRatingChange(bookId, rating);
      console.log(`✅ RatingComponent [${bookId}] - onRatingChange completed successfully`);
    } catch (error) {
      console.error(`❌ RatingComponent [${bookId}] - onRatingChange failed:`, error);
    } finally {
      console.log(`✅ RatingComponent [${bookId}] - Setting isSubmitting to false`);
      setIsSubmitting(false);
    }
  };

  const getRatingConfig = (rating: number) => {
    const isSelected = currentRating === rating;
    console.log(`🎨 RatingComponent [${bookId}] - Getting config for rating ${rating}:`, {
      currentRating,
      isSelected,
      isSubmitting
    });

    const configs = {
      0: {
        icon: ThumbsDown,
        label: 'Not for me',
        color: isSelected ? 'text-red-600 bg-red-100' : 'text-gray-400 hover:text-red-500 hover:bg-red-50',
        description: 'This recommendation missed the mark'
      },
      1: {
        icon: Meh,
        label: 'It\'s okay',
        color: isSelected ? 'text-yellow-600 bg-yellow-100' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50',
        description: 'Neutral - might be worth considering'
      },
      2: {
        icon: ThumbsUp,
        label: 'Perfect match!',
        color: isSelected ? 'text-green-600 bg-green-100' : 'text-gray-400 hover:text-green-500 hover:bg-green-50',
        description: 'Exactly what I was looking for!'
      }
    };
    return configs[rating as keyof typeof configs];
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-2xl">
      <h4 className="text-sm font-medium text-gray-700 mb-3">How does this recommendation feel to you?</h4>
      
      <div className="flex gap-2">
        {[0, 1, 2].map((rating) => {
          const config = getRatingConfig(rating);
          const Icon = config.icon;
          const isSelected = currentRating === rating;
          
          console.log(`🔘 RatingComponent [${bookId}] - Rendering button ${rating}:`, {
            isSelected,
            currentRating,
            color: config.color,
            disabled: disabled || isSubmitting
          });
          
          return (
            <button
              key={rating}
              onClick={() => handleRatingClick(rating)}
              disabled={disabled || isSubmitting}
              className={`flex-1 flex flex-col items-center p-3 rounded-xl border-2 transition-all transform hover:-translate-y-1 ${
                config.color
              } ${
                disabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isSelected ? 'border-current' : 'border-transparent'
              }`}
              title={config.description}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium text-center">{config.label}</span>
            </button>
          );
        })}
      </div>

      {currentRating !== null && currentRating !== undefined && (
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-600">
            {currentRating === 0 && "Thanks for the feedback! We'll improve our recommendations."}
            {currentRating === 1 && "Got it! We'll keep refining to better match your taste."}
            {currentRating === 2 && "Wonderful! We're learning what works for you."}
          </p>
        </div>
      )}

      {isSubmitting && (
        <div className="mt-2 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Saving your feedback...</span>
        </div>
      )}
    </div>
  );
};

export default RatingComponent;