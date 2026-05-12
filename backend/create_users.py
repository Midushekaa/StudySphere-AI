import db

sql = """
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') DEFAULT 'student',
    student_id VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
"""

try:
    db.execute(sql)
    
    # Insert demo users if not exists
    demo_sql = """
    INSERT IGNORE INTO users (name, username, email, password, role, student_id)
    VALUES 
    ('Alex Johnson', 'student', 'student@uni.ac.uk', 'student123', 'student', 'STU10001'),
    ('Dr. Sarah Ahmed', 'admin', 'admin@uni.ac.uk', 'admin123', 'admin', NULL);
    """
    db.execute(demo_sql)
    
    print("Table users created and populated successfully.")
except Exception as e:
    print(f"Error creating table: {e}")
