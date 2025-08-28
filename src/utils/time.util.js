function pad(n) { return n.toString().padStart(2, '0'); }

function validateInt(name, v) {
  if (!Number.isInteger(v)) throw new Error(`${name} must be an integer`);
}

function toISOStringFromComponents(year, month, day, hour = 0, minute = 0, opts = {}) {
  validateInt('year', year);
  validateInt('month', month);
  validateInt('day', day);
  validateInt('hour', hour);
  validateInt('minute', minute);

  if (month < 1 || month > 12) throw new Error('month must be between 1 and 12');
  if (day < 1 || day > 31) throw new Error('day must be between 1 and 31');
  if (hour < 0 || hour > 23) throw new Error('hour must be between 0 and 23');
  if (minute < 0 || minute > 59) throw new Error('minute must be between 0 and 59');

  const mode = (opts && opts.mode) || 'local';

  if (mode === 'local') {
    // construct local Date and return its ISO (UTC) representation
    const d = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (isNaN(d.getTime())) throw new Error('invalid date');
    return d.toISOString();
  }

  if (mode === 'utc') {
    // construct UTC timestamp directly
    const ms = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const d = new Date(ms);
    if (isNaN(d.getTime())) throw new Error('invalid date');
    return d.toISOString();
  }

  throw new Error("mode must be 'local' or 'utc'");
}

module.exports = {
  toISOStringFromComponents,
};
