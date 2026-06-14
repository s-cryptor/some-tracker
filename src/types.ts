export interface Activity {
  id: number;
  name: string;
  days: number[]; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  created_at: string;
}

export interface CheckIn {
  id: number;
  activity_id: number;
  date: string; // YYYY-MM-DD
  completed: number; // 0 or 1
}

export interface DayCheckins {
  [activityId: number]: boolean;
}

export interface WeekData {
  [date: string]: DayCheckins;
}
