-- Create database
CREATE DATABASE logixmitra_db;

-- Connect to database
\c logixmitra_db;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE RESTRICT,
    avatar VARCHAR(10) DEFAULT 'U',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(20) CHECK (action IN ('create', 'read', 'update', 'delete')) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module, action)
);

-- Create module_permissions junction table
CREATE TABLE IF NOT EXISTS module_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Insert default roles
INSERT INTO roles (name, description, is_system) VALUES
('admin', 'Full system access', TRUE),
('manager', 'Can manage orders and users', TRUE),
('supervisor', 'Can supervise orders', TRUE),
('user', 'Basic user access', TRUE);

-- Insert default permissions
INSERT INTO permissions (name, module, action, description) VALUES
-- Dashboard
('View Dashboard', 'Dashboard', 'read', 'Access to dashboard'),

-- Users
('Create Users', 'Users', 'create', 'Create new users'),
('View Users', 'Users', 'read', 'View user list'),
('Edit Users', 'Users', 'update', 'Edit user information'),
('Delete Users', 'Users', 'delete', 'Delete users'),

-- Roles
('Create Roles', 'Roles', 'create', 'Create new roles'),
('View Roles', 'Roles', 'read', 'View role list'),
('Edit Roles', 'Roles', 'update', 'Edit role information'),
('Delete Roles', 'Roles', 'delete', 'Delete roles'),

-- Permissions
('Manage Permissions', 'Permissions', 'update', 'Manage role permissions'),

-- Orders
('Create Orders', 'Orders', 'create', 'Create new orders'),
('View Orders', 'Orders', 'read', 'View orders'),
('Edit Orders', 'Orders', 'update', 'Edit orders'),
('Delete Orders', 'Orders', 'delete', 'Delete orders'),

-- Reports
('View Reports', 'Reports', 'read', 'View reports');

-- Assign permissions to admin role (all permissions)
INSERT INTO module_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Assign permissions to manager role
INSERT INTO module_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE 
(module = 'Dashboard' AND action = 'read') OR
(module = 'Users' AND action IN ('read')) OR
(module = 'Orders' AND action IN ('create', 'read', 'update'));

-- Assign permissions to supervisor role
INSERT INTO module_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE 
(module = 'Dashboard' AND action = 'read') OR
(module = 'Orders' AND action IN ('read', 'update'));

-- Assign permissions to user role
INSERT INTO module_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE 
(module = 'Dashboard' AND action = 'read') OR
(module = 'Orders' AND action IN ('read'));

-- Insert default users
INSERT INTO users (name, email, password, role_id, avatar) VALUES
('Super Admin', 'admin@logixmitra.com', '$2a$10$YourHashedPasswordHere', 1, 'SA'),
('John Manager', 'manager@logixmitra.com', '$2a$10$YourHashedPasswordHere', 2, 'JM'),
('Sarah Supervisor', 'supervisor@logixmitra.com', '$2a$10$YourHashedPasswordHere', 3, 'SS'),
('John User', 'user@logixmitra.com', '$2a$10$YourHashedPasswordHere', 4, 'JU');

-- Note: You'll need to generate actual bcrypt hashes for passwords
-- Example passwords: admin123, manager123, supervisor123, user123