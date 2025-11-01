const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'hospital_inventory.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err);
    } else {
        console.log('✅ Connected to SQLite database');
        initDatabase();
    }
});

// Initialize database with schema
function initDatabase() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            quantity INTEGER NOT NULL,
            expiry_date DATE NOT NULL,
            supplier VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.run(createTableSQL, (err) => {
        if (err) {
            console.error('❌ Error creating table:', err);
        } else {
            console.log('✅ Medicines table ready');
            seedDatabase();
        }
    });
}

// Seed database with initial data
function seedDatabase() {
    db.get('SELECT COUNT(*) as count FROM medicines', (err, row) => {
        if (err) {
            console.error('❌ Error checking data:', err);
            return;
        }

        // Only seed if table is empty
        if (row.count === 0) {
            const sampleData = [
                ['Paracetamol 500mg', 150, '2025-12-31', 'PharmaCorp Ltd', 'Painkiller'],
                ['Amoxicillin 250mg', 8, '2025-08-15', 'MediSupply Inc', 'Antibiotic'],
                ['Ibuprofen 400mg', 75, '2026-03-20', 'HealthPharma', 'Painkiller'],
                ['Vitamin C 1000mg', 5, '2025-11-10', 'VitaHealth', 'Vitamin'],
                ['Aspirin 100mg', 120, '2025-09-30', 'PharmaCorp Ltd', 'Painkiller'],
                ['Ciprofloxacin 500mg', 45, '2026-01-15', 'MediSupply Inc', 'Antibiotic']
            ];

            const insertSQL = `INSERT INTO medicines (name, quantity, expiry_date, supplier, category) 
                              VALUES (?, ?, ?, ?, ?)`;

            sampleData.forEach(data => {
                db.run(insertSQL, data, (err) => {
                    if (err) {
                        console.error('❌ Error seeding data:', err);
                    }
                });
            });

            console.log('✅ Database seeded with sample data');
        }
    });
}

module.exports = db;