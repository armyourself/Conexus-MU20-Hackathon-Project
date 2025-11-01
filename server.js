const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes

// GET all medicines
app.get('/api/medicines', (req, res) => {
    const sql = 'SELECT * FROM medicines ORDER BY id DESC';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// GET single medicine by ID
app.get('/api/medicines/:id', (req, res) => {
    const sql = 'SELECT * FROM medicines WHERE id = ?';
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        res.json(row);
    });
});

// POST - Add new medicine
app.post('/api/medicines', (req, res) => {
    const { name, quantity, expiry_date, supplier, category } = req.body;
    
    // Validation
    if (!name || !quantity || !expiry_date || !supplier || !category) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const sql = `INSERT INTO medicines (name, quantity, expiry_date, supplier, category) 
                 VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [name, quantity, expiry_date, supplier, category], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to add medicine' });
        }
        
        res.status(201).json({
            id: this.lastID,
            name,
            quantity,
            expiry_date,
            supplier,
            category
        });
    });
});

// PUT - Update medicine
app.put('/api/medicines/:id', (req, res) => {
    const { name, quantity, expiry_date, supplier, category } = req.body;
    const { id } = req.params;
    
    const sql = `UPDATE medicines 
                 SET name = ?, quantity = ?, expiry_date = ?, supplier = ?, category = ?
                 WHERE id = ?`;
    
    db.run(sql, [name, quantity, expiry_date, supplier, category, id], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to update medicine' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        
        // Check for low stock and trigger alert
        if (quantity < 10) {
            triggerN8nAlert(id, name, quantity);
        }
        
        res.json({ id, name, quantity, expiry_date, supplier, category });
    });
});

// DELETE medicine
app.delete('/api/medicines/:id', (req, res) => {
    const sql = 'DELETE FROM medicines WHERE id = ?';
    
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to delete medicine' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        
        res.json({ message: 'Medicine deleted successfully' });
    });
});

// POST - Trigger n8n alert manually
app.post('/api/alert/:id', (req, res) => {
    const sql = 'SELECT * FROM medicines WHERE id = ?';
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        
        triggerN8nAlert(row.id, row.name, row.quantity);
        res.json({ message: 'Alert triggered successfully' });
    });
});

// Function to trigger n8n webhook
async function triggerN8nAlert(id, name, quantity) {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
        console.log('⚠️ N8N_WEBHOOK_URL not configured in .env file');
        console.log(`🔔 LOW STOCK ALERT: ${name} - Only ${quantity} units remaining!`);
        return;
    }
    
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id,
                medicine_name: name,
                quantity,
                alert_type: 'low_stock',
                threshold: 10,
                timestamp: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            console.log(`✅ n8n Alert sent for: ${name} (${quantity} units)`);
        } else {
            console.error('❌ Failed to send n8n alert:', response.statusText);
        }
    } catch (error) {
        console.error('❌ Error triggering n8n webhook:', error.message);
        console.log(`🔔 LOCAL ALERT: ${name} - Only ${quantity} units remaining!`);
    }
}

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🏥 Hospital Inventory System running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api/medicines`);
});