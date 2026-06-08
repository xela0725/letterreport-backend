const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const RULES_FILE = path.join(__dirname, '..', 'data', 'community_rules.json');

// Ensure data directory exists
function ensureFile() {
  const dir = path.dirname(RULES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(RULES_FILE)) fs.writeFileSync(RULES_FILE, JSON.stringify([]));
}

// GET all community rules
router.get('/rules', (req, res) => {
  try {
    ensureFile();
    const rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));
    res.json({ rules });
  } catch (e) {
    res.json({ rules: [] });
  }
});

// POST a new rule (submitted by user after AI parsing)
router.post('/rules', express.json(), (req, res) => {
  try {
    ensureFile();
    const { name, senderDomain, amountRegex, dateRegex, merchantFallback, category, type } = req.body;
    if (!name || !amountRegex) return res.status(400).json({ error: 'Missing required fields' });

    const rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));

    // Avoid exact duplicates
    const exists = rules.some(r => r.senderDomain === senderDomain && r.amountRegex === amountRegex);
    if (exists) return res.json({ ok: true, duplicate: true, total: rules.length });

    rules.push({
      id: Date.now(),
      name,
      senderDomain: senderDomain || '',
      amountRegex,
      dateRegex: dateRegex || '',
      merchantFallback: merchantFallback || name,
      category: category || 'Other',
      type: type || 'expense',
      addedAt: new Date().toISOString()
    });

    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));
    res.json({ ok: true, total: rules.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save rule' });
  }
});

module.exports = router;
