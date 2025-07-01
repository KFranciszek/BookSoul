import React from 'react';

const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden animate-pulse">
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Book Cover Skeleton */}
          <div className="flex-shrink-0">
            <div className="w-32 h-48 bg-gray-200 rounded-2xl mx-auto md:mx-0"></div>
          </div>

          {/* Book Details Skeleton */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {/* Title */}
                <div className="h-8 bg-gray-200 rounded mb-2 w-3/4"></div>
                {/* Author */}
                <div className="h-6 bg-gray-200 rounded mb-3 w-1/2"></div>
              </div>
              
              {/* Match Score */}
              <div className="w-16 h-8 bg-gray-200 rounded-full"></div>
            </div>

            {/* Book Details */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>

            {/* Description */}
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              <div className="h-6 bg-gray-200 rounded-full w-14"></div>
            </div>

            {/* Rating Component Skeleton */}
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl">
              <div className="h-4 bg-gray-200 rounded mb-3 w-48"></div>
              <div className="flex gap-2">
                <div className="flex-1 h-16 bg-gray-200 rounded-xl"></div>
                <div className="flex-1 h-16 bg-gray-200 rounded-xl"></div>
                <div className="flex-1 h-16 bg-gray-200 rounded-xl"></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <div className="h-10 bg-gray-200 rounded-2xl w-24"></div>
              <div className="h-10 bg-gray-200 rounded-2xl w-20"></div>
            </div>

            {/* Purchase Links */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="h-10 bg-gray-200 rounded-2xl w-20"></div>
              <div className="h-10 bg-gray-200 rounded-2xl w-16"></div>
              <div className="h-10 bg-gray-200 rounded-2xl w-28"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;