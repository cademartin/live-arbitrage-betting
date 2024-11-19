const express = require('express');

const app = express();
const ports = [3000, 3001, 3002, 3003, 3004]; // List of ports to try

app.use(express.json());
app.use(express.static('public'));

// Function to convert Google Sheets URL to CSV export URL
function getCSVUrl(url) {
    // Extract the sheet ID from the URL
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches) return null;
    
    const sheetId = matches[1];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}

// Function to parse CSV to JSON
function csvToJSON(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    return lines.slice(1).map(line => {
        const values = line.split(',').map(value => value.trim());
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
        }, {});
    });
}

app.post('/convert', async (req, res) => {
    try {
        const { sheetUrl } = req.body;
        
        if (!sheetUrl) {
            return res.status(400).json({ error: 'Please provide a Google Sheets URL' });
        }

        const csvUrl = getCSVUrl(sheetUrl);
        
        if (!csvUrl) {
            return res.status(400).json({ error: 'Invalid Google Sheets URL' });
        }

        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch sheet data');
        }

        const csvData = await response.text();
        const jsonData = csvToJSON(csvData);

        res.json(jsonData);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to process the sheet' });
    }
});

// Modified server start logic
function startServer(portIndex = 0) {
    if (portIndex >= ports.length) {
        console.error('No available ports found');
        process.exit(1);
    }

    const port = ports[portIndex];
    
    app.listen(port)
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${port} is busy, trying next port...`);
                startServer(portIndex + 1);
            } else {
                console.error(err);
            }
        })
        .on('listening', () => {
            console.log(`Server running at http://localhost:${port}`);
        });
}

startServer();
