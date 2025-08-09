"use client";

import React from "react";

export default function Modal({ onClose, children }) {
  
    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md relative border border-gray-700">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-black"
        >
          ✖
        </button>

        {/* Modal Content */}
        {children}
      </div>
    </div>
  );
}
