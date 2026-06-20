"use client";

import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface Props {
  id: string;
  label?: string;
  colSpan?: 1 | 2 | 3;
  children: React.ReactNode;
}

const SPAN: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
};

export default function SortableWidget({ id, label, colSpan = 1, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      id={`widget-${id}`}
      data-widget-id={id}
      data-widget-label={label ?? id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`col-span-1 ${SPAN[colSpan]} rounded-2xl ${isDragging ? "opacity-40" : ""} transition-opacity`}
    >
      <div
        className="relative group h-full"
        style={{ userSelect: "none", WebkitTouchCallout: "none" } as CSSProperties}
      >
        {/* Drag handle — visible on card hover */}
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          className="absolute top-3 right-3 z-30 w-6 h-6 flex items-center justify-center rounded-lg text-slate-700 hover:text-slate-400 hover:bg-white/[0.08] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-150 touch-none"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        {children}
      </div>
    </div>
  );
}
