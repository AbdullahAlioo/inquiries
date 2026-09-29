export type TicketStatus = 
  | 'Pending' | 'Contacted' | 'In Review' | 'Converted' | 'Archived'
  | 'new' | 'in-review' | 'contacted' | 'converted' | 'archived';

export interface Ticket {
  id: string;
  ticket_number?: string;
  
  // The 8 Core Daycare Inquiry Fields
  parent_name: string;          // Parent or guardian name
  phone?: string;               // Phone number
  child_name?: string;          // Child's name
  child_age?: string;           // Child's age
  email: string;                // Email address
  preferred_program?: string;   // Preferred program
  preferred_start_date?: string;// Preferred start date
  message?: string;             // Message
  
  // Aliases & Admin fields for backwards compatibility
  name: string;                 // Same as parent_name
  country?: string;             // Alias for preferred_program
  region?: string;              // Alias for message preview
  interest?: string;            // Alias for preferred_program
  source: string;
  status: TicketStatus;
  dealt?: boolean;              // Ticked when dealt with
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
