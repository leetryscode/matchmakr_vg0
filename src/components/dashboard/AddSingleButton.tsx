"use client";
import React from "react";

interface AddSingleButtonProps {
  onOpenInvite: () => void;
}

export default function AddSingleButton({ onOpenInvite }: AddSingleButtonProps) {
  return (
    <button
      onClick={onOpenInvite}
      className="flex flex-col items-center group w-20 focus:outline-none"
    >
      <div className="w-14 h-14 rounded-full border-2 border-white bg-white/10 hover:bg-white/20 flex items-center justify-center shadow-md group-hover:scale-105 transition">
        <svg className="w-6 h-6 text-primary-blue" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
      </div>
      <span className="mt-2 text-sm font-semibold text-white group-hover:text-primary-blue text-center w-full">Add single</span>
    </button>
  );
} 