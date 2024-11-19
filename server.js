import express from 'express';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

function extractSheetId(url) {
  const matches = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return matches ? matches[1] : null;
}

app.post('/api/sheets', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Please provide a Google Sheets URL' });
    }

    const sheetId = extractSheetId(url);
    if (!sheetId) {
      return res.status(400).json({ error: 'Invalid Google Sheets URL' });
    }

    const doc = new GoogleSpreadsheet(sheetId);
    
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });

    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    const jsonData = rows.map(row => row.toObject());
    
    res.json({
      title: doc.title,
      data: jsonData
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch sheet data' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});