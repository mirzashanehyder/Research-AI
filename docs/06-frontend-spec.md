# 06 — Frontend Specification

## App.tsx — Route Structure

```tsx
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Pages
import Login from "./pages/Login"
import Register from "./pages/Register"
import Home from "./pages/Home"
import Dashboard from "./pages/Dashboard"
import SearchPapers from "./pages/SearchPapers"
import Workspace from "./pages/Workspace"
import AIChat from "./pages/AIChat"
import AITools from "./pages/AITools"
import UploadPDF from "./pages/UploadPDF"
import DocSpace from "./pages/DocSpace"
import { isAuthenticated } from "./utils/auth"

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchPapers /></ProtectedRoute>} />
          <Route path="/workspace/:id" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
          <Route path="/ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadPDF /></ProtectedRoute>} />
          <Route path="/docspace" element={<ProtectedRoute><DocSpace /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

---

## Sidebar Component

The sidebar appears on ALL protected pages. Fixed left, collapsible on mobile.

```
Links (with Lucide icons):
  Home          → /home          (icon: Home)
  Dashboard     → /dashboard     (icon: LayoutDashboard)
  Search Papers → /search        (icon: Search)
  Workspaces    → /dashboard     (icon: FolderOpen)
  AI Chat       → /chat          (icon: MessageSquare)
  AI Tools      → /ai-tools      (icon: Wand2)
  Upload PDF    → /upload        (icon: Upload)
  Doc Space     → /docspace      (icon: FileText)
