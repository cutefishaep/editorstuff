const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

const multer = require('multer');

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'file');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Preserve original filename, but sanitize it a bit
        const safeName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        cb(null, Date.now() + '-' + safeName);
    }
});

const upload = multer({ storage: storage });

// API Endpoint to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const relativePath = `/file/${req.file.filename}`;
    res.json({ success: true, filePath: relativePath });
});

// API Endpoint to save JSON files
app.post('/save', (req, res) => {
    const { filename, data } = req.body;

    if (!filename || !data) {
        return res.status(400).json({ success: false, message: 'Missing filename or data' });
    }

    // Security: Only allow saving to specific list files to prevent directory traversal
    const allowedFiles = ['list_win.json', 'list_mac.json', 'list_presets.json'];
    if (!allowedFiles.includes(filename)) {
        return res.status(403).json({ success: false, message: 'File not allowed' });
    }

    const filePath = path.join(__dirname, filename);

    fs.writeFile(filePath, JSON.stringify(data, null, 4), (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return res.status(500).json({ success: false, message: 'Failed to write file' });
        }
        console.log(`Successfully updated ${filename}`);
        res.json({ success: true, message: `${filename} updated successfully!` });
    });
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 SERVER RUNNING!`);
    console.log(`📂 Open manager in your browser:`);
    console.log(`🔗 http://localhost:${PORT}/manager.html`);
    console.log(`=========================================`);
});
