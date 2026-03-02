-- Project Management Migration
-- Creates tables for milestone-based project tracking with verification
-- Supports escrow-backed, results-driven engagements

-- ============================================================================
-- PROJECTS
-- ============================================================================
-- Main project/order table linking buyers, creators, and services
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,

    -- Parties
    buyer_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    creator_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES products(id) ON DELETE SET NULL,

    -- Project details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT, -- What buyer needs
    deliverables TEXT[], -- What creator will deliver

    -- Pricing
    total_amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Timeline
    estimated_delivery_days INTEGER,
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, accepted, in_progress, milestone_pending, completed, cancelled, disputed

    -- Workflow tracking
    accepted_by_creator BOOLEAN DEFAULT false,
    accepted_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,

    -- Milestones
    milestones JSONB, -- Array of milestone objects
    current_milestone_index INTEGER DEFAULT 0,

    -- Performance tracking
    revision_count INTEGER DEFAULT 0,
    revisions_included INTEGER DEFAULT 2,
    extension_days INTEGER DEFAULT 0,

    -- Communication
    last_message_at TIMESTAMP,
    unread_messages_buyer INTEGER DEFAULT 0,
    unread_messages_creator INTEGER DEFAULT 0,

    -- Ratings & reviews (post-completion)
    buyer_rating INTEGER CHECK (buyer_rating >= 1 AND buyer_rating <= 5),
    buyer_review TEXT,
    buyer_reviewed_at TIMESTAMP,

    creator_rating INTEGER CHECK (creator_rating >= 1 AND creator_rating <= 5),
    creator_review TEXT,
    creator_reviewed_at TIMESTAMP,

    -- Dispute
    is_disputed BOOLEAN DEFAULT false,
    disputed_at TIMESTAMP,
    dispute_reason TEXT,
    dispute_resolution VARCHAR(50), -- pending, buyer_wins, creator_wins, split, mediated
    resolved_at TIMESTAMP,

    -- Metadata
    project_metadata JSONB,
    internal_notes TEXT, -- Admin notes

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_buyer ON projects(buyer_id);
CREATE INDEX idx_projects_creator ON projects(creator_id);
CREATE INDEX idx_projects_service ON projects(service_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_disputed ON projects(is_disputed) WHERE is_disputed = true;
CREATE INDEX idx_projects_completion_date ON projects(expected_completion_date);
CREATE INDEX idx_projects_created ON projects(created_at);

-- ============================================================================
-- PROJECT MILESTONES
-- ============================================================================
-- Individual milestones within a project
CREATE TABLE IF NOT EXISTS project_milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Milestone details
    milestone_number INTEGER NOT NULL, -- 1, 2, 3...
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deliverables TEXT[],

    -- Verification requirements
    requires_verification BOOLEAN DEFAULT false,
    verification_metric_type VARCHAR(100), -- 'traffic', 'leads', 'conversions', etc.
    verification_target_value NUMERIC(15, 2), -- Target metric value
    verification_data_id INTEGER REFERENCES verification_data(id), -- Actual verified result

    -- Payment
    payment_amount NUMERIC(10, 2) NOT NULL,
    payment_percentage NUMERIC(5, 2), -- % of total project (e.g., 50.00 for 50%)
    escrow_transaction_id INTEGER REFERENCES escrow_transactions(id),

    -- Timeline
    estimated_completion_date DATE,
    due_date DATE,
    completed_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, in_progress, submitted, under_review, approved, revision_requested, completed

    -- Approval workflow
    submitted_at TIMESTAMP,
    submitted_by INTEGER REFERENCES accounts(id),
    submission_notes TEXT,
    submission_files TEXT[], -- URLs to deliverables

    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES accounts(id),
    approval_notes TEXT,

    revision_requested_at TIMESTAMP,
    revision_notes TEXT,
    revision_count INTEGER DEFAULT 0,

    -- Auto-approval
    auto_approve_after_days INTEGER DEFAULT 7,
    auto_approved BOOLEAN DEFAULT false,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(project_id, milestone_number)
);

