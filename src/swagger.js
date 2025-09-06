const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadSpec() {
  const p = path.resolve(__dirname, '../docs/openapi.yaml');
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf8');
  return yaml.load(raw);
}

module.exports = { loadSpec };
