"use client";

import TaskModal from "@/components/TaskModal";
import { useDashboard } from "@/context/DashboardContext";

// Lets any component (e.g. QuickActionsMenu) open the Add Task modal globally
// via useDashboard().openTaskModal() without each caller mounting its own TaskModal.
export default function GlobalTaskModalMount() {
  const { taskModalOpen, closeTaskModal } = useDashboard();
  return <TaskModal open={taskModalOpen} onClose={closeTaskModal} />;
}
