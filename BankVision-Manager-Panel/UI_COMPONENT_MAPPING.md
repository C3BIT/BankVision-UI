# RM Portal UI Component Mapping

## New UI Design → Existing Functionality Mapping

### 1. Dashboard Layout (Desktop.png)

**New Components to Create:**

#### CallQueueTable
- **Replaces:** CallQueue.jsx (list view)
- **Features:**
  - Table with columns: Clients Number, Waiting Time, Priority, Action
  - Pagination (1, 2, 3, ... 10)
  - Accept button per row
  - Priority badges (High/red, Medium/yellow, Low/green)
  - Online indicator dot per client
  - Responsive design
- **Preserves:**
  - `queue` state from WebSocketProvider
  - `pickCallFromQueue()` method
  - `refreshQueue()` method
  - Real-time queue updates via `queue:updated` event

#### ManagerCard
- **Replaces:** UserInfoCard.jsx + AgentStatusSelector.jsx (combined)
- **Features:**
  - Profile image
  - Manager name
  - Role/title
  - Status dropdown with icon (In Break, Online, Busy, etc.)
  - Blue card background
- **Preserves:**
  - `manager` from Redux auth slice
  - `agentStatus` from WebSocketProvider
  - `setAgentStatusValue()` method
  - All 6 status states

#### PerformanceOverview
- **Replaces:** CallStatistics.jsx (redesigned layout)
- **Features:**
  - 3 stat cards vertically stacked
  - Icons for each stat (phone, clock, chart)
  - Card 1: Calls Taken Today
  - Card 2: Average Handle Time (mm:ss format)
  - Card 3: CSAT Score (X/10)
- **Preserves:**
  - `/call-logs/statistics` API call
  - Auto-refresh every 5 minutes
  - All metric calculations

### 2. Video Call Interface (Desktop-1.png, Desktop-2.png)

**New Components to Create:**

#### VideoCallLayout
- **Layout:**
  - 70% left: Large video area
  - 30% right: Info sidebar
  - PIP manager video (top-right overlay)
  - Controls at bottom
  - Chat button (bottom-right)
- **Preserves:**
  - All OpenViduMeetComponent functionality
  - LiveKit SDK integration
  - Track publishing/subscription

#### VideoControls
- **Features:**
  - 5 blue circular buttons: Speaker, Mic, Video, Upload, Share
  - 1 red rounded End Call button
  - Icon-based design
  - Consistent with customer portal style
- **Preserves:**
  - toggleAudio, toggleVideo methods
  - endCall method
  - All WebRTC controls

#### FaceVerificationPanel
- **Replaces:** FaceVerification.jsx (redesigned)
- **Features:**
  - "Recent Image" section (profile photo)
  - "Current Image" section (captured photo)
  - "Capture Image" blue button
  - "Verify Now" blue button (after capture)
  - "Eye Blinking - Passed" indicator
  - Face mesh overlay on current image
- **Preserves:**
  - `requestFaceVerification()` method
  - `requestCaptureImage()` method
  - `verifyImage()` method
  - `verifyFaceClientSide()` method
  - face-api.js integration
  - OpenCV/AWS backend integration
  - All face detection states

### 3. Customer Information Panel (Desktop-5.png)

**New Components to Create:**

#### CustomerInfoPanel
- **Features:**
  - Client's Information section (name, mobile, email, address)
  - Account List (collapsible items with A/C numbers)
  - Card List (masked card numbers)
  - Loan Details (masked loan numbers)
  - Right arrow indicators for clickable items
- **Preserves:**
  - `customerAccounts` from Redux slice
  - `accountDetails` from Redux slice
  - `fetchCustomerAccounts()` thunk
  - `fetchAccountDetails()` thunk
  - All customer data fetching

### 4. Service Selection Interface (Desktop-7.png, Desktop-10.png)

**New Components to Create:**

#### AccountInfoDisplay
- **Features:**
  - A/C number
  - Branch name
  - Opening Date
  - Matured Date
  - Clean text layout
- **Preserves:**
  - Selected account details
  - Account information display

#### ServiceSelector
- **Features:**
  - Dropdown with placeholder "Select your Services"
  - Options: Email change, Phone change, Address change, Account Activation
  - Blue "Continue" button
- **Preserves:**
  - `activeService` state
  - Service selection logic
  - Navigation to verification screens

### 5. Components to Keep As-Is (No UI Change)

**These components work fine and maintain existing functionality:**

- CallingScreen.jsx (incoming call popup)
- ChatBox.jsx (text chat)
- WhisperChat.jsx (supervisor communication)
- RequestAssistance.jsx (assistance dialog)
- CallHoldButton.jsx (hold dialog)
- EmotionDisplay.jsx (emotion detection)
- CallTimer.jsx (timer display)
- All authentication pages (Login, Signup, ForgotPassword)
- AuthLayout, AppLayout
- All form components (FormInput, PasswordInput, OtpInput)

### 6. Verification Workflows (Preserve Logic, Update UI)

**PhoneVerification** → Keep logic, match new UI styling
**EmailVerification** → Keep logic, match new UI styling
**PhoneChangeRequest** → Keep logic, match new UI styling
**EmailChangeRequest** → Keep logic, match new UI styling
**AddressChange** → Keep logic, match new UI styling
**AccountActivation** → Keep logic, match new UI styling

---

## WebSocket Events - MUST Preserve ALL

**Call Management (12 events):**
- call:request, call:accept, call:reject, call:end, call:ended, call:cancelled
- call:hold, call:resume
- supervisor:joined, supervisor:left, supervisor:whisper-started, supervisor:call-takeover

**Queue Management (5 events):**
- queue:list, queue:updated, queue:pick-call
- managers:status, admin:managers-list

**Verification (10 events):**
- customer:phone-verified, customer:email-verified
- manager:request-face-verification, manager:request-capture-image
- manager:request-retake-image, manager:request-submit-image
- manager:verified-image, manager:received-image-link
- customer:typing-phone, customer:new-phone

**Chat (4 events):**
- chat:send, chat:receive, chat:typing, chat:sent

**Status (4 events):**
- manager:set-status, manager:status-updated, manager:free, manager:busy

**Assistance (3 events):**
- manager:request-assistance, manager:assistance-response, manager:cancel-assistance

**Auth (2 events):**
- force-logout, token_expired

---

## Redux State - MUST Preserve ALL

**auth slice:**
- manager, token, isAuthenticated, pendingVerification, loading, error

**customer slice:**
- phoneOtpStatus, emailOtpStatus, loading

**customerAccounts slice:**
- accounts, accountDetails, loading

**customerImage slice:**
- profileImageUrl, comparisonResult, loading

---

## Implementation Priority

1. ✅ Create new Dashboard components (CallQueueTable, ManagerCard, PerformanceOverview)
2. ✅ Create new VideoCallLayout with PIP
3. ✅ Create FaceVerificationPanel
4. ✅ Create CustomerInfoPanel
5. ✅ Create ServiceSelector
6. ✅ Update Dashboard.jsx to use new layout
7. ✅ Update verification components styling
8. ✅ Wire all WebSocket events
9. ✅ Test complete functionality
10. ✅ Build and deploy

---

## Critical Preservation Checklist

- [ ] All 50+ WebSocket events connected
- [ ] All 4 Redux slices functional
- [ ] All API endpoints working
- [ ] Face recognition (client + server) working
- [ ] Video calls (LiveKit) working
- [ ] Chat working
- [ ] Supervisor features working
- [ ] Session timeout working
- [ ] Authentication flow working
- [ ] Queue management working
- [ ] All 6 verification services working
- [ ] Agent status management working
- [ ] Call statistics working
- [ ] Emotion detection working
- [ ] Hold/Resume working
- [ ] Assistance requests working
