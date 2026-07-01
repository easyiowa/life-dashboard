export interface WorkbenchFeedback {
  id:             string;
  user_nickname:  string | null;
  message:        string;
  created_at:     string;
  is_resolved:    boolean;
  screenshot_url: string | null;
}

export interface WorkbenchUpdate {
  id:         string;
  title:      string;
  content:    string;
  status:     "draft" | "published";
  created_at: string;
}

export interface WorkbenchFeedbackArchive {
  id:                  string;
  original_id:         string | null;
  user_nickname:       string | null;
  message:             string;
  original_created_at: string | null;
  archived_at:         string;
}
