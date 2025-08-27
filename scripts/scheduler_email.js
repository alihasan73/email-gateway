#!/usr/bin/env node
const scheduler = require('../src/services/scheduler.service');

// Very simple arg parsing: --address foo@x --sendAt 2025-08-27T10:00:00Z --subject "Hi" --text "Body"
const args = {};
for (let i=2;i<process.argv.length;i++){
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const val = process.argv[i+1] && !process.argv[i+1].startsWith('--') ? process.argv[++i] : true;
    args[key] = val;
  }
}

try {
  const job = scheduler.scheduleEmail({
    name: args.name,
    address: args.address,
    subject: args.subject,
    text: args.text,
    sendAt: args.sendAt
  });
  console.log('Scheduled job:', job);
} catch (err) {
  console.error('Error scheduling:', err.message);
  process.exit(1);
}