# Emergency Network Connector (ENC)
### Kruskal's Minimum Spanning Tree Algorithm Visualizer

A web-based interactive visualization system for designing cost-optimal emergency communication networks during disaster management scenarios using **Kruskal's Minimum Spanning Tree (MST)** algorithm and **Disjoint Set Union (Union-Find with Path Compression & Union by Rank)**.

Developed as a Laboratory Project for **Design and Analysis of Algorithms (ADA)**, Bachelor of Technology in Computer Science & Engineering at **B.V. Raju Institute of Technology (BVRIT)**.

---

## 📌 Problem Statement

During natural disasters (cyclones, floods, earthquakes), existing communication infrastructures often fail. Establishing emergency links between vital response nodes (Control Rooms, Hospitals, Fire Stations, Police Headquarters, Relief Camps, Power Grids, and Airports) is time-critical with finite budgetary and resource constraints. 

This project models the disaster-affected region as an undirected, weighted graph $G = (V, E)$, where:
- **Vertices ($V$)**: Critical emergency infrastructure sites.
- **Edges ($E$)**: Potential communication links (satellite, VHF/UHF radio, temporary fiber, microwave links).
- **Weights ($w$)**: Terrain difficulty, deployment latency, or installation cost.

By finding the **Minimum Spanning Tree**, the system ensures **100% connectivity** across all emergency response centers with the **lowest total cost and zero redundant loops/cycles**.

---

## 🚀 Key Features

- **Interactive Graph Visualizer**: Built on HTML5 Canvas with custom high-DPI scaling and dynamic layout calculations.
- **Drag-and-Drop Node Repositioning**: Click or touch and drag any emergency station node to rearrange the network topology in real time.
- **Animated Step-by-Step Kruskal Execution**:
  - Live inspection of candidate links sorted in non-decreasing order of cost.
  - Distinct visual states:
    - 🟡 **Evaluating**: Link currently being tested for cycle formation.
    - 🟢 **Accepted (MST)**: Link connecting two disconnected components.
    - 🔴 **Rejected (Cycle)**: Discarded edge that would create an unnecessary loop.
- **Execution Trace Log**: Live step-by-step commentary detailing every decision made by the disjoint-set `find` and `union` operations.
- **Customizable Graph Inputs**: Easily add or remove emergency locations and communication links, or load the benchmark 7-location scenario with one click.
- **Speed Control & Auto Layout**: Adjustable playback speed and one-click circular layout reset.

---

## 🧠 Algorithmic Details & Complexity

### Kruskal's Algorithm
1. **Sort Edges**: Sort all edges $E$ in non-decreasing order of weight: $O(E \log E)$.
2. **Initialize Disjoint Sets**: Each vertex starts in its own component: $O(V)$.
3. **Greedy Selection**: For each edge $(u, v)$ in sorted order:
   - If $\text{FIND}(u) \neq \text{FIND}(v)$: Add to MST and execute $\text{UNION}(u, v)$.
   - Else: Reject edge (forms cycle).
4. **Termination**: Stops when $|V| - 1$ edges are selected.

### Complexity
| Metric | Complexity |
| :--- | :--- |
| **Time Complexity** | $O(E \log E) = O(E \log V)$ |
| **Space Complexity** | $O(V + E)$ |
| **Disjoint Set Operations** | $O(\alpha(V))$ per operation (near $O(1)$ amortized) |

---

## 📊 Benchmark Test Case (From Laboratory Report)

### Input Graph
- **Locations ($V = 7$)**:
  - `0`: ControlRoom
  - `1`: Hospital
  - `2`: FireStation
  - `3`: PoliceHQ
  - `4`: ReliefCamp
  - `5`: PowerGrid
  - `6`: Airport
- **Candidate Links ($E = 11$)**:
  - `(0, 1, 4)`, `(0, 2, 8)`, `(1, 2, 2)`, `(1, 3, 6)`, `(2, 3, 3)`, `(2, 4, 7)`, `(3, 4, 5)`, `(3, 5, 9)`, `(4, 5, 4)`, `(4, 6, 10)`, `(5, 6, 2)`

### Resulting MST
1. `Hospital — FireStation` (Cost: 2)
2. `PowerGrid — Airport` (Cost: 2)
3. `FireStation — PoliceHQ` (Cost: 3)
4. `ControlRoom — Hospital` (Cost: 4)
5. `ReliefCamp — PowerGrid` (Cost: 4)
6. `PoliceHQ — ReliefCamp` (Cost: 5)

- **Total Edges Selected**: `6` ($V - 1$)
- **Minimum Network Cost**: **`20`**
- **Status**: All 7 emergency stations fully connected.

---

## 💻 Tech Stack

- **HTML5 & Vanilla CSS**: Dark-themed UI with glassmorphism, responsive layout, and CSS custom properties.
- **JavaScript (ES6+)**: Custom Canvas rendering engine, Disjoint Set Union implementation, and asynchronous animation loops.
- **Zero External Dependencies**: Pure vanilla implementation for instant loading and cross-platform compatibility.

---

## 🛠️ How to Run Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/snehith50h-ai/Emergency-Network-Connector.git
   cd Emergency-Network-Connector
   ```
2. Open `index.html` in any modern web browser, or serve locally:
   ```bash
   npx serve .
   ```
3. Navigate to `http://localhost:3000` (or the port specified).

---

## 👥 Project Team

| Roll Number | Student Name |
| :--- | :--- |
| `25211A05L2` | Gurram Yashwith |
| `25211A05L3` | Gutam Vishwanath |
| `25211A05L4` | Hanumanth Tanish Kumar |
| `25211A05L5` | Harini Marepally |
| `25211A05L6` | Hatti Pavan Kumar |
| `25211A05L7` | Hemanth Yadav Ambari |
| `25211A05L8` | Humnabad Snehith Kumar |

### Project Guide
**Ms. Priya Darshini Ch**  
Assistant Professor, Department of Computer Science & Engineering  
**B.V. Raju Institute of Technology (BVRIT)**  
*(UGC Autonomous, Accredited by NBA & NAAC)*  
Vishnupur, Narsapur, Medak (Dist.), Telangana, India – 502313  
Academic Year: 2026 – 2027
