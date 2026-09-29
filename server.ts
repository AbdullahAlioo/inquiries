import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------------------------------------------------
// DATA INTERFACES
// -------------------------------------------------------------

// 1. Inquiries: 5 Core Parameters
// Your name, Phone number, Email address, What can we help with?, Your message
export interface Inquiry {
  id: string;
  ticket_number: string;
  your_name: string;
  phone?: string;
  email: string;
  what_can_we_help_with: string;
  your_message?: string;

  // Compatibility aliases
  name: string;
  message?: string;
  source: string;
  status: 'Pending' | 'Contacted' | 'In Review' | 'Resolved' | 'Archived';
  dealt: boolean;
  starred?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// 2. Enrollments: Full Daycare Registration
// Parent/Guardian name, Phone, Email, Child's name, Child's age, Preferred program, Start date, Message
export interface Enrollment {
  id: string;
  enrollment_number: string;
  parent_name: string;
  phone?: string;
  email: string;
  child_name?: string;
  child_age?: string;
  preferred_program: string;
  preferred_start_date?: string;
  message?: string;

  // Compatibility aliases
  name: string;
  source: string;
  status: 'Pending' | 'Contacted' | 'In Review' | 'Confirmed' | 'Waitlisted' | 'Enrolled' | 'Archived';
  dealt: boolean;
  starred?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

const DATA_DIR = process.env.VERCEL ? path.resolve('/tmp', 'data') : path.resolve(__dirname, 'data');
const INQUIRIES_FILE = path.resolve(DATA_DIR, 'inquiries.json');
const ENROLLMENTS_FILE = path.resolve(DATA_DIR, 'enrollments.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadInquiries(): Inquiry[] {
  try {
    if (fs.existsSync(INQUIRIES_FILE)) {
      const content = fs.readFileSync(INQUIRIES_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map((i, idx) => ({
          ...i,
          ticket_number: i.ticket_number || `INQ-${1001 + idx}`,
          your_name: i.your_name || i.name || 'Visitor',
          name: i.your_name || i.name || 'Visitor',
          what_can_we_help_with: i.what_can_we_help_with || i.help_topic || i.country || i.interest || 'General Inquiry',
          your_message: i.your_message || i.message || i.region || '',
          dealt: Boolean(i.dealt),
          status: i.status || (i.dealt ? 'Resolved' : 'Pending'),
          timestamp: i.timestamp || (i.createdAt ? i.createdAt.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '))
        }));
      }
    }
  } catch (err) {
    console.error('Error reading inquiries.json:', err);
  }
  return [];
}

function saveInquiries(inquiries: Inquiry[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing inquiries.json:', err);
  }
}

function loadEnrollments(): Enrollment[] {
  try {
    if (fs.existsSync(ENROLLMENTS_FILE)) {
      const content = fs.readFileSync(ENROLLMENTS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map((e, idx) => ({
          ...e,
          enrollment_number: e.enrollment_number || `ENR-${5001 + idx}`,
          parent_name: e.parent_name || e.name || 'Parent / Guardian',
          name: e.parent_name || e.name || 'Parent / Guardian',
          preferred_program: e.preferred_program || 'Toddler Program',
          dealt: Boolean(e.dealt),
          status: e.status || (e.dealt ? 'Confirmed' : 'Pending'),
          timestamp: e.timestamp || (e.createdAt ? e.createdAt.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '))
        }));
      }
    }
  } catch (err) {
    console.error('Error reading enrollments.json:', err);
  }
  return [];
}

function saveEnrollments(enrollments: Enrollment[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(enrollments, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing enrollments.json:', err);
  }
}

let inquiriesCache: Inquiry[] = loadInquiries();
let enrollmentsCache: Enrollment[] = loadEnrollments();

// Server-Sent Events subscribers
type SseClient = {
  id: string;
  res: Response;
};
let sseClients: SseClient[] = [];

function broadcastSse(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  });
}

// -------------------------------------------------------------
// 1. INQUIRY INGESTION HANDLER (/inquiry)
// Parameters: Your name, Phone number, Email address, What can we help with?, Your message
// -------------------------------------------------------------
function extractInquiryPayload(sourceData: Record<string, any>) {
  // 1. Your name
  const your_name = String(
    sourceData['Your name'] ||
    sourceData.your_name ||
    sourceData.yourName ||
    sourceData.name ||
    sourceData.fullName ||
    sourceData.fullname ||
    sourceData.parent_name ||
    ''
  ).trim();

  // 2. Phone number
  const phone = String(
    sourceData['Phone number'] ||
    sourceData.phone_number ||
    sourceData.phoneNumber ||
    sourceData.phone ||
    sourceData.tel ||
    sourceData.mobile ||
    ''
  ).trim();

  // 3. Email address
  const email = String(
    sourceData['Email address'] ||
    sourceData.email_address ||
    sourceData.emailAddress ||
    sourceData.email ||
    ''
  ).trim();

  // 4. What can we help with?
  const what_can_we_help_with = String(
    sourceData['What can we help with?'] ||
    sourceData['what can we help with?'] ||
    sourceData['what can we help with'] ||
    sourceData.what_can_we_help_with ||
    sourceData.whatCanWeHelpWith ||
    sourceData.help_topic ||
    sourceData.helpTopic ||
    sourceData.subject ||
    sourceData.topic ||
    sourceData.interest ||
    sourceData.enquiryType ||
    'General Inquiry'
  ).trim();

  // 5. Your message
  const your_message = String(
    sourceData['Your message'] ||
    sourceData.your_message ||
    sourceData.yourMessage ||
    sourceData.message ||
    sourceData.comments ||
    sourceData.notes ||
    sourceData.body ||
    ''
  ).trim();

  const source = String(
    sourceData.source ||
    sourceData['modal-source'] ||
    'inquiry-form'
  ).trim();

  return { your_name, phone, email, what_can_we_help_with, your_message, source };
}

function handleInquiryIngestion(req: Request, res: Response) {
  const payloadSource = req.method === 'GET' ? req.query : { ...req.query, ...req.body };
  const { your_name, phone, email, what_can_we_help_with, your_message, source } = extractInquiryPayload(payloadSource);

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email required',
      message: 'Please provide a valid email address.'
    });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';