CREATE INDEX idx_milestones_project ON project_milestones(project_id);
CREATE INDEX idx_milestones_status ON project_milestones(status);
CREATE INDEX idx_milestones_verification ON project_milestones(verification_data_id);
CREATE INDEX idx_milestones_escrow ON project_milestones(escrow_transaction_id);
CREATE INDEX idx_milestones_due_date ON project_milestones(due_date);

-- ============================================================================
-- PROJECT DELIVERABLES
-- ============================================================================
-- Files/links submitted by creator
CREATE TABLE IF NOT EXISTS project_deliverables (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id INTEGER REFERENCES project_milestones(id) ON DELETE CASCADE,

    -- Submitted by
    submitted_by INTEGER NOT NULL REFERENCES accounts(id),

    -- Deliverable details
    title VARCHAR(255),
    description TEXT,
    file_type VARCHAR(50), -- 'document', 'image', 'video', 'link', 'zip'
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,

    -- Version tracking
    version INTEGER DEFAULT 1,
    is_latest_version BOOLEAN DEFAULT true,
    replaces_deliverable_id INTEGER REFERENCES project_deliverables(id),

    -- Status
    status VARCHAR(50) DEFAULT 'submitted', -- submitted, approved, revision_requested

    -- Review
    reviewed_by INTEGER REFERENCES accounts(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deliverables_project ON project_deliverables(project_id);
CREATE INDEX idx_deliverables_milestone ON project_deliverables(milestone_id);
CREATE INDEX idx_deliverables_submitted_by ON project_deliverables(submitted_by);
CREATE INDEX idx_deliverables_latest ON project_deliverables(is_latest_version) WHERE is_latest_version = true;

-- ============================================================================
-- PROJECT ACTIVITY LOG
-- ============================================================================
-- Timeline of all project events
CREATE TABLE IF NOT EXISTS project_activity_log (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(100) NOT NULL,
    -- 'created', 'accepted', 'started', 'milestone_submitted', 'milestone_approved',
    -- 'revision_requested', 'payment_released', 'completed', 'disputed', etc.

    event_description TEXT,

    -- Actor
    actor_id INTEGER REFERENCES accounts(id),
    actor_type VARCHAR(50), -- 'buyer', 'creator', 'system', 'admin'

    -- Related entities
    milestone_id INTEGER REFERENCES project_milestones(id),
    deliverable_id INTEGER REFERENCES project_deliverables(id),

    -- Event data
    event_data JSONB, -- Additional context

    -- Visibility
    is_visible_to_buyer BOOLEAN DEFAULT true,
    is_visible_to_creator BOOLEAN DEFAULT true,
    is_internal BOOLEAN DEFAULT false, -- Admin/system notes

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_project ON project_activity_log(project_id);
CREATE INDEX idx_activity_type ON project_activity_log(event_type);
CREATE INDEX idx_activity_actor ON project_activity_log(actor_id);
CREATE INDEX idx_activity_created ON project_activity_log(created_at);

-- ============================================================================
-- PROJECT MESSAGES
-- ============================================================================
-- Communication between buyer and creator about project
CREATE TABLE IF NOT EXISTS project_messages (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Message details
    sender_id INTEGER NOT NULL REFERENCES accounts(id),
    receiver_id INTEGER NOT NULL REFERENCES accounts(id),

    message_text TEXT NOT NULL,
    attachments TEXT[], -- File URLs

    -- Context
    milestone_id INTEGER REFERENCES project_milestones(id),
    deliverable_id INTEGER REFERENCES project_deliverables(id),

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,

    -- Thread (for replies)
    reply_to_message_id INTEGER REFERENCES project_messages(id),

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_messages_project ON project_messages(project_id);
CREATE INDEX idx_project_messages_sender ON project_messages(sender_id);
CREATE INDEX idx_project_messages_receiver ON project_messages(receiver_id);
CREATE INDEX idx_project_messages_unread ON project_messages(is_read) WHERE is_read = false;
CREATE INDEX idx_project_messages_created ON project_messages(created_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_updated_at();

CREATE TRIGGER milestones_updated_at
    BEFORE UPDATE ON project_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_project_updated_at();

CREATE TRIGGER deliverables_updated_at
    BEFORE UPDATE ON project_deliverables
    FOR EACH ROW
    EXECUTE FUNCTION update_project_updated_at();

-- ============================================================================
-- LOG PROJECT EVENTS
-- ============================================================================
-- Auto-log significant project events
CREATE OR REPLACE FUNCTION log_project_event()
RETURNS TRIGGER AS $$
DECLARE
    event_type_val VARCHAR(100);
    event_desc TEXT;
BEGIN
    -- Determine event type based on status change
    IF TG_OP = 'INSERT' THEN
        event_type_val := 'project_created';
        event_desc := 'Project created';
    ELSIF OLD.status != NEW.status THEN
        event_type_val := 'status_changed';
        event_desc := 'Status changed from ' || OLD.status || ' to ' || NEW.status;
    ELSE
        RETURN NEW; -- No significant change
    END IF;

    -- Insert activity log
    INSERT INTO project_activity_log (
        project_id,
        event_type,
        event_description,
        actor_id,
        actor_type,
        event_data
    ) VALUES (
        NEW.id,
        event_type_val,
        event_desc,
        NULL, -- System event
        'system',
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_project_status_change
    AFTER INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION log_project_event();

-- ============================================================================
-- AUTO-APPROVE MILESTONES
-- ============================================================================
-- Auto-approve submitted milestones after X days if buyer doesn't respond
CREATE OR REPLACE FUNCTION auto_approve_milestones()
RETURNS void AS $$
DECLARE
    milestone RECORD;
BEGIN
    FOR milestone IN
        SELECT id, project_id, auto_approve_after_days
        FROM project_milestones
        WHERE status = 'submitted'
          AND submitted_at + (auto_approve_after_days || ' days')::INTERVAL <= CURRENT_TIMESTAMP
          AND auto_approved = false
    LOOP
        -- Update milestone to approved
        UPDATE project_milestones
        SET
            status = 'approved',
            approved_at = CURRENT_TIMESTAMP,
            auto_approved = true,
            approval_notes = 'Auto-approved after ' || milestone.auto_approve_after_days || ' days'
        WHERE id = milestone.id;

        -- Log activity
        INSERT INTO project_activity_log (
            project_id,
            event_type,
            event_description,
            milestone_id,
            actor_type,
            event_data
        ) VALUES (
            milestone.project_id,
            'milestone_auto_approved',
            'Milestone auto-approved after ' || milestone.auto_approve_after_days || ' days',
            milestone.id,
            'system',
            jsonb_build_object('auto_approved', true)
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule to run daily: SELECT auto_approve_milestones();

-- ============================================================================
-- UPDATE PROJECT STATUS BASED ON MILESTONES
-- ============================================================================
-- Automatically update project status when all milestones complete
CREATE OR REPLACE FUNCTION update_project_status_on_milestone_change()
RETURNS TRIGGER AS $$
DECLARE
    total_milestones INTEGER;
    completed_milestones INTEGER;
    project_record RECORD;
BEGIN
    -- Get milestone counts
    SELECT COUNT(*) INTO total_milestones
    FROM project_milestones
    WHERE project_id = NEW.project_id;

    SELECT COUNT(*) INTO completed_milestones
    FROM project_milestones
    WHERE project_id = NEW.project_id
      AND status = 'approved';

    -- If all milestones approved, mark project complete
    IF total_milestones > 0 AND completed_milestones = total_milestones THEN
        UPDATE projects
        SET
            status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            actual_completion_date = CURRENT_DATE
        WHERE id = NEW.project_id
          AND status != 'completed'; -- Only update if not already complete
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_on_milestone_approved
    AFTER UPDATE ON project_milestones
    FOR EACH ROW
    WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
    EXECUTE FUNCTION update_project_status_on_milestone_change();

-- ============================================================================
-- MARK MESSAGES AS READ
-- ============================================================================
-- Update unread count when message is read
CREATE OR REPLACE FUNCTION update_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_read = false AND NEW.is_read = true THEN
        -- Decrement unread count for receiver
        UPDATE projects
        SET
            unread_messages_buyer = CASE
                WHEN NEW.receiver_id = buyer_id THEN GREATEST(unread_messages_buyer - 1, 0)
                ELSE unread_messages_buyer
            END,
            unread_messages_creator = CASE
                WHEN NEW.receiver_id = creator_id THEN GREATEST(unread_messages_creator - 1, 0)
                ELSE unread_messages_creator
            END
        WHERE id = NEW.project_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_unread_on_read
    AFTER UPDATE ON project_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_unread_count();

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- View: Active projects summary
CREATE OR REPLACE VIEW active_projects_summary AS
SELECT
    p.id,
    p.title,
    p.status,
    p.total_amount,
    creator.name AS creator_name,
    buyer.name AS buyer_name,
    p.start_date,
    p.expected_completion_date,
    COUNT(pm.id) AS total_milestones,
    COUNT(pm.id) FILTER (WHERE pm.status = 'approved') AS completed_milestones,
    p.unread_messages_buyer + p.unread_messages_creator AS total_unread_messages,
    CURRENT_DATE - p.start_date AS days_in_progress
FROM projects p
JOIN accounts creator ON p.creator_id = creator.id
JOIN accounts buyer ON p.buyer_id = buyer.id
LEFT JOIN project_milestones pm ON p.id = pm.project_id
WHERE p.status IN ('in_progress', 'milestone_pending')
GROUP BY p.id, creator.name, buyer.name;

-- View: Overdue milestones
CREATE OR REPLACE VIEW overdue_milestones AS
SELECT
    pm.id AS milestone_id,
    pm.project_id,
    p.title AS project_title,
    pm.milestone_number,
    pm.title AS milestone_title,
    pm.status,
    pm.due_date,
    CURRENT_DATE - pm.due_date AS days_overdue,
    creator.name AS creator_name,
    buyer.name AS buyer_name
FROM project_milestones pm
JOIN projects p ON pm.project_id = p.id
JOIN accounts creator ON p.creator_id = creator.id
JOIN accounts buyer ON p.buyer_id = buyer.id
WHERE pm.due_date < CURRENT_DATE
  AND pm.status NOT IN ('approved', 'completed')
ORDER BY days_overdue DESC;

-- View: Project completion rate by creator
CREATE OR REPLACE VIEW creator_project_stats AS
SELECT
    creator_id,
    a.name AS creator_name,
    COUNT(*) AS total_projects,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_projects,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_projects,
    COUNT(*) FILTER (WHERE is_disputed = true) AS disputed_projects,
    ROUND(AVG(buyer_rating), 2) AS avg_rating,
    SUM(total_amount) FILTER (WHERE status = 'completed') AS total_revenue,
    ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 86400), 1) AS avg_completion_days
FROM projects
JOIN accounts a ON projects.creator_id = a.id
GROUP BY creator_id, a.name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE projects IS 'Main project/order table with milestone tracking';
COMMENT ON TABLE project_milestones IS 'Individual milestones within projects (50% upfront, 50% completion)';
COMMENT ON TABLE project_deliverables IS 'Files and assets submitted by creators';
COMMENT ON TABLE project_activity_log IS 'Timeline of all project events';
COMMENT ON TABLE project_messages IS 'Direct messages between buyer and creator about project';
