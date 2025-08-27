
const fs = require('fs');
const path = require('path');
const { toISOStringFromComponents } = require('../utils/time.util');
const emailService = require('../services/email.service');

const DATA_FILE = path.resolve(__dirname, '../../data/scheduled_emails.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}
function loadJobs() {
  ensureDataFile();
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); }
  catch (e) { console.error(e); return []; }
}
function saveJobs(jobs) { fs.writeFileSync(DATA_FILE, JSON.stringify(jobs, null, 2), 'utf8'); }

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{
    const r = (Math.random()*16)|0; const v = c==='x'?r:(r&0x3)|0x8; return v.toString(16);
  });
}


function scheduleEmail({ name, address, subject, text, sendAt }) {
  const arr = sendAt.split(',').map(Number);
  const jobs = loadJobs();
  const job = {
    id: uuidv4(),
    name: name || null,
    address,
    subject: subject || '(no subject)',
    text: text || '',
    sendAt: toISOStringFromComponents(...arr),
    status: 'scheduled',
    attempts: 0,
    createdAt: new Date().toISOString()
  };
  jobs.push(job);
  saveJobs(jobs);
  return job;
}

async function trySend(job) {
  try {
    await emailService.sendEmail(job.name || '', job.address, job.subject, job.text);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function start(options = {}) {
  const intervalMs = options.intervalMs || 15000; // cek tiap 15s
  const maxAttempts = options.maxAttempts || 3;
  ensureDataFile();
  console.log('Scheduler started (intervalMs=', intervalMs, ')');
  const timer = setInterval(async ()=>{
    const jobs = loadJobs();
    const now = Date.now();
    let changed = false;
    for (const job of jobs) {
      if ((job.status === 'scheduled' || job.status === 'failed') && job.attempts < maxAttempts) {
        const ts = Date.parse(job.sendAt);
        if (!Number.isNaN(ts) && ts <= now) {
          job.status = 'sending';
          saveJobs(jobs);
          const res = await trySend(job);
          job.attempts = (job.attempts||0) + 1;
          if (res.success) {
            job.status = 'sent';
            job.sentAt = new Date().toISOString();
            console.log('Sent job', job.id);
          } else {
            job.lastError = res.error;
            job.lastAttemptAt = new Date().toISOString();
            job.status = job.attempts < maxAttempts ? 'failed' : 'error';
            console.error('Failed job', job.id, res.error);
          }
          changed = true;
        }
      }
    }
    if (changed) saveJobs(jobs);
  }, intervalMs);

  return { stop(){ clearInterval(timer); } };
}

function getJobs(){ return loadJobs(); }

module.exports = { scheduleEmail, start, getJobs };