  const ticketNumber = `INQ-${1000 + Math.floor(Math.random() * 9000)}`;
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

  const displayName = your_name || 'Visitor';

  const newInquiry: Inquiry = {
    id: `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ticket_number: ticketNumber,
    your_name: displayName,
    name: displayName,
    phone: phone || undefined,
    email,
    what_can_we_help_with: what_can_we_help_with || 'General Inquiry',
    your_message: your_message || undefined,
    message: your_message || undefined,
    source: source || 'inquiry-form',
    status: 'Pending',
    dealt: false,
    starred: false,
    notes: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    timestamp,
    ip: clientIp,
    userAgent
  };

  inquiriesCache = [newInquiry, ...inquiriesCache];
  saveInquiries(inquiriesCache);
  broadcastSse('inquiry_created', newInquiry);

  return res.status(200).json({
    success: true,
    message: 'Inquiry received successfully. Our daycare team will contact you shortly.',
    ticket_number: ticketNumber,
    id: newInquiry.id,
    inquiry: newInquiry
  });
}

// Ingestion Routes for Inquiries
app.get('/inquiry', handleInquiryIngestion);
app.post('/inquiry', handleInquiryIngestion);
app.get('/inquiries', handleInquiryIngestion);
app.post('/inquiries', handleInquiryIngestion);
app.get('/api/inquiry', handleInquiryIngestion);
app.post('/api/inquiry', handleInquiryIngestion);

// -------------------------------------------------------------
// 2. ENROLLMENT INGESTION HANDLER (/enroll & /enool)
// Parameters: Parent/Guardian name, Phone, Email, Child's name, Child's age, Preferred program, Start date, Message
// -------------------------------------------------------------
function extractEnrollmentPayload(sourceData: Record<string, any>) {
  const parent_name = String(
    sourceData.parent_name ||
    sourceData.parentName ||
    sourceData['parent-name'] ||
    sourceData.guardian_name ||
    sourceData.name ||
    sourceData.fullName ||
    ''
  ).trim();

  const phone = String(
    sourceData.phone ||
    sourceData.phone_number ||
    sourceData.phoneNumber ||
    sourceData.tel ||
    sourceData.mobile ||
    ''
  ).trim();

  const email = String(
    sourceData.email ||
    sourceData.email_address ||
    sourceData.emailAddress ||
    ''
  ).trim();

  const child_name = String(
    sourceData.child_name ||
    sourceData.childName ||
    sourceData["child's_name"] ||
    sourceData['child_name'] ||
    sourceData.child ||
    sourceData.student_name ||
    ''
  ).trim();

  const child_age = String(
    sourceData.child_age ||
    sourceData.childAge ||
    sourceData["child's_age"] ||
    sourceData.age ||
    sourceData.child_dob ||
    sourceData.dob ||
    ''
  ).trim();

  const preferred_program = String(
    sourceData.preferred_program ||
    sourceData.preferredProgram ||
    sourceData['preferred-program'] ||
    sourceData.program ||
    sourceData.interest ||
    sourceData.enquiryType ||
    'Toddler Program'
  ).trim();

  const preferred_start_date = String(
    sourceData.preferred_start_date ||
    sourceData.preferredStartDate ||
    sourceData['preferred-start-date'] ||
    sourceData.start_date ||
    sourceData.startDate ||
    sourceData.date ||
    ''
  ).trim();

  const message = String(
    sourceData.message ||
    sourceData.notes ||
    sourceData.comments ||
    sourceData.special_needs ||
    ''
  ).trim();

  const source = String(
    sourceData.source ||
    'enrollment-form'
  ).trim();

  return {
    parent_name,
    phone,
    email,
    child_name,
    child_age,
    preferred_program,
    preferred_start_date,
    message,
    source
  };
}

function handleEnrollmentIngestion(req: Request, res: Response) {
  const payloadSource = req.method === 'GET' ? req.query : { ...req.query, ...req.body };
  const {
    parent_name,
    phone,
    email,
    child_name,
    child_age,
    preferred_program,
    preferred_start_date,
    message,
    source
  } = extractEnrollmentPayload(payloadSource);

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email required',
      message: 'Please provide a valid parent email address.'
    });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';

  const enrollmentNumber = `ENR-${5000 + Math.floor(Math.random() * 9000)}`;
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

  const displayName = parent_name || 'Parent / Guardian';

  const newEnrollment: Enrollment = {
    id: `enr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    enrollment_number: enrollmentNumber,
    parent_name: displayName,
    name: displayName,
    phone: phone || undefined,
    email,
    child_name: child_name || undefined,
    child_age: child_age || undefined,
    preferred_program: preferred_program || 'Toddler Program',
    preferred_start_date: preferred_start_date || undefined,
    message: message || undefined,
    source: source || 'enrollment-form',
    status: 'Pending',
    dealt: false,
    starred: false,
    notes: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    timestamp,
    ip: clientIp,
    userAgent
  };

