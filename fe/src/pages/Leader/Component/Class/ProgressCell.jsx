import React from 'react';

const ProgressCell = ({ current, total }) => {
  const percentage = Math.floor((current / total) * 100);
  const isComplete = percentage === 100;
  
  return (
    <div className="text-center">
      <div className="mb-1">{current}</div>
      <div className="relative w-full h-1 bg-gray-200">
        <div 
          className={`absolute left-0 top-0 h-full ${isComplete ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs mt-1 text-gray-600">{percentage}%</div>
    </div>
  );
};

export default ProgressCell;