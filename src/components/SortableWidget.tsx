"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export function SortableWidget({
  id,
  className = "",
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-shadow ${className} ${
        isDragging ? "z-50 scale-[1.02] shadow-2xl opacity-90" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 z-10 p-1 rounded-md text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      {children}
    </div>
  );
}