  enrollmentsCache = [newEnrollment, ...enrollmentsCache];
  saveEnrollments(enrollmentsCache);
  broadcastSse('enrollment_created', newEnrollment);

  return res.status(200).json({
    success: true,
    message: 'Enrollment registration received successfully. Our daycare admissions team will contact you shortly.',
    enrollment_number: enrollmentNumber,
    id: newEnrollment.id,
    enrollment: newEnrollment
  });
}

// Ingestion Routes for Enrollments (Accepts both /enroll and user's /enool)
app.get('/enroll', handleEnrollmentIngestion);
app.post('/enroll', handleEnrollmentIngestion);
app.get('/enool', handleEnrollmentIngestion);
app.post('/enool', handleEnrollmentIngestion);
app.get('/enrollment', handleEnrollmentIngestion);
app.post('/enrollment', handleEnrollmentIngestion);
app.get('/enrollments', handleEnrollmentIngestion);
app.post('/enrollments', handleEnrollmentIngestion);
app.get('/api/enroll', handleEnrollmentIngestion);
app.post('/api/enroll', handleEnrollmentIngestion);

// -------------------------------------------------------------
// SSE STREAM FOR REAL-TIME UPDATES
// -------------------------------------------------------------
app.get('/api/inquiries/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newClient: SseClient = { id: clientId, res };
  sseClients.push(newClient);

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// -------------------------------------------------------------
// REST APIS: INQUIRIES
// -------------------------------------------------------------
app.get('/api/inquiries', (req: Request, res: Response) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  let list = [...inquiriesCache];

  if (search) {
    list = list.filter(i =>
      i.your_name.toLowerCase().includes(search) ||
      i.email.toLowerCase().includes(search) ||
      (i.phone && i.phone.toLowerCase().includes(search)) ||
      i.what_can_we_help_with.toLowerCase().includes(search) ||
      (i.your_message && i.your_message.toLowerCase().includes(search)) ||
      i.ticket_number.toLowerCase().includes(search)
    );
  }

  const pendingCount = inquiriesCache.filter(i => !i.dealt).length;
  const dealtCount = inquiriesCache.filter(i => i.dealt).length;

  res.json({
    success: true,
    total_inquiries: inquiriesCache.length,
    pending_count: pendingCount,
    dealt_count: dealtCount,
    inquiries: list,
    // Aliases for backward compatibility
    tickets: list,
    total_tickets: inquiriesCache.length,
    waiting_list: enrollmentsCache,
    total_waiting: enrollmentsCache.length
  });
});

app.patch('/api/inquiries/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const searchTarget = decodeURIComponent(String(id)).trim().toLowerCase();

  const index = inquiriesCache.findIndex(i =>
    (i.id || '').toLowerCase() === searchTarget ||
    (i.ticket_number || '').toLowerCase() === searchTarget
  );

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Inquiry not found' });
  }

