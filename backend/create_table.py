import db

sql = """
CREATE TABLE IF NOT EXISTS contact_feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('unread', 'read') DEFAULT 'unread',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
"""

try:
    db.execute(sql)
    print("Table contact_feedbacks created successfully.")
except Exception as e:
    print(f"Error creating table: {e}")
