#!/usr/bin/env node
const scheduler = require('../src/services/scheduler.service');
const intervalArg = process.env.SCHED_INTERVAL_MS || process.argv[2];
const intervalMs = intervalArg ? parseInt(intervalArg,10) : undefined;
const runner = scheduler.start({ intervalMs });
process.on('SIGINT', ()=>{ console.log('stop'); runner.stop(); process.exit(0); });