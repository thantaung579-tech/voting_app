# Voting App TODO

## Phase 1: Design System & Database Schema
- [x] Define elegant color palette and typography in index.css
- [x] Create database schema (candidates, voters, votes)
- [x] Generate and apply database migrations

## Phase 2: Backend API
- [x] Create candidates router (CRUD operations)
- [x] Create voters router (phone verification, registration)
- [x] Create votes router (vote submission, duplicate prevention)
- [x] Create results router (vote tallies, rankings)
- [x] Create admin router (results visibility toggle)
- [x] Write vitest tests for voting logic

## Phase 3: Admin Panel
- [x] Build admin dashboard layout
- [x] Implement candidate management (add, edit, delete)
- [x] Implement photo upload for candidates
- [x] Implement results visibility toggle
- [x] Add admin authentication/authorization

## Phase 4: Voter Registration & Voting
- [x] Build voter registration page with Myanmar phone validation
- [x] Build voting interface with candidate grid
- [x] Implement 3-vote selection limit
- [x] Implement vote submission
- [x] Add duplicate vote prevention feedback

## Phase 5: Results Page
- [x] Build results page layout
- [x] Display vote tallies and rankings
- [x] Implement winner highlight with celebration effect
- [x] Add admin-controlled visibility toggle

## Phase 6: Polish & Testing
- [x] Test all flows end-to-end
- [x] Optimize UI/UX for elegance
- [x] Test Myanmar phone validation
- [x] Test vote limits and duplicate prevention
- [x] Final polish and deployment

## Additional Tasks
- [x] Change app name to "Yadanabon Computer Science's Selections" (via Management UI Settings)
- [x] Create sample candidate profiles with JPG photos
- [x] Upload sample photos to S3 storage

## OTP Phone Verification Feature
- [x] Set up OTP API integration
- [x] Create OTP request endpoint (send code to phone)
- [x] Create OTP verification endpoint (validate code)
- [x] Update voter registration flow with OTP verification
- [x] Add OTP input UI component
- [x] Add OTP timer and resend functionality
- [x] Test OTP flow end-to-end
