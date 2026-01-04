# 🗺 Lumenote — Technical Roadmap (Phase 0 → Sync)

**App name:** Lumenote  
**Tagline:** _Clear notes. Calm thinking._

Triết lý cốt lõi:

- Markdown là canonical source
- Edit / View chỉ là hai projection
- Local-first, sync là optional concern
- UI calm, modern, writer-first

---

## Phase 0 — Product Identity & Style (FOUNDATION)

**Mục tiêu**

- Chốt identity trước khi scale UI
- Tránh trở thành “Obsidian clone” về cảm giác
- Tạo nền thống nhất cho toàn bộ thiết kế & code

### Identity

- App name: **Lumenote**
- Style direction:
  - Modern macOS / iOS-like
  - Pha Calm / Editorial / Writer-first
- Tone:
  - Calm
  - Polished
  - Content-first

### Tasks

- [x] Chốt app name: Lumenote
- [x] Chốt tagline & positioning
- [x] Chốt style direction (Option B + Calm)
- [x] Hoàn thiện App Style Spec
- [x] Lock design tokens (color / spacing / typography)
- [x] Áp dụng style spec cho layout cơ bản

### Done criteria

- Có style guideline rõ ràng
- UI không phụ thuộc cá nhân khi implement
- Mọi component có thể review theo spec

---

## Phase 1 — Core Markdown Note (Foundation)

**Mục tiêu**

- Thiết lập hệ thống tối thiểu nhưng đúng triết lý
- Có thể tạo / sửa / xem note markdown

### Tasks

- [x] App shell layout (Header / Sidebar / Main)
- [x] Sidebar tree (Folder + Note)
- [x] Note model (id, title, content)
- [x] Main note container
- [x] Edit / View mode toggle
- [x] In-memory state (mock data)

### Không làm

- DB
- Sync
- Search

### Done criteria

- Có thể tạo note
- Có thể sửa markdown
- Chuyển Edit ↔ View không mất dữ liệu
- Reload app mất dữ liệu (chấp nhận)

---

## Phase 2 — Editor & View Projection (Core Engine)

**Mục tiêu**

- Xây edit/view pipeline chuẩn markdown-first

### Tasks

#### Editor

- [x] Tích hợp Markdown editor (CodeMirror 6)
- [x] Controlled value = markdown string
- [x] Selection tracking

#### View

- [x] Markdown renderer (read-only)
- [x] Content Editable
- [x] Render đúng heading / bold / italic / list

#### Toolbar

- [x] Bold → wrap `**`
- [x] Italic → wrap `_`
- [x] Heading → prepend `#`
- [x] Toolbar thao tác markdown string (không thao tác DOM)

### Done criteria

- Edit markdown → View render đúng
- Click toolbar → markdown thay đổi
- Không có state phụ ngoài `Note.content`

---

## Phase 3 — Local Storage & Index (Local-first)

**Mục tiêu**

- Persist dữ liệu local, không đổi mental model

### Tasks

#### Rust backend

- [x] SQLite setup
- [x] Table: notes
- [x] Table: folders
- [x] CRUD API (notes, folders)
- [x] updated_at / created_at

#### Frontend

- [x] Load notes từ backend
- [x] Save note content
- [x] Sidebar render từ DB

### Không làm

- Sync
- Multi-device

### Done criteria

- [x] Restart app không mất note
- [x] DB chỉ lưu markdown + metadata
- [x] Có thể rebuild UI hoàn toàn từ DB

---

## Phase 4 — UX Hardening & Search

**Mục tiêu**

- App dùng hằng ngày được, không phá core

### Tasks

- [ ] Keyboard shortcuts (Cmd/Ctrl+B, I, etc.)
- [x] Inline edit note title
- [x] Note delete / move
- [ ] Markdown text search
- [ ] Simple text index (Rust side)
- [ ] Search result snippet

### Search rules

- Chỉ index markdown text
- Không index HTML
- Không index editor state

### Done criteria

- Search nhanh, chính xác
- Không parse toàn bộ markdown mỗi query
- Schema không phình to

---

## Phase 5 — Sync-Ready Architecture (Preparation)

**Mục tiêu**

- Sẵn sàng sync mà không cần refactor

### Tasks

#### Data

- [ ] Note versioning (revision / updated_at)
- [ ] Optional change log
- [ ] Export workspace (markdown)

#### API / Boundary

- [ ] API payload = markdown string
- [ ] Frontend không biết sync logic
- [ ] Rust backend owns data consistency

### Validation checklist

- [ ] Xoá DB → import markdown → app hoạt động lại
- [ ] Không feature nào cần data ngoài markdown

---

## Phase 6 — Self-host Sync (Docker)

**Mục tiêu**

- Sync nhiều máy, local-first, server-optional

### Tasks

#### Rust server

- [ ] Auth (token-based)
- [ ] Sync API (notes, folders)
- [ ] Conflict detection
- [ ] Snapshot on conflict
- [ ] Dockerfile + docker-compose

#### Client

- [ ] Sync trigger
- [ ] Offline-first behaviour
- [ ] Sync status indicator

### Sync strategy (MVP)

- last-write-wins
- snapshot khi conflict
- không CRDT ở phase này

### Done criteria

- 2 máy sync được
- Conflict không làm mất markdown
- Server down → app vẫn dùng offline

---

## Invariants (KHÔNG ĐƯỢC PHÁ VỠ)

- [ ] Markdown là canonical source
- [ ] Edit / View không tạo data riêng
- [ ] Không persist AST / HTML / editor state
- [ ] Mọi feature rebuild được từ markdown

---

## Rule kiểm tra mỗi feature mới

Trước khi code:

1. Canonical data là gì?
2. Có state nào ngoài markdown không?
3. Sync chỉ markdown có đủ không?
4. Có rebuild feature chỉ từ markdown không?

Nếu **có câu trả lời “không”** → thiết kế sai, cần sửa.

---
