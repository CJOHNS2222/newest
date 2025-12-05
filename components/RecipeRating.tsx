import React, { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { RecipeRating } from '../types';

interface RecipeRatingUIProps {
  recipeTitle: string;
  onRate: (rating: RecipeRating) => void;
}

export const RecipeRatingUI: React.FC<RecipeRatingUIProps> = ({ recipeTitle, onRate }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRate({
      id: Math.random().toString(36).substr(2, 9),
      recipeTitle,
      rating,
      comment,
      userName: 'Current User', // In a real app this would come from auth
      date: new Date().toLocaleDateString()
    });
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="bg-[#2A0A10]/50 border border-amber-500/20 rounded-xl p-4 text-center animate-fade-in">
        <div className="flex justify-center mb-2">
           {[...Array(rating)].map((_, i) => (
              <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />
           ))}
        </div>
        <p className="text-amber-100 font-serif">Thank you for your feedback!</p>
        <p className="text-xs text-red-200/40 mt-1">Your review helps the community.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#3F1016] rounded-xl p-4 border border-red-900/30 mt-4">
      <h4 className="text-amber-400 font-serif text-lg mb-3 flex items-center gap-2">
        <Star className="w-4 h-4" /> Rate this recipe
      </h4>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 mb-4 justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star 
                className={`w-8 h-8 ${star <= rating ? 'text-amber-500 fill-amber-500' : 'text-red-900/40'}`} 
              />
            </button>
          ))}
        </div>
        
        <div className="relative mb-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your tips or modifications..."
            className="w-full bg-[#2A0A10] text-red-100 border border-red-900/50 rounded-lg p-3 text-sm focus:border-amber-500 focus:outline-none resize-none h-20 placeholder-red-900/50"
          />
          <MessageSquare className="absolute right-3 bottom-3 w-4 h-4 text-red-900/40" />
        </div>

        <button 
          type="submit" 
          disabled={rating === 0}
          className="w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/50 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Review
        </button>
      </form>
    </div>
  );
};