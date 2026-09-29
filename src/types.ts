export type TicketStatus = 
  | 'Pending' | 'Contacted' | 'In Review' | 'Resolved' | 'Archived'
  | 'Confirmed' | 'Waitlisted' | 'Enrolled'
  | 'new' | 'in-review' | 'contacted' | 'converted' | 'archived';

// 1. INQUIRY: 5 Parameters
// Your name, Phone number, Email address, What can we help with?, Your message
export interface Inquiry {
  id: string;
  ticket_number: string;
  your_name: string;             // Your name
  name: string;                  // Alias
  phone?: string;                // Phone number
  email: string;                 // Email address
  what_can_we_help_with: string; // What can we help with?
  help_topic?: string;           // Alias
  interest?: string;             // Alias for what_can_we_help_with
  country?: string;              // Legacy alias
  region?: string;               // Legacy alias
  your_message?: string;         // Your message
  message?: string;              // Alias
  
  source: string;
  status: TicketStatus;
  dealt: boolean;                // Ticked when enquiry has been dealt with
  starred?: boolean;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// 2. ENROLLMENT: Full Daycare Registration
// Parent/Guardian name, Phone, Email, Child's name, Child's age, Preferred program, Start date, Message
export interface Enrollment {
  id: string;
  enrollment_number: string;
  parent_name: string;           // Parent or guardian name
  name: string;                  // Alias
  phone?: string;                // Phone number
  email: string;                 // Email address
  child_name?: string;           // Child's name
  child_age?: string;            // Child's age
  preferred_program: string;     // Preferred program
  preferred_start_date?: string; // Preferred start date
  message?: string;              // Additional message / Notes
  notes?: string;                // Staff internal notes

  source: string;
  status: TicketStatus;
  dealt: boolean;                // Ticked when enrollment has been processed
  starred?: boolean;
  createdAt: string;
  updatedAt?: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// Legacy aliases for backward compatibility
export type Ticket = Inquiry;
export type WaitingEntry = Enrollment;

export interface InquiryStats {
  total: number;
  todayCount: number;
  thisWeekCount: number;
  conversionRate: number;
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  interestCounts: Record<string, number>;
  total_inquiries?: number;
  total_enrollments?: number;
  inquiries_pending?: number;
  inquiries_dealt?: number;
  enrollments_pending?: number;
  enrollments_dealt?: number;
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