  const current = inquiriesCache[index];
  if (req.body.dealt !== undefined) {
    current.dealt = Boolean(req.body.dealt);
    current.status = current.dealt ? 'Resolved' : 'Pending';
  }
  if (req.body.status) {
    current.status = req.body.status;
  }
  current.updatedAt = new Date().toISOString();

  inquiriesCache[index] = current;
  saveInquiries(inquiriesCache);
  broadcastSse('inquiry_updated', current);

  res.json({ success: true, inquiry: current });
});

function handleInquiryDelete(req: Request, res: Response) {
  const rawId = req.params.id || req.params.ticket_number;
  if (!rawId) {
    return res.status(400).json({ success: false, error: 'No ID provided' });
  }

  const searchTarget = decodeURIComponent(String(rawId)).trim().toLowerCase();

  const index = inquiriesCache.findIndex(i =>
    (i.id || '').toLowerCase() === searchTarget ||
    (i.ticket_number || '').toLowerCase() === searchTarget
  );

  if (index === -1) {
    return res.json({ success: true, message: 'Inquiry already removed', id: rawId });
  }

  const [deleted] = inquiriesCache.splice(index, 1);
  saveInquiries(inquiriesCache);
  broadcastSse('inquiry_deleted', { id: deleted.id, ticket_number: deleted.ticket_number });

  return res.json({
    success: true,
    message: 'Inquiry deleted successfully',
    id: deleted.id,
    ticket_number: deleted.ticket_number
  });
}

app.delete('/api/inquiries/:id', handleInquiryDelete);
app.post('/api/inquiries/:id/delete', handleInquiryDelete);

// -------------------------------------------------------------
// REST APIS: ENROLLMENTS
// -------------------------------------------------------------
app.get('/api/enrollments', (req: Request, res: Response) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  let list = [...enrollmentsCache];

  if (search) {
    list = list.filter(e =>
      e.parent_name.toLowerCase().includes(search) ||
      e.email.toLowerCase().includes(search) ||
      (e.phone && e.phone.toLowerCase().includes(search)) ||
      (e.child_name && e.child_name.toLowerCase().includes(search)) ||
      (e.child_age && e.child_age.toLowerCase().includes(search)) ||
      e.preferred_program.toLowerCase().includes(search) ||
      e.enrollment_number.toLowerCase().includes(search)
    );
  }

  const pendingCount = enrollmentsCache.filter(e => !e.dealt).length;
  const dealtCount = enrollmentsCache.filter(e => e.dealt).length;

  res.json({
    success: true,
    total_enrollments: enrollmentsCache.length,
    pending_count: pendingCount,
    dealt_count: dealtCount,
    enrollments: list
  });
});

app.patch('/api/enrollments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const searchTarget = decodeURIComponent(String(id)).trim().toLowerCase();

  const index = enrollmentsCache.findIndex(e =>
    (e.id || '').toLowerCase() === searchTarget ||
    (e.enrollment_number || '').toLowerCase() === searchTarget
  );

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Enrollment not found' });
  }

  const current = enrollmentsCache[index];
  if (req.body.dealt !== undefined) {
    current.dealt = Boolean(req.body.dealt);
    current.status = current.dealt ? 'Confirmed' : 'Pending';
  }
  if (req.body.status) {
    current.status = req.body.status;
  }
  current.updatedAt = new Date().toISOString();

  enrollmentsCache[index] = current;
  saveEnrollments(enrollmentsCache);
  broadcastSse('enrollment_updated', current);

  res.json({ success: true, enrollment: current });
});

