# 📦 WMS - Warehouse Management System (Pick & Pack Mobile PDA App)

A standalone, modular Warehouse Management System (WMS) web application engineered specifically for **Handheld PDAs (Zebra/Honeywell/Android)** and **Mobile Terminals**.

Designed to be deployed independently or mapped directly to a subdomain (e.g. `wms.yourdomain.com`, `pickpack.zepto.local`) or packaged as an Android/iOS PWA.

---

## 🚀 Tech Stack & Infrastructure

- **Database:** PostgreSQL (via Prisma ORM sharing domain models)
- **Auth:** JWT (JSON Web Tokens) with strict role-based access control (RBAC)
- **Caching & Locks:** Redis (`ioredis`) for auto-assignment state, locks & sessions with graceful memory fallback
- **Object Storage:** MinIO S3 for damage photos, selfie biometric punch-ins, and staging tags
- **Real-Time Communication:** WebSockets (`socket.io`) for instant order assignments, task alerts, and live floor duty broadcasts
- **Event Bus:** Kafka (`kafkajs`) producer with local event-bus fallback
- **Audit Logs:** Full compliance audit logging (`AuditLogs` table) tracking every scan, movement, and status transition
- **Barcode & Hardware Scanner Support:** Camera scanner (`Html5Qrcode`), hardware PDA laser scanner keystroke capture, and manual entry

---

## 👥 Supported Roles & Workflows

### 1. 🎯 Picker (Item Uthane Wala)
- **Outbound Picking:** Receives assigned orders on mobile PDA screen with item list, product image, SKU, and exact shelf bin location (`Aisle-X-Rack-Y-Bin-Z`).
- **Barcode Scan:** Scans item barcode to confirm picking. Plays audible laser beep & prevents wrong product picking.
- **Speed & Accuracy:** 60–90 seconds target countdown timer per item.
- **Customer Return Picking:** Pick returned items from designated bins to the Return Dock with customer & rider details.
- **⚡ Instant Auto-Assignment:** As soon as an order is completed (`complete-pick`), the system instantly auto-assigns the NEXT pending order from the pool!

### 2. 📦 Put-away Associate / Staging Loader (Maal Rakhne Wala)
- **Dock Clearance:** Pallets and crates waiting at Inward staging floor.
- **Bin Scanning & Placement:** Shows suggested bin (`Aisle-Rack-Shelf`). Requires scanning bin barcode first, then item barcode to confirm placement and update stock.
- **Stock Hygiene Rules:**
  - *Heavy Items (>5kg)*: Ground / Level 1 shelf guidance.
  - *Light & Fragile Items*: Upper shelves (Level 3/4) to prevent crushing.
- **Reverse Put-away:** Restock cancelled or rejected return products back to designated shelf bins.

### 3. 🚚 Inward / Receiving Associate (Maal Receive Karne Wala)
- **Truck Unloading:** Record physical cartons vs Purchase Order (PO) expected count.
- **Damaged/Leakage Flagging:** Flag damaged/expired products, attach live camera photo uploaded to MinIO (`wms-damages`), and alert floor supervisor in real-time.
- **Pallet Staging Tag:** One-click barcode pallet slip generation for floor placement.

### 4. 🛍️ Packer & Sorter (Pack Karne Wala)
- **Bagging:** Pack picked items into delivery carrybags or crates.
- **Weight & Item Verification:** Packing table item scan tally + scale weight verification against expected weight tolerance.
- **Seal & Handover:** Scan Bag Seal barcode, set status to `DISPATCH_READY`, and assign to Delivery Rider Bay (`BAY-01`, `BAY-02`).

### 5. 🧑‍💼 Warehouse Manager / Floor Lead (Supervisor)
- **Shift & Attendance:** Live floor dashboard displaying all staff, selfies, punch-in times, duty ON/OFF, and breaks.
- **Task Allocation:** Trigger real-time auto-assignment engine or manually assign orders.
- **Discrepancy Approval Desk:** Review damage/shortage tickets with MinIO photo proofs; approve for RTV or reject.
- **RTV Gatepass:** Generate vendor return (Purchase Return) gatepass with vehicle number, transporter, items, and authorized security seal.

---

## ⚙️ Running Locally

1. Install dependencies:
   ```bash
   cd wms
   npm install
   npx prisma generate
   ```

2. Start the WMS server:
   ```bash
   npm run dev
   # or
   npm start
   ```

3. Open in browser / PDA handheld terminal:
   ```
   http://localhost:3001
   ```

---

## 🌐 Subdomain & Production Deployment

To host this on a subdomain (e.g. `wms.yourdomain.com`):
1. Build the Docker container:
   ```bash
   docker build -t wms-app:latest ./wms
   ```
2. Run container:
   ```bash
   docker run -d --name wms_app -p 3001:3001 --env-file ./wms/.env wms-app:latest
   ```
3. Set your Nginx / Caddy reverse proxy to point `wms.yourdomain.com` to port `3001`.
