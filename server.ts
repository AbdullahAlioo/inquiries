import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable CORS for all origins so external websites/scripts can send inquiries
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export interface Inquiry {
  id: string;
  ticket_number: string;
  // 8 Core Daycare Inquiry Fields
  parent_name: string;
  phone?: string;
  child_name?: string;
  child_age?: string;
  email: string;
  preferred_program?: string;
  preferred_start_date?: string;
  message?: string;

  // Backwards compatibility & admin extras
  name: string;
  country: string; // Enquiry Type / Preferred Program
  region?: string;  // Notes / message preview
  interest?: string;
  source: string;
  status: 'Pending' | 'Contacted' | 'In Review' | 'Converted' | 'Archived';
  dealt: boolean; // Tick option: true when parent enquiry has been dealt with
  starred?: boolean;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface WaitingEntry {
  id: string;
  email: string;
  website?: string;
  timestamp: string;
}

const DATA_DIR = process.env.VERCEL ? path.resolve('/tmp', 'data') : path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'inquiries.json');
const WAITING_FILE = path.resolve(DATA_DIR, 'waiting_list.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// All records start empty as requested ("make every thinge 0 now")
const SEED_INQUIRIES: Inquiry[] = [];
const SEED_WAITING: WaitingEntry[] = [];

function loadInquiries(): Inquiry[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map((i, idx) => ({
          ...i,
          ticket_number: i.ticket_number || `REQ-${1001 + idx}`,
          country: i.country || i.interest || 'General Enquiry',
          dealt: Boolean(i.dealt),
          status: i.status || (i.dealt ? 'Converted' : 'Pending'),
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
    fs.writeFileSync(DATA_FILE, JSON.stringify(inquiries, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing inquiries.json:', err);
  }
}

function loadWaitingList(): WaitingEntry[] {
  try {
    if (fs.existsSync(WAITING_FILE)) {
      const content = fs.readFileSync(WAITING_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading waiting_list.json:', err);
  }
  return [];
}

function saveWaitingList(list: WaitingEntry[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(WAITING_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing waiting_list.json:', err);
  }
}

let inquiriesCache: Inquiry[] = loadInquiries();
let waitingListCache: WaitingEntry[] = loadWaitingList();

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

function extractInquiryPayload(sourceData: Record<string, any>, req: Request) {
  // 1. Parent or guardian name
  const parent_name = String(
    sourceData.parent_name ||
    sourceData.parentName ||
    sourceData['parent-name'] ||
    sourceData.parent_or_guardian_name ||
    sourceData['parent_or_guardian_name'] ||
    sourceData.guardian_name ||
    sourceData.guardianName ||
    sourceData.name ||
    sourceData['modal-name'] ||
    sourceData.fullName ||
    sourceData.fullname ||
    ''
  ).trim();

  // 2. Phone number
  const phone = String(
    sourceData.phone ||
    sourceData.phone_number ||
    sourceData.phoneNumber ||
    sourceData['modal-phone'] ||
    sourceData.tel ||
    sourceData.mobile ||
    ''
  ).trim();

  // 3. Child's name
  const child_name = String(
    sourceData.child_name ||
    sourceData.childName ||
    sourceData['child_name'] ||
    sourceData["child's_name"] ||
    sourceData['childs_name'] ||
    sourceData.child ||
    sourceData['modal-child'] ||
    sourceData.student_name ||
    sourceData.studentName ||
    ''
  ).trim();

  // 4. Child's age
  const child_age = String(
    sourceData.child_age ||
    sourceData.childAge ||
    sourceData["child's_age"] ||
    sourceData['childs_age'] ||
    sourceData.age ||
    sourceData['modal-age'] ||
    sourceData.child_dob ||
    sourceData.dob ||
    ''
  ).trim();

  // 5. Email address
  const email = String(
    sourceData.email ||
    sourceData.email_address ||
    sourceData.emailAddress ||
    sourceData['modal-email'] ||
    ''
  ).trim();

  // 6. Preferred program
  const preferred_program = String(
    sourceData.preferred_program ||
    sourceData.preferredProgram ||
    sourceData['preferred-program'] ||
    sourceData.program ||
    sourceData.interest ||
    sourceData['modal-interest'] ||
    sourceData.country ||
    sourceData.enquiryType ||
    sourceData.enquiry_type ||
    sourceData.subject ||
    'Toddler Program'
  ).trim();

  // 7. Preferred start date
  const preferred_start_date = String(
    sourceData.preferred_start_date ||
    sourceData.preferredStartDate ||
    sourceData['preferred-start-date'] ||
    sourceData.start_date ||
    sourceData.startDate ||
    sourceData['start-date'] ||
    sourceData.date ||
    sourceData['modal-start-date'] ||
    ''
  ).trim();

  // 8. Message
  const message = String(
    sourceData.message ||
    sourceData['modal-message'] ||
    sourceData.region ||
    sourceData.comments ||
    sourceData.notes ||
    sourceData.body ||
    ''
  ).trim();

  const source = String(
    sourceData.source ||
    sourceData['modal-source'] ||
    'daycare-website-form'
  ).trim();

  const standardKeys = new Set([
    'name', 'modal-name', 'fullName', 'fullname', 'parent_name', 'parentName', 'parent-name', 'parent_or_guardian_name', 'guardian_name',
    'phone', 'phone_number', 'phoneNumber', 'modal-phone', 'tel', 'mobile',
    'child_name', 'childName', "child's_name", 'childs_name', 'child', 'modal-child', 'student_name',
    'child_age', 'childAge', "child's_age", 'childs_age', 'age', 'modal-age', 'child_dob', 'dob',
    'email', 'email_address', 'emailAddress', 'modal-email',
    'preferred_program', 'preferredProgram', 'preferred-program', 'program', 'country', 'interest', 'modal-interest', 'enquiryType', 'enquiry_type', 'subject',
    'preferred_start_date', 'preferredStartDate', 'preferred-start-date', 'start_date', 'startDate', 'start-date', 'date', 'modal-start-date',
    'message', 'modal-message', 'region', 'comments', 'notes', 'body',
    'source', 'modal-source', 'ticket_number', 'dealt'
  ]);

  const metadata: Record<string, any> = {};
  for (const [k, v] of Object.entries(sourceData)) {
    if (!standardKeys.has(k) && v !== undefined && v !== '') {
      metadata[k] = v;
    }
  }

  return {
    parent_name,
    phone,
    child_name,
    child_age,
    email,
    preferred_program,
    preferred_start_date,
    message,
    source,
    metadata
  };
}

// -------------------------------------------------------------
// CORE INQUIRY INGESTION ENDPOINTS (Matches User's Website Script)
// Accepts GET /inquiry?parent_name=...&phone=...&child_name=...
// Also accepts POST /inquiry with JSON or URL-encoded form body
// -------------------------------------------------------------
function handleInquiryIngestion(req: Request, res: Response) {
  const payloadSource = req.method === 'GET' ? req.query : { ...req.query, ...req.body };
  const {
    parent_name,
    phone,
    child_name,
    child_age,
    email,
    preferred_program,
    preferred_start_date,
    message,
    source,
    metadata
  } = extractInquiryPayload(payloadSource, req);

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email required',
      message: 'Please provide a valid email address.'
    });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';

  const ticketNumber = `REQ-${1000 + Math.floor(Math.random() * 9000)}`;
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

  const displayName = parent_name || 'Parent / Guardian';

  const newInquiry: Inquiry = {
    id: `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ticket_number: ticketNumber,
    // The 8 Core Daycare Fields
    parent_name: displayName,
    phone: phone || undefined,
    child_name: child_name || undefined,
    child_age: child_age || undefined,
    email,
    preferred_program: preferred_program || 'Toddler Program',
    preferred_start_date: preferred_start_date || undefined,
    message: message || undefined,

    // Backward compatibility aliases
    name: displayName,
    country: preferred_program || 'Toddler Program',
    region: message || undefined,
    interest: preferred_program || 'Toddler Program',
    source: source || 'website-form',
    status: 'Pending',
    dealt: false, // Starts unticked (pending)
    starred: false,
    notes: '',
    tags: [preferred_program || 'Daycare Enquiry'],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    timestamp,
    ip: clientIp,
    userAgent,
    metadata
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

// Routes for website scripts
app.get('/inquiry', handleInquiryIngestion);
app.post('/inquiry', handleInquiryIngestion);
app.get('/api/inquiry', handleInquiryIngestion);
app.post('/api/inquiry', handleInquiryIngestion);

// -------------------------------------------------------------
// ADMIN DASHBOARD REST APIS
// -------------------------------------------------------------

// SSE stream for real-time live inbox updates
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

// GET /api/inquiries
app.get('/api/inquiries', (req: Request, res: Response) => {
  let list = [...inquiriesCache];

  const search = String(req.query.search || '').trim().toLowerCase();
  const country = String(req.query.country || '').trim();

  if (search) {
    list = list.filter(inq =>
      inq.name.toLowerCase().includes(search) ||
      inq.email.toLowerCase().includes(search) ||
      (inq.phone && inq.phone.toLowerCase().includes(search)) ||
      (inq.country && inq.country.toLowerCase().includes(search)) ||
      (inq.ticket_number && inq.ticket_number.toLowerCase().includes(search))
    );
  }

  if (country && country !== '') {
    list = list.filter(inq => inq.country === country);
  }

  // Calculate unique parents and enquiry types
  const uniqueEmails = Array.from(new Set(inquiriesCache.map(i => i.email)));
  const uniqueTypes = Array.from(new Set(inquiriesCache.map(i => i.country).filter(Boolean)));
  
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = inquiriesCache.filter(i => new Date(i.createdAt).getTime() >= oneWeekAgo).length;

  res.json({
    success: true,
    total_tickets: inquiriesCache.length,
    filteredTotal: list.length,
    unique_parents: uniqueEmails.length,
    enquiry_types_count: uniqueTypes.length,
    this_week_count: thisWeekCount,
    enquiry_types: uniqueTypes,
    tickets: list,
    waiting_list: waitingListCache,
    total_waiting: waitingListCache.length
  });
});

// TOGGLE TICK / DEALT STATUS
app.patch('/api/inquiries/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = inquiriesCache.findIndex(i => i.id === id || i.ticket_number === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Enquiry not found' });
  }

  const current = inquiriesCache[index];
  if (req.body.dealt !== undefined) {
    current.dealt = Boolean(req.body.dealt);
    current.status = current.dealt ? 'Converted' : 'Pending';
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

// DELETE inquiry (Robust handler supporting ID, Ticket Number, case-insensitivity)
function handleInquiryDelete(req: Request, res: Response) {
  const rawId = req.params.id || req.params.ticket_number;
  if (!rawId) {
    return res.status(400).json({ success: false, error: 'No ID provided' });
  }

  const searchTarget = decodeURIComponent(String(rawId)).trim().toLowerCase();

  const index = inquiriesCache.findIndex(i => {
    const idMatch = (i.id || '').toLowerCase() === searchTarget;
    const ticketMatch = (i.ticket_number || '').toLowerCase() === searchTarget;
    return idMatch || ticketMatch;
  });

  if (index === -1) {
    // Already deleted or not found; return success so client state reconciles cleanly
    return res.json({ success: true, message: 'Enquiry already removed or not found', id: rawId });
  }

  const [deleted] = inquiriesCache.splice(index, 1);
  saveInquiries(inquiriesCache);
  broadcastSse('inquiry_deleted', { id: deleted.id, ticket_number: deleted.ticket_number });

  return res.json({
    success: true,
    message: 'Enquiry deleted successfully',
    id: deleted.id,
    ticket_number: deleted.ticket_number
  });
}

app.delete('/api/inquiries/:id', handleInquiryDelete);
app.post('/api/inquiries/:id/delete', handleInquiryDelete);
app.delete('/api/inquiry/:id', handleInquiryDelete);
app.post('/delete_ticket/:ticket_number', (req: Request, res: Response) => {
  handleInquiryDelete(req, res);
});
app.get('/delete_ticket/:ticket_number', (req: Request, res: Response) => {
  handleInquiryDelete(req, res);
});

// CLEAR ALL (Reset all to 0) - Aliases for maximum compatibility
function handleClearAll(_req: Request, res: Response) {
  inquiriesCache = [];
  waitingListCache = [];
  saveInquiries([]);
  saveWaitingList([]);
  broadcastSse('inquiries_cleared', {});
  return res.json({ success: true, message: 'All inquiries and waiting list cleared to 0' });
}

app.post('/api/inquiries/clear_all', handleClearAll);
app.post('/api/inquiries/clear-all', handleClearAll);
app.post('/api/clear-all', handleClearAll);
app.delete('/api/inquiries', handleClearAll);

// WAITING LIST API
app.get('/api/waiting', (_req: Request, res: Response) => {
  res.json({
    success: true,
    total_waiting: waitingListCache.length,
    waiting_list: waitingListCache
  });
});

app.post('/api/waiting', (req: Request, res: Response) => {
  const { email, website } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email required' });
  }

  const newEntry: WaitingEntry = {
    id: `wait_${Date.now()}`,
    email: String(email).trim(),
    website: website ? String(website).trim() : undefined,
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };

  waitingListCache = [newEntry, ...waitingListCache];
  saveWaitingList(waitingListCache);
  broadcastSse('waiting_updated', waitingListCache);

  res.json({ success: true, entry: newEntry });
});

app.delete('/api/waiting/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  waitingListCache = waitingListCache.filter(w => w.id !== id);
  saveWaitingList(waitingListCache);
  broadcastSse('waiting_updated', waitingListCache);
  res.json({ success: true, message: 'Removed from waiting list' });
});

// POST form delete waiting entry
app.post('/delete_waiting_entry/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  waitingListCache = waitingListCache.filter(w => w.id !== id);
  saveWaitingList(waitingListCache);
  broadcastSse('waiting_updated', waitingListCache);
  res.redirect('/');
});

// EXPORT EXCEL / CSV
function handleExport(req: Request, res: Response) {
  const headers = [
    'Status (Dealt)',
    'Request ID',
    'Parent or Guardian Name',
    'Phone Number',
    'Child Name',
    'Child Age',
    'Email Address',
    'Preferred Program',
    'Preferred Start Date',
    'Message',
    'Date Received'
  ];

  const rows = inquiriesCache.map(i => [
    i.dealt ? 'DEALT / DONE' : 'PENDING',
    i.ticket_number || i.id,
    `"${(i.parent_name || i.name || '').replace(/"/g, '""')}"`,
    `"${(i.phone || '').replace(/"/g, '""')}"`,
    `"${(i.child_name || '').replace(/"/g, '""')}"`,
    `"${(i.child_age || '').replace(/"/g, '""')}"`,
    `"${(i.email || '').replace(/"/g, '""')}"`,
    `"${(i.preferred_program || i.country || i.interest || '').replace(/"/g, '""')}"`,
    `"${(i.preferred_start_date || '').replace(/"/g, '""')}"`,
    `"${(i.message || i.region || i.notes || '').replace(/"/g, '""')}"`,
    i.timestamp
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="daycare_parent_enquiries.csv"');
  res.send(csv);
}

app.get('/export_excel', handleExport);
app.get('/export-excel', handleExport);
app.get('/api/export', handleExport);

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
  setupViteOrStatic().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app };
export default app;
