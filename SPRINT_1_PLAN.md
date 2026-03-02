# Sprint 1 Plan: Authentication & Account Types
## BestAdsUp - Verified Performance Marketing Marketplace

**Sprint Duration:** Weeks 1-2 (February 28 - March 13, 2026)
**Sprint Goal:** Enable users to sign up, choose account type (Creator/Buyer), and view their profile with account-type-specific fields

---

## Table of Contents
1. [Sprint Overview](#sprint-overview)
2. [Sprint Objectives](#sprint-objectives)
3. [User Stories](#user-stories)
4. [Technical Tasks](#technical-tasks)
5. [Acceptance Criteria](#acceptance-criteria)
6. [Testing Requirements](#testing-requirements)
7. [Definition of Done](#definition-of-done)

---

## Sprint Overview

### Why This Sprint Matters
Sprint 1 establishes the foundation for the entire platform by implementing the authentication system and account type differentiation (Creator vs Buyer). This is critical because:

1. **Account Types Drive UX:** Creators see verification tools, Buyers see hiring tools
2. **Verification Starts Here:** Creators need accounts before connecting GA4/HubSpot
3. **Escrow Depends on This:** Stripe Connect requires verified user accounts
4. **First Impression:** Signup/login is the first user touchpoint

### What We're Building
- ✅ Account type selection during signup (Creator vs Buyer)
- ✅ Profile pages with account-type-specific fields
- ✅ Verification badge display (even if not yet earned)
- ✅ Role-based navigation and permissions
- ✅ JWT refresh token strategy for secure sessions

### What We're NOT Building (Yet)
- ❌ Verification system (Sprint 2)
- ❌ Escrow payments (Sprint 3)
- ❌ Project creation (Sprint 3)
- ❌ Messaging (Sprint 4)

---

## Sprint Objectives

### Primary Objectives (Must-Have)
1. ✅ **User can sign up with account type** (Creator or Buyer)
2. ✅ **User can log in and receive JWT tokens**
3. ✅ **User can view and edit their profile**
4. ✅ **Profile shows account-type-specific fields**
5. ✅ **Navigation adapts based on account type**

### Secondary Objectives (Nice-to-Have)
1. ✅ Password reset flow
2. ✅ Email verification
3. ✅ Profile completion progress indicator

### Stretch Goals (If Time Permits)
1. Avatar upload
2. Social links (LinkedIn, Twitter)
3. Account deletion/deactivation

---

## User Stories

### Epic: User Authentication

#### US-1.1: Signup with Account Type
**As a** new user
**I want to** choose whether I'm a Creator or Buyer during signup
**So that** I see relevant features for my role

**Acceptance Criteria:**
- [ ] Signup form includes "I am a..." radio buttons (Creator/Buyer)
- [ ] Creator option shows description: "I create marketing results for SaaS companies"
- [ ] Buyer option shows description: "I hire marketers with verified results"
- [ ] Account type is saved to `accounts.account_type` column
- [ ] Validation prevents signup without selecting account type
- [ ] Error messages are clear and actionable

**Wireframe:**
```
┌─────────────────────────────────────────┐
│          Join BestAdsUp                 │
│                                         │
│  I am a:                                │
│  ○ Creator                              │
│    "I create marketing results..."      │
│  ○ Buyer                                │
│    "I hire marketers with verified..."  │
│                                         │
│  Email: [___________________]           │
│  Password: [________________]           │
│  Full Name: [_______________]           │
│                                         │
│  [Create Account]                       │
└─────────────────────────────────────────┘
```

---

#### US-1.2: Login with JWT
**As a** registered user
**I want to** log in securely
**So that** my session persists across page refreshes

**Acceptance Criteria:**
- [ ] Login form accepts email + password
- [ ] Backend validates credentials with bcrypt
- [ ] Returns JWT access token (15min expiry) + refresh token (7 days)
- [ ] Frontend stores tokens securely (httpOnly cookies or localStorage)
- [ ] Failed login shows "Invalid email or password" (not which field)
- [ ] Rate limiting: Max 5 login attempts per 15 minutes

---

#### US-1.3: Logout
**As a** logged-in user
**I want to** log out securely
**So that** my account is protected on shared devices

**Acceptance Criteria:**
- [ ] Logout button in navigation
- [ ] Clears JWT tokens from storage
- [ ] Redirects to login page
- [ ] Backend invalidates refresh token

---

### Epic: User Profile

#### US-1.4: View Profile
**As a** logged-in user
**I want to** view my profile
**So that** I can see what others see

**Acceptance Criteria:**
- [ ] Profile page shows:
  - Name, email
  - Account type badge (Creator/Buyer)
  - Verification badges (placeholder if none)
  - Profile completion percentage
- [ ] Creators see additional fields:
  - Specialties (e.g., "SEO", "Content Marketing")
  - Hourly rate or project pricing
  - Portfolio link
- [ ] Buyers see additional fields:
  - Company name
  - Industry
  - Team size

---

#### US-1.5: Edit Profile
**As a** logged-in user
**I want to** update my profile
**So that** it accurately represents me

**Acceptance Criteria:**
- [ ] Edit button on profile page
- [ ] Form pre-fills with current data
- [ ] Validation:
  - Name: 2-100 characters
  - Email: Valid format
  - Password: Optional, 8+ chars if provided
- [ ] Save button triggers PATCH `/api/v1/profile`
- [ ] Success message shown after save
- [ ] Errors shown inline next to invalid fields

---

#### US-1.6: Password Reset
**As a** user who forgot my password
**I want to** reset it via email
**So that** I can regain access to my account

**Acceptance Criteria:**
- [ ] "Forgot password?" link on login page
- [ ] Sends reset email with time-limited token (1 hour expiry)
- [ ] Reset link format: `/reset-password?token=xyz`
- [ ] Reset form validates:
  - Token is valid and not expired
  - New password meets requirements
- [ ] Success redirects to login with "Password updated" message

---

## Technical Tasks

### Backend Tasks (services/control-plane)

#### Task B-1: Update Auth Endpoints
**Assigned To:** Backend Developer
**Estimated Hours:** 4
**Priority:** P0 (Critical)

**Subtasks:**
- [ ] Update `POST /api/v1/auth/signup` to accept `account_type` field
- [ ] Add validation: `account_type` must be 'creator' or 'buyer'
- [ ] Save `account_type` to database
- [ ] Return account type in JWT payload
- [ ] Add unit tests for account type validation

**Files to Modify:**
- `services/control-plane/src/routes/auth.ts`
- `services/control-plane/src/models/User.ts`

**API Specification:**
```typescript
// POST /api/v1/auth/signup
{
  "email": "sarah@example.com",
  "password": "SecurePass123!",
  "name": "Sarah Johnson",
  "account_type": "creator" // NEW FIELD
}

// Response (201):
{
  "user": {
    "id": 1,
    "email": "sarah@example.com",
    "name": "Sarah Johnson",
    "account_type": "creator",
    "verification_level": "none"
  },
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc..."
}
```

---

#### Task B-2: Create Profile Endpoints
**Assigned To:** Backend Developer
**Estimated Hours:** 6
**Priority:** P0 (Critical)

**Subtasks:**
- [ ] Create `GET /api/v1/profile` endpoint
- [ ] Create `PATCH /api/v1/profile` endpoint
- [ ] Add authentication middleware (JWT required)
- [ ] Return account-type-specific fields:
  - Creators: specialties, hourly_rate, portfolio_url
  - Buyers: company_name, industry, team_size
- [ ] Add validation for all fields
- [ ] Write integration tests

**Files to Create:**
- `services/control-plane/src/routes/profile.ts`
- `services/control-plane/src/controllers/ProfileController.ts`
- `services/control-plane/src/validators/profileValidator.ts`

**API Specification:**
```typescript
// GET /api/v1/profile
// Headers: Authorization: Bearer {token}

// Response (200) for Creator:
{
  "id": 1,
  "email": "sarah@example.com",
  "name": "Sarah Johnson",
  "account_type": "creator",
  "verification_level": "none",
  "profile": {
    "bio": "SaaS content marketer with 5+ years experience",
    "specialties": ["SEO", "Content Marketing", "SaaS"],
    "hourly_rate": 150,
    "portfolio_url": "https://sarahjohnson.com",
    "location": "Austin, TX",
    "avatar_url": null
  },
  "badges": [],
  "profile_completion_percent": 60
}

// PATCH /api/v1/profile
{
  "name": "Sarah Johnson",
  "profile": {
    "bio": "Updated bio...",
    "specialties": ["SEO", "Content Marketing"],
    "hourly_rate": 175
  }
}
```

---

#### Task B-3: Add Account Type Validation Middleware
**Assigned To:** Backend Developer
**Estimated Hours:** 2
**Priority:** P1 (High)

**Subtasks:**
- [ ] Create middleware: `requireAccountType(['creator'])`
- [ ] Extract account type from JWT payload
- [ ] Return 403 Forbidden if type doesn't match
- [ ] Add to protected routes (e.g., verification endpoints = creators only)
- [ ] Write unit tests

**Files to Create:**
- `services/control-plane/src/middleware/requireAccountType.ts`

**Example Usage:**
```typescript
router.get('/api/v1/verification/connect',
  authenticate,
  requireAccountType(['creator']), // Only creators can verify
  verificationController.connect
);
```

---

#### Task B-4: Implement JWT Refresh Token Strategy
**Assigned To:** Backend Developer
**Estimated Hours:** 4
**Priority:** P1 (High)

**Subtasks:**
- [ ] Create `POST /api/v1/auth/refresh` endpoint
- [ ] Validate refresh token from request
- [ ] Issue new access token if refresh token valid
- [ ] Rotate refresh token (invalidate old, issue new)
- [ ] Store invalidated tokens in blacklist (use Redis or DB table)
- [ ] Add unit + integration tests

**Files to Modify:**
- `services/control-plane/src/routes/auth.ts`
- `services/control-plane/src/utils/jwt.ts`

**API Specification:**
```typescript
// POST /api/v1/auth/refresh
{
  "refresh_token": "eyJhbGc..."
}

// Response (200):
{
  "access_token": "eyJhbGc...", // New 15min token
  "refresh_token": "eyJhbGc..." // New 7-day token
}
```

---

#### Task B-5: Add Password Reset Endpoints
**Assigned To:** Backend Developer
**Estimated Hours:** 5
**Priority:** P2 (Medium)

**Subtasks:**
- [ ] Create `POST /api/v1/auth/forgot-password` endpoint
- [ ] Generate time-limited reset token (1 hour expiry)
- [ ] Send email via SendGrid with reset link
- [ ] Create `POST /api/v1/auth/reset-password` endpoint
- [ ] Validate token and update password
- [ ] Add rate limiting (max 3 requests per hour)
- [ ] Write integration tests

**Files to Create:**
- `services/control-plane/src/routes/auth.ts` (add endpoints)
- `services/control-plane/src/utils/email.ts` (SendGrid integration)
- `database/password-reset-tokens.sql` (temporary table for tokens)

---

### Frontend Tasks (packages/dashboard)

#### Task F-1: Update Signup Flow
**Assigned To:** Frontend Developer
**Estimated Hours:** 4
**Priority:** P0 (Critical)

**Subtasks:**
- [ ] Add account type selection to Signup.js
- [ ] Style radio buttons with descriptions
- [ ] Update form submission to include `account_type`
- [ ] Show validation errors
- [ ] Redirect to dashboard after signup
- [ ] Add loading state during signup

**Files to Modify:**
- `packages/dashboard/src/pages/Signup.js`
- `packages/dashboard/src/styles/auth.css`

**Wireframe:**
See US-1.1 wireframe above

---

#### Task F-2: Create Profile Page
**Assigned To:** Frontend Developer
**Estimated Hours:** 6
**Priority:** P0 (Critical)

**Subtasks:**
- [ ] Create `packages/dashboard/src/pages/Profile.js`
- [ ] Fetch profile data from `GET /api/v1/profile`
- [ ] Display account-type-specific fields:
  - Show "Specialties" only for creators
  - Show "Company" only for buyers
- [ ] Add "Edit Profile" button
- [ ] Show verification badges (placeholder if none)
- [ ] Add profile completion progress bar
- [ ] Handle loading and error states

**Files to Create:**
- `packages/dashboard/src/pages/Profile.js`
- `packages/dashboard/src/components/ProfileBadges.js`
- `packages/dashboard/src/components/ProfileCompletionBar.js`
- `packages/dashboard/src/styles/profile.css`

**Wireframe:**
```
┌────────────────────────────────────────────┐
│  Profile                                   │
│                                            │
│  [Avatar]  Sarah Johnson                  │
│            Creator ✓                       │
│            Verification: None              │
│                                            │
│  ███████░░░ 70% Complete                  │
│                                            │
│  Bio:                                      │
│  SaaS content marketer with 5+ years...   │
│                                            │
│  Specialties: SEO, Content Marketing      │
│  Hourly Rate: $150/hr                     │
│  Portfolio: sarahjohnson.com              │
│                                            │
│  [Edit Profile]                            │
└────────────────────────────────────────────┘
```

---

#### Task F-3: Create Edit Profile Form
**Assigned To:** Frontend Developer
**Estimated Hours:** 5
**Priority:** P0 (Critical)

**Subtasks:**
- [ ] Create `packages/dashboard/src/components/EditProfileForm.js`
- [ ] Pre-fill form with current profile data
- [ ] Conditionally show fields based on account type
- [ ] Add client-side validation
- [ ] Handle PATCH `/api/v1/profile` submission
- [ ] Show success/error messages
- [ ] Return to profile view after save

**Files to Create:**
- `packages/dashboard/src/components/EditProfileForm.js`

---

#### Task F-4: Update Navigation Based on Account Type
**Assigned To:** Frontend Developer
**Estimated Hours:** 3
**Priority:** P1 (High)

**Subtasks:**
- [ ] Extract account type from JWT or context
- [ ] Show different nav items for Creators vs Buyers:
  - Creators: Dashboard, Services, Projects, Verification, Profile
  - Buyers: Dashboard, Find Creators, My Projects, Profile
- [ ] Hide "Verification" tab for buyers
- [ ] Add account type badge to user dropdown

**Files to Modify:**
- `packages/dashboard/src/components/Sidebar.js`
- `packages/dashboard/src/components/Navbar.js`

---

#### Task F-5: Add Verification Badge Component
**Assigned To:** Frontend Developer
**Estimated Hours:** 2
**Priority:** P1 (High)

**Subtasks:**
- [ ] Create `packages/dashboard/src/components/VerificationBadge.js`
- [ ] Show badge styles:
  - None: Gray badge "Unverified"
  - Basic: Blue badge "Connected"
  - Verified: Green badge "Verified Results ✓"
  - Pro: Gold badge "Pro Verified ✓"
- [ ] Add hover tooltip explaining verification levels
- [ ] Make reusable for profile, cards, listings

**Files to Create:**
- `packages/dashboard/src/components/VerificationBadge.js`
- `packages/dashboard/src/styles/badges.css`

---

#### Task F-6: Password Reset Flow
**Assigned To:** Frontend Developer
**Estimated Hours:** 4
**Priority:** P2 (Medium)

**Subtasks:**
- [ ] Add "Forgot password?" link to Login.js
- [ ] Create `packages/dashboard/src/pages/ForgotPassword.js`
- [ ] Create `packages/dashboard/src/pages/ResetPassword.js`
- [ ] Handle email submission and success message
- [ ] Handle token validation and password reset
- [ ] Redirect to login after successful reset

**Files to Create:**
- `packages/dashboard/src/pages/ForgotPassword.js`
- `packages/dashboard/src/pages/ResetPassword.js`

---

### Database Tasks

#### Task DB-1: Add Account Type Column
**Assigned To:** Backend Developer
**Estimated Hours:** 1
**Priority:** P0 (Critical)

**Subtasks:**
- [ ] Check if `accounts.account_type` column exists
- [ ] If not, create migration to add it
- [ ] Add default value: 'creator'
- [ ] Add CHECK constraint: account_type IN ('creator', 'buyer')
- [ ] Backfill existing accounts with 'creator'

**Files to Create:**
- `database/add-account-type.sql` (if needed)

**Migration SQL:**
```sql
-- Only run if column doesn't exist
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'creator'
CHECK (account_type IN ('creator', 'buyer'));

-- Backfill existing records
UPDATE accounts SET account_type = 'creator' WHERE account_type IS NULL;
```

---

#### Task DB-2: Add Profile Fields
**Assigned To:** Backend Developer
**Estimated Hours:** 2
**Priority:** P0 (Critical)

**Subtasks:**
- [ ] Add columns to `accounts` table:
  - `bio` TEXT
  - `specialties` TEXT[]
  - `hourly_rate` NUMERIC(10,2)
  - `portfolio_url` TEXT
  - `company_name` VARCHAR(255)
  - `industry` VARCHAR(100)
  - `team_size` VARCHAR(50)
  - `location` VARCHAR(255)
  - `avatar_url` TEXT
- [ ] Create migration script
- [ ] Run migration on dev database

**Files to Create:**
- `database/profile-fields-migration.sql`

---

### Testing Tasks

#### Task T-1: Backend Unit Tests
**Assigned To:** Backend Developer
**Estimated Hours:** 4
**Priority:** P1 (High)

**Subtasks:**
- [ ] Test auth endpoints with account_type validation
- [ ] Test profile GET/PATCH with different account types
- [ ] Test JWT refresh token logic
- [ ] Test password reset token generation/validation
- [ ] Achieve 80%+ code coverage

**Test Cases:**
1. Signup fails if account_type missing
2. Signup fails if account_type invalid ('admin')
3. Signup succeeds with valid account_type
4. Profile returns creator-specific fields for creators
5. Profile returns buyer-specific fields for buyers
6. Refresh token issues new access token
7. Expired refresh token returns 401

---

#### Task T-2: Frontend Unit Tests
**Assigned To:** Frontend Developer
**Estimated Hours:** 3
**Priority:** P2 (Medium)

**Subtasks:**
- [ ] Test Signup form validation
- [ ] Test Profile component renders correct fields
- [ ] Test EditProfileForm submission
- [ ] Test Navigation shows correct items per account type
- [ ] Test VerificationBadge displays correct badge

**Tools:** Jest + React Testing Library

---

#### Task T-3: Integration Tests
**Assigned To:** QA / Full-Stack Developer
**Estimated Hours:** 4
**Priority:** P1 (High)

**Subtasks:**
- [ ] Test full signup → login → view profile flow
- [ ] Test creator vs buyer see different navigation
- [ ] Test profile edit saves correctly
- [ ] Test password reset end-to-end
- [ ] Test JWT refresh works on expired access token

**Tools:** Supertest (backend) + Cypress (frontend E2E)

---

#### Task T-4: Manual QA Testing
**Assigned To:** QA Tester
**Estimated Hours:** 3
**Priority:** P1 (High)

**Test Scenarios:**
1. Sign up as Creator → See creator navigation
2. Sign up as Buyer → See buyer navigation
3. Edit profile as Creator → Specialties field shows
4. Edit profile as Buyer → Company field shows
5. Verification badge shows "Unverified" for new users
6. Password reset email received and link works
7. Session persists after page refresh
8. Logout clears session

---

## Acceptance Criteria

### Sprint Success Criteria
Sprint 1 is considered successful if ALL of these are true:

✅ **Functional:**
1. New user can sign up and choose Creator or Buyer
2. User can log in and session persists (JWT refresh works)
3. User can view their profile with account-type-specific fields
4. User can edit their profile and changes save
5. Creator sees different navigation than Buyer
6. Password reset flow works end-to-end

✅ **Technical:**
1. All backend endpoints return correct status codes
2. JWT tokens expire correctly (15min access, 7-day refresh)
3. Database migrations run without errors
4. 80%+ backend test coverage
5. No console errors in frontend

✅ **Non-Functional:**
1. Signup completes in < 3 seconds
2. Profile loads in < 1 second
3. Mobile responsive (works on iPhone/Android)
4. Accessible (WCAG 2.1 AA - keyboard nav, screen readers)

---

## Testing Requirements

### Required Test Coverage

#### Backend (80% minimum):
- `services/control-plane/src/routes/auth.ts` → 90%
- `services/control-plane/src/routes/profile.ts` → 90%
- `services/control-plane/src/middleware/requireAccountType.ts` → 100%
- `services/control-plane/src/utils/jwt.ts` → 95%

#### Frontend (70% minimum):
- `packages/dashboard/src/pages/Signup.js` → 80%
- `packages/dashboard/src/pages/Profile.js` → 75%
- `packages/dashboard/src/components/EditProfileForm.js` → 80%

### Test Types Required:
- ✅ Unit tests (Jest)
- ✅ Integration tests (Supertest)
- ✅ E2E tests (Cypress) - at least 3 critical paths
- ✅ Manual QA testing (all test scenarios)

---

## Definition of Done

A task is considered "Done" when:

1. ✅ Code written and peer-reviewed
2. ✅ Unit tests written and passing (80%+ coverage)
3. ✅ Integration tests passing
4. ✅ Manual testing completed (no critical bugs)
5. ✅ Code merged to `main` branch
6. ✅ Deployed to staging environment
7. ✅ Product Owner has accepted the feature

---

## Sprint Backlog

### Day-by-Day Breakdown

#### Week 1: Backend Focus

**Day 1-2 (Mon-Tue):**
- [ ] Task DB-1: Add account type column
- [ ] Task DB-2: Add profile fields
- [ ] Task B-1: Update auth endpoints
- [ ] Task B-2: Create profile endpoints

**Day 3-4 (Wed-Thu):**
- [ ] Task B-3: Add account type middleware
- [ ] Task B-4: Implement JWT refresh tokens
- [ ] Task T-1: Backend unit tests

**Day 5 (Fri):**
- [ ] Task B-5: Password reset endpoints (start)
- [ ] Code review and fixes

---

#### Week 2: Frontend Focus

**Day 6-7 (Mon-Tue):**
- [ ] Task F-1: Update signup flow
- [ ] Task F-2: Create profile page
- [ ] Task F-3: Create edit profile form

**Day 8-9 (Wed-Thu):**
- [ ] Task F-4: Update navigation
- [ ] Task F-5: Verification badge component
- [ ] Task F-6: Password reset flow
- [ ] Task T-2: Frontend unit tests

**Day 10 (Fri):**
- [ ] Task T-3: Integration tests
- [ ] Task T-4: Manual QA testing
- [ ] Bug fixes
- [ ] Sprint review and demo

---

## Risks & Mitigation

### Risk 1: Database Migration Conflicts
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Run migrations on local dev first
- Test with sample data
- Have rollback script ready
- Document migration order in DEVELOPER_SETUP.md

### Risk 2: JWT Token Security Issues
**Impact:** Critical
**Probability:** Low
**Mitigation:**
- Use established library (jsonwebtoken)
- Follow OWASP best practices
- Security review before merge
- Rate limit auth endpoints

### Risk 3: Account Type Logic Bugs
**Impact:** Medium
**Probability:** Medium
**Mitigation:**
- Comprehensive unit tests
- E2E test both creator and buyer flows
- Manual QA testing with both account types

### Risk 4: Frontend State Management Complexity
**Impact:** Low
**Probability:** Medium
**Mitigation:**
- Use React Context for user state
- Keep components simple and focused
- Write unit tests for state changes

---

## Sprint Ceremonies

### Daily Standup (10am daily)
- What did I do yesterday?
- What am I doing today?
- Any blockers?

### Sprint Review (Friday Week 2, 2pm)
**Agenda:**
1. Demo signup flow (Creator + Buyer)
2. Demo profile page
3. Demo navigation differences
4. Show test coverage
5. Discuss what went well / not well

**Attendees:** Team + Product Owner

### Sprint Retrospective (Friday Week 2, 3pm)
**Format:** Start, Stop, Continue
- What should we start doing?
- What should we stop doing?
- What should we continue doing?

---

## Success Metrics

### Sprint Goals (Binary):
- ✅ All P0 tasks completed: YES/NO
- ✅ 80%+ test coverage: YES/NO
- ✅ Zero critical bugs: YES/NO
- ✅ Demo ready: YES/NO

### Performance Metrics:
- Signup API response time: < 500ms
- Profile page load time: < 1s
- Zero database errors in logs

### Quality Metrics:
- Backend test coverage: ≥ 80%
- Frontend test coverage: ≥ 70%
- Accessibility score (Lighthouse): ≥ 90
- Mobile usability (Google): Pass

---

## Dependencies & Blockers

### External Dependencies:
- ✅ PostgreSQL database access (DONE - local dev)
- ✅ JWT_SECRET configured in .env (DONE - see .env.example)
- ⏳ SendGrid account for password reset emails (PENDING - optional for Sprint 1)

### Blocker Prevention:
- Frontend can start once backend API spec is agreed (Day 1)
- Mock API responses for frontend development if needed
- Parallel work: Backend on auth, Frontend on UI components

---

## Next Sprint Preview

### Sprint 2 (Weeks 3-4): Verification System
- OAuth connection to Google Analytics 4
- Fetch and display verified metrics
- Grant verification badges
- Display badges on profile

**Depends On:** Sprint 1 profile system completed

---

## Resources

### Documentation:
- [PRD.md](./PRD.md) - Product context
- [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) - API specs
- [DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md) - Environment setup

### Tools:
- Jira/Linear: Sprint board
- GitHub: Code reviews
- Figma: UI mockups (optional)
- Postman: API testing

### Team:
- Backend Developer: 1 FTE
- Frontend Developer: 1 FTE
- Full-Stack Developer: 0.5 FTE (testing + review)
- Product Owner: 0.2 FTE (acceptance + review)

---

## Notes

### Design Decisions:
1. **Why JWT Refresh Tokens?**
   - Short-lived access tokens (15min) minimize damage if stolen
   - Long-lived refresh tokens (7 days) improve UX (no constant re-login)
   - Industry standard for secure SPAs

2. **Why Account Type at Signup?**
   - Prevents user confusion later
   - Enables immediate UX customization
   - Simpler than switching types mid-journey

3. **Why Profile Fields in accounts Table?**
   - Simpler than separate profile table for MVP
   - Can refactor to profile table in Phase 2 if needed
   - Faster queries (no joins)

### Open Questions:
1. Do we allow account type switching after signup? (Answer: No for MVP)
2. What happens if user signs up as Buyer but wants to verify later? (Answer: Require new Creator account)
3. Should we support OAuth signup (Google/LinkedIn)? (Answer: Phase 2)

---

**Document Version:** 1.0
**Created:** February 28, 2026
**Sprint Start:** February 28, 2026
**Sprint End:** March 13, 2026
**Next Review:** March 13, 2026 (Sprint Review)
