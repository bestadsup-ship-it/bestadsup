-- Seed data for development and testing
-- Password for test account is: "password123"

-- Insert test account
INSERT INTO accounts (id, name, email, password_hash)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Test Publisher', 'test@example.com', '$2b$10$rBV2uD.e8kN9p9LQYQX8.OQ4MjqJZKzH0Y.xGZN8kZX8kZX8kZX8k');

-- Insert test property
INSERT INTO properties (id, account_id, name, domain)
VALUES
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Example Tech Blog', 'blog.example.com');

-- Insert test ad units
INSERT INTO ad_units (id, property_id, account_id, name, width, height)
VALUES
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Header Banner', 728, 90),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Sidebar Rectangle', 300, 250),
    ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Footer Banner', 728, 90);

-- Insert test campaigns
INSERT INTO campaigns (id, account_id, name, cpm, status, start_date, end_date)
VALUES
    ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'Q1 2024 Brand Campaign', 500, 'active', '2024-01-01', '2024-03-31'),
    ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'Product Launch Campaign', 750, 'active', '2024-01-15', NULL);

-- Insert test creatives
INSERT INTO creatives (id, campaign_id, account_id, name, creative_url, width, height, click_url)
VALUES
    ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'Brand Banner 728x90', 'https://via.placeholder.com/728x90/0066cc/ffffff?text=Brand+Ad', 728, 90, 'https://example.com/brand'),
    ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'Brand Rectangle 300x250', 'https://via.placeholder.com/300x250/0066cc/ffffff?text=Brand+Ad', 300, 250, 'https://example.com/brand'),
    ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'Product Banner 728x90', 'https://via.placeholder.com/728x90/00cc66/ffffff?text=Product+Launch', 728, 90, 'https://example.com/product');

-- Map ad units to campaigns
INSERT INTO ad_unit_campaigns (ad_unit_id, campaign_id, account_id, priority)
VALUES
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 10),
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 20),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 10),
    ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 10);
