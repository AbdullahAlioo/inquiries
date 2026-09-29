export type TicketStatus = 
  | 'Pending' | 'Contacted' | 'In Review' | 'Converted' | 'Archived'
  | 'new' | 'in-review' | 'contacted' | 'converted' | 'archived';

export interface Ticket {
  id: string;
  ticket_number?: string;
  name: string;
  email: string;
  phone?: string;
  country?: string; // Enquiry Type
  region?: string;  // Notes / message preview
  interest?: string;
  message?: string;
  source: string;
  status: TicketStatus;
  dealt?: boolean; // Ticked when dealt with
  starred?: boolean;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  timestamp?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export type Inquiry = Ticket;

export interface WaitingEntry {
  id: string;
  email: string;
  website?: string;
  timestamp: string;
}

export interface InquiryStats {
  total: number;
  todayCount: number;
  thisWeekCount: number;
  conversionRate: number;
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  interestCounts: Record<string, number>;
}

export interface DashboardData {
  total_tickets: number;
  unique_parents: number;
  enquiry_types_count: number;
  this_week_count: number;
  enquiry_types: string[];
  tickets: Ticket[];
  waiting_list: WaitingEntry[];
  total_waiting: number;
}

export type FilterStatus = 'all' | 'new' | 'in-review' | 'contacted' | 'converted' | 'archived';
export type FilterSource = 'all' | 'book-a-visit-form' | 'contact-inquiry-form' | string;
export type ActiveTab = 'inquiries' | 'simulator' | 'integration' | 'analytics';
