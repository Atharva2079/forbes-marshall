# Forbes Marshall — Warehouse Locator System

A real-time 3D warehouse management and navigation system for **Forbes Marshall's Central Raw Material Store** (Chakan, Pune). Enter a locator code and instantly get the rack location with step-by-step walking directions.

![Forbes Marshall WMS](https://img.shields.io/badge/Forbes_Marshall-WMS_v2.0-0060b0?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/React-Three.js-61DAFB?style=flat-square&logo=react)

## Features

- **🔍 Locator Code Search** — Enter codes like `A01-A01-B1`, `V01-E02-B1`, `C10-R06-B1`
- **🗺️ 3D Warehouse Visualization** — Full Three.js rendered warehouse with all rack types
- **🧭 Step-by-Step Navigation** — Walking directions from your entry gate to the rack
- **📊 Real Data** — 27,824 rows from the actual Excel inventory dataset
- **🚪 Entry Point Selection** — Choose your starting gate for accurate routing
- **📦 4 Zone Types** — Metal Pallet Racks (A-Z), Blue Bin Racks (V, AC1-6), Cabinets (1-37), Chemical Cupboard

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Three.js, React Three Fiber, Framer Motion |
| Backend | Node.js, Express |
| Data | xlsx parser, real Excel inventory data |
| Build | Vite |

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/ForbesMarshall.git
cd ForbesMarshall

# 2. Install server dependencies
npm install

# 3. Install client dependencies
cd client
npm install
cd ..

# 4. Start the API server (Terminal 1)
node server/server.js

# 5. Start the client dev server (Terminal 2)
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

## How It Works

1. **Select your entry gate** — Middle-Right Gate or Bottom-Right Gate
2. **Enter a locator code** — e.g., `A01-A01-B1` (Pallet), `V01-E02-B1` (Blue Bin), `C10-R06-B1` (Cabinet)
3. **View the 3D route** — Animated path from entry to target rack
4. **Follow step-by-step directions** — Turn-by-turn walking instructions with estimated distance & time

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/layout` | Warehouse metadata + rack info |
| GET | `/api/products?zone=Pallet&limit=100` | Paginated product list |
| GET | `/api/search?q=A01` | Search by item code, locator, or rack |
| GET | `/api/locate/A01-A01-B1?entry=ENTRY_1` | Locate by locator code + get route |
| GET | `/api/item/:itemCode` | Single item details |

## Project Structure

```
ForbesMarshall/
├── server/
│   ├── server.js          # Express API server
│   ├── data/
│   │   └── store.js       # Excel parser + data layer + route generator
│   └── utils/
├── client/
│   ├── src/
│   │   ├── App.jsx        # Main layout with entry point selector
│   │   ├── components/
│   │   │   ├── SearchBar.jsx      # Locator code search
│   │   │   ├── ProductList.jsx    # Inventory directory
│   │   │   ├── ProductPanel.jsx   # Details + navigation route
│   │   │   ├── Warehouse3D.jsx    # 3D warehouse renderer
│   │   │   └── StatsBar.jsx       # Statistics display
│   │   ├── lib/
│   │   │   └── warehouseLayout.js # 3D coordinate mapping
│   │   └── index.css      # Design system
│   └── vite.config.js
├── Locator_data_Central RMS_04-05-2026.xlsx   # Real inventory data
├── CENTRAL RMS LAYOUT-*.pdf                    # Warehouse layout map
└── package.json
```

## Data Format

The Excel file contains the following columns:
- **Org Name** — Organization code (e.g., C3A)
- **Item Code** — Unique item identifier
- **LOCATOR NAME** — Location code (format: `RackSection-RowCol-Bin`)
- **LOCATOR IDENTIFICATION** — Rack type (METAL PALLET RACKS, BLUE BIN RACKS, CABINETS, CHEMICAL CUPBOARD)
- **Rack** — Rack letter/name (A-Z, V, AC1-6, cabinet 1-37)

## License

Private — Forbes Marshall Pvt. Ltd.
