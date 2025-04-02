import React from "react";

interface LoadingProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingProps> = ({
  message = "Loading graph data...",
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="relative w-32 h-32">
        {/* Outer Spinner */}
        <div className="absolute inset-0 border-8 border-solid border-[#CE8F6F] rounded-full animate-[spin_1.5s_linear_infinite] opacity-30"></div>
        {/* Middle Spinner */}
        <div className="absolute inset-0 border-8 border-t-transparent border-solid border-[#CE8F6F] rounded-full animate-[spin_1s_ease-in-out_infinite]"></div>
        {/* Inner Spinner */}
        <div className="absolute inset-0 border-8 border-t-transparent border-r-transparent border-solid border-[#CE8F6F] rounded-full animate-[spin_2s_ease-in-out_infinite]"></div>
      </div>
      <p className="mt-6 text-xl font-semibold text-[#CE8F6F] animate-pulse">
        {message}
      </p>
    </div>
  );
};

export default LoadingScreen;