function handleEnrollmentDelete(req: Request, res: Response) {
  const rawId = req.params.id || req.params.enrollment_number;
  if (!rawId) {
    return res.status(400).json({ success: false, error: 'No ID provided' });
  }

  const searchTarget = decodeURIComponent(String(rawId)).trim().toLowerCase();

  const index = enrollmentsCache.findIndex(e =>
    (e.id || '').toLowerCase() === searchTarget ||
    (e.enrollment_number || '').toLowerCase() === searchTarget
  );

  if (index === -1) {
    return res.json({ success: true, message: 'Enrollment already removed', id: rawId });
  }

  const [deleted] = enrollmentsCache.splice(index, 1);
  saveEnrollments(enrollmentsCache);
  broadcastSse('enrollment_deleted', { id: deleted.id, enrollment_number: deleted.enrollment_number });

  return res.json({
    success: true,
    message: 'Enrollment deleted successfully',
    id: deleted.id,
    enrollment_number: deleted.enrollment_number
  });
}

app.delete('/api/enrollments/:id', handleEnrollmentDelete);
app.post('/api/enrollments/:id/delete', handleEnrollmentDelete);

// Legacy waiting list aliases mapped to enrollments
app.get('/api/waiting', (req: Request, res: Response) => {
  res.json({
    success: true,
    total_waiting: enrollmentsCache.length,
    waiting_list: enrollmentsCache
  });
});
app.delete('/api/waiting/:id', handleEnrollmentDelete);

// -------------------------------------------------------------
// CLEAR ALL (Reset all to 0)
// -------------------------------------------------------------
function handleClearAll(_req: Request, res: Response) {
  inquiriesCache = [];
  enrollmentsCache = [];
  saveInquiries([]);
  saveEnrollments([]);
  broadcastSse('data_cleared', {});
  return res.json({ success: true, message: 'All inquiries and enrollments cleared to 0' });
}

app.post('/api/inquiries/clear_all', handleClearAll);
app.post('/api/inquiries/clear-all', handleClearAll);
app.post('/api/clear-all', handleClearAll);
app.delete('/api/inquiries', handleClearAll);
app.delete('/api/enrollments', handleClearAll);

// -------------------------------------------------------------
// EXPORT EXCEL / CSV
// -------------------------------------------------------------
app.get('/export_inquiries', (req: Request, res: Response) => {
  const headers = [
    'Status (Dealt)',
    'Ticket ID',
    'Your Name',
    'Phone Number',
    'Email Address',
    'What Can We Help With?',
    'Your Message',
    'Date Received'
  ];

  const rows = inquiriesCache.map(i => [
    i.dealt ? 'DEALT / DONE' : 'PENDING',
    i.ticket_number || i.id,
    `"${(i.your_name || '').replace(/"/g, '""')}"`,
    `"${(i.phone || '').replace(/"/g, '""')}"`,
    `"${(i.email || '').replace(/"/g, '""')}"`,
    `"${(i.what_can_we_help_with || '').replace(/"/g, '""')}"`,
    `"${(i.your_message || '').replace(/"/g, '""')}"`,
    i.timestamp
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="daycare_inquiries.csv"');
  res.send(csv);
});

app.get('/export_enrollments', (req: Request, res: Response) => {
  const headers = [
    'Status (Confirmed/Dealt)',
    'Enrollment ID',
    'Parent/Guardian Name',
    'Phone Number',
    'Email Address',
    'Child Name',
    'Child Age',
    'Preferred Program',
    'Preferred Start Date',
    'Message / Special Notes',
    'Date Received'
  ];

  const rows = enrollmentsCache.map(e => [
    e.dealt ? 'CONFIRMED / DEALT' : 'PENDING',
    e.enrollment_number || e.id,
    `"${(e.parent_name || '').replace(/"/g, '""')}"`,
    `"${(e.phone || '').replace(/"/g, '""')}"`,
    `"${(e.email || '').replace(/"/g, '""')}"`,
    `"${(e.child_name || '').replace(/"/g, '""')}"`,
    `"${(e.child_age || '').replace(/"/g, '""')}"`,
    `"${(e.preferred_program || '').replace(/"/g, '""')}"`,
    `"${(e.preferred_start_date || '').replace(/"/g, '""')}"`,
    `"${(e.message || '').replace(/"/g, '""')}"`,
    e.timestamp
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="daycare_enrollments.csv"');
  res.send(csv);
});

app.get('/export_excel', (req: Request, res: Response) => {
  const type = String(req.query.type || 'all');
  if (type === 'enrollments') {
    return res.redirect('/export_enrollments');
  }
  return res.redirect('/export_inquiries');
});

// -------------------------------------------------------------
// VITE SPA DEV & PROD SERVING
// -------------------------------------------------------------
async function setupViteOrStatic() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Little Stars Daycare Admin server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  setupViteOrStatic();
}

export default app;
