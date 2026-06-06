const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const requireAuth = require('../middleware/requireAuth');

router.get('/emails', requireAuth, async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: req.user.accessToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Broad search covering spending, bills, income, shopping
    const queries = [
      'from:cathaybk.com.tw',
      'from:taiwanmobile.com',
      'from:momoshop.com.tw',
      'from:ctbcbank.com',
      'subject:(消費通知 OR 刷卡通知 OR 帳單 OR 除息 OR 發票 OR receipt OR invoice OR order)',
    ];

    const allMessageIds = new Set();
    for (const q of queries) {
      try {
        const { data } = await gmail.users.messages.list({
          userId: 'me', q, maxResults: 30
        });
        (data.messages || []).forEach(m => allMessageIds.add(m.id));
      } catch (e) { /* skip failed query */ }
    }

    const ids = [...allMessageIds].slice(0, 60);

    const details = await Promise.all(
      ids.map(id =>
        gmail.users.messages.get({
          userId: 'me', id,
          format: 'full',
          metadataHeaders: ['Subject', 'From', 'Date']
        }).catch(() => null)
      )
    );

    const emails = details
      .filter(Boolean)
      .map(({ data }) => {
        // Extract plain text body
        let body = '';
        const extractBody = (parts) => {
          if (!parts) return;
          for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              body += Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
            if (part.parts) extractBody(part.parts);
          }
        };
        if (data.payload?.body?.data) {
          body = Buffer.from(data.payload.body.data, 'base64').toString('utf-8');
        }
        extractBody(data.payload?.parts);

        return {
          id: data.id,
          snippet: data.snippet || '',
          body: body.slice(0, 2000), // limit size
          subject: data.payload.headers.find(h => h.name === 'Subject')?.value || '',
          from: data.payload.headers.find(h => h.name === 'From')?.value || '',
          date: data.payload.headers.find(h => h.name === 'Date')?.value || '',
        };
      });

    res.json({ emails });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch emails', detail: err.message });
  }
});

module.exports = router;