```

Active link: `bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`
Default link: `text-gray-600 hover:bg-gray-100 dark:text-gray-300`
Brand: "ResearchHub AI" in purple at top

---

## Theme & Colors

```
Primary: purple-600 (#7C3AED)
Background light: white / gray-50
Background dark: gray-900 / gray-800
Text light: gray-900
Text dark: gray-100
Border: gray-200 / dark:gray-700
Card: white / dark:gray-800
```

---

## Page 1: Login.tsx

**Layout:** Split screen — left: dark purple gradient with globe/particle visual, right: white login form

**Elements:**
- "Welcome Back" heading
- "Sign in to continue to ResearchHub AI" subtext
- Email input
- Password input (with show/hide toggle)
- "Sign In" button (purple, full width)
- "Don't have an account? Sign up" link → /register

**Logic:**
1. POST `/auth/login`
2. Store token: `localStorage.setItem("token", data.access_token)`
3. Store role: `localStorage.setItem("role", data.role)`
4. Redirect to `/home`

---

## Page 2: Register.tsx

Similar to Login but with Name field added.
POST `/auth/register`, then auto-login and redirect.

---

## Page 3: Home.tsx

**Layout:** With Sidebar

**Sections:**
1. Hero: "Your AI-Powered Research Assistant" + purple headline
2. Two CTA buttons: "Start Researching" → /search, "Try DocSpace" → /docspace
3. Feature grid (4 cards): Smart Paper Search, AI Chat Assistant, DocSpace Editor, Literature Review
4. "Why Choose ResearchHub AI?" section with 5 checkpoints

---

## Page 4: Dashboard.tsx

**Layout:** With Sidebar

**Shows:**
- Stats row: Total Workspaces (count), Papers Imported (total across all workspaces)
- Quick Actions: "Search Papers" button
- "+ Create New Workspace" button → opens modal
- Workspace cards grid: name, paper count, created date, delete button

**Workspace card click** → navigate to `/workspace/:id`

**Create modal fields:** Name (required), Description (optional)

---

## Page 5: SearchPapers.tsx

**Layout:** With Sidebar

**Top:**
- Search input + Search button
- Source filter dropdown: "All Sources" | "arXiv" | "IEEE" | "PubMed" | "Semantic Scholar"

**Results:**
- "Found N papers" count
- Paper cards (PaperCard component)

**Loading state:** spinner with "Searching academic databases..."

**PaperCard must show all 8 fields:**
- Title (bold, large)
- Authors (gray text)
- Abstract (truncated to 3 lines, expandable)
- Publication date
- Badge: [Source: IEEE Xplore] in blue
- Badge: [Via: API] in green OR [Via: Selenium] in orange
- URL link: "View Original" button (opens new tab)
- DOI if available
- "Import to Workspace" button → opens workspace selector dropdown

---

## Page 6: Workspace.tsx

**Layout:** With Sidebar

**Header:** "← Back to Dashboard", workspace name

**Tabs:** Papers | AI Chat | Generate Review

**Papers tab:**
- List of imported papers with checkbox selection
- Delete paper button (trash icon)
- "View Paper →" link

**AI Chat tab (inline, not full page):**
- Shows embedded chat interface for this specific workspace
- "2 papers selected — Ask anything!"

**Generate Review tab:**
- Triggers LiteratureReviewAgent
- Shows formatted review output

---

## Page 7: AIChat.tsx

**Layout:** With Sidebar

**Top:** Workspace selector dropdown (shows all user's workspaces)

**Main area:** Split layout
- Left (70%): Chat thread
  - Messages with role styling (user vs AI)
  - AI responses have citation footnotes
- Right (30%): Sources panel (collapsible)
  - Shows papers that were retrieved for each AI response

**Bottom:** Input + Send button

---

## Page 8: AITools.tsx

**Layout:** With Sidebar

**Section 1:** "Select Papers for Analysis"
- Checkboxes for each paper in current workspace
- "N paper(s) selected" counter

**Section 2:** Tool cards (3 per row):
```
AI Summaries          Key Insights          Literature Review
[Generate Summaries]  [Extract Insights]    [Generate Review]

Research Gaps         Citations             Compare Papers
[Find Gaps]           [Generate Citations]  [Compare]
```

**Results section:** Shows formatted output below tools
- Download button for each result

---

## Page 9: UploadPDF.tsx

**Layout:** With Sidebar

**Upload zone:** Drag-and-drop or click to browse
- Shows filename when selected
- Workspace selector (which workspace to add to)
- "Generate AI Summary" button
- "Save to Workspace" button
- "Download Text" button

**After processing:**
- Shows "Extracted Text:" section
- Shows "AI Summary:" section

---

## Page 10: DocSpace.tsx

**Layout:** With Sidebar

**Split layout:**
- Left panel (250px): Document list
  - "+ New Document" button
  - List of docs with title + date
  - Click to open in editor
- Right panel: Rich text editor
  - Toolbar: H1 H2 | B I U S | lists | link | image
  - Auto-save indicator
  - "Save" + "Download" buttons

---

## utils/api.ts

```typescript
import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
})

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export default api

// Export typed API functions
export const searchPapers = (q: string, workspaceId?: number) =>
  api.get("/search", { params: { q, workspace_id: workspaceId } })

export const importPaper = (paper: PaperResult, workspaceId: number) =>
  api.post("/import", { ...paper, workspace_id: workspaceId })

export const chatWithWorkspace = (message: string, workspaceId: number) =>
  api.post("/chat", { message, workspace_id: workspaceId })

// ... one function per API endpoint
```

---

## utils/auth.ts

```typescript
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("token")
}

export const getToken = (): string | null => {
  return localStorage.getItem("token")
}

export const getRole = (): string | null => {
  return localStorage.getItem("role")
}

export const logout = (): void => {
  localStorage.removeItem("token")
  localStorage.removeItem("role")
  window.location.href = "/login"
}
```

---

## Dark Mode Implementation

```tsx
// DarkModeToggle.tsx
const DarkModeToggle = () => {
  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark"
  )

  const toggle = () => {
    const newDark = !dark
    setDark(newDark)
    localStorage.setItem("theme", newDark ? "dark" : "light")
    document.documentElement.classList.toggle("dark", newDark)
  }

  // On mount, apply saved preference
  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark")
  }, [])

  return <button onClick={toggle}>{dark ? <Sun /> : <Moon />}</button>
}
```
