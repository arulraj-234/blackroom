# ⬛ BLACKROOM

> **Zero Trace. Total Stealth.**

BLACKROOM is a privacy-first, ephemeral messaging platform designed for the shadows. Built with Spring Boot and WebSockets, it ensures that what happens in the room, stays in the room—until it doesn't. Once the connection is severed, the data is obliterated. No database. No logs. No history.

## ◼ FEATURES

- **🚫 Zero Persistence**: Messages exist only in volatile memory. Server restart or room closure = total data wipe.
- **⚡ Stealth Messaging**: Real-time, encrypted-in-transit communication via WebSockets.
- **🔒 Ephemeral Rooms**: On-demand secure channels. Share the ID, join the void.
- **👁️ Live Presence**: Monitor active operatives in your sector.
- **🎨 Dark Mode Native**: A UI forged in the dark, for the dark. Glassmorphism and neon accents.

## 🛠 TECH ARSENAL

- **Core**: Spring Boot 3.2, Java 17
- **Comms**: WebSockets (STOMP)
- **Interface**: React, Vite, Vanilla CSS (Glassmorphism)
- **Storage**: `null` (In-Memory HashMap)

## 🚀 INITIALIZATION

### Prerequisites
- Java 17+
- Node.js & npm
- Maven

### Deploy Protocol

1.  **Clone the Frequency**
    ```bash
    git clone <repo-url>
    cd blackroom
    ```

2.  **Ignite Backend**
    ```bash
    mvn spring-boot:run
    ```

3.  **Launch Interface**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

4.  **Access Terminal**
    ```
    http://localhost:5173
    ```

## 📖 OPERATIONAL GUIDE

### 1. Initialize Room
- Navigate to **INITIALIZE ROOM**.
- Set your alias and designate a room cipher (name).
- The system will generate a unique **Room ID**.

### 2. Establish Link
- Share the **Room ID** with trusted operatives.
- They select **JOIN EXISTING** and input the coordinates.

### 3. Terminate
- **Leave**: Disconnects you from the channel.
- **Close Room**: (Host Only) Obliterates the room and disconnects all users.

## 📂 STRUCTURE

```
src/
├── main/java/com/ephemeralchat/  # Backend Logic
└── frontend/                     # React Interface
```

## 📄 LICENSE

MIT License. Use at your own risk.