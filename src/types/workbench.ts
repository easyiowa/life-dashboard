export interface WorkbenchFeedback {
  id:            string;
  user_nickname: string | null;
  message:       string;
  created_at:    string;
  is_resolved:   boolean;
}

export interface WorkbenchUpdate {
  id:         string;
  title:      string;
  content:    string;
  status:     "draft" | "published";
  created_at: string;
}
