const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const requireAuth = require('../middleware/requireAuth');

router.get('/emails', requireAuth, async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: req.user.accessToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Search for purchase/receipt emails — adjust query as needed
    const { data } = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:(receipt OR order OR invoice OR purchase)',
      maxResults: 50
    });

    const messages = data.messages || [];

    // Fetch snippet + headers for each message
    const details = await Promise.all(
      messages.slice(0, 20).map(msg =>
        gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        })
      )
    );

    const emails = details.map(({ data }) => ({
      id: data.id,
      snippet: data.snippet,
      subject: data.payload.headers.find(h => h.name === 'Subject')?.value,
      from: data.payload.headers.find(h => h.name === 'From')?.value,
      date: data.payload.headers.find(h => h.name === 'Date')?.value,
    }));

    res.json({ emails });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

module.exports = router;
