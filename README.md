# 🌌 Billion Grid

A high-performance, infinitely zoomable digital land-claiming application featuring a massive **1,000,000,000 × 1,000,000,000** (10¹⁸) grid.

Instead of a traditional backend, Billion Grid uses a fully automated, serverless **GitHub Issue-driven workflow** to securely verify users, validate claims, and generate Pull Requests via a GitHub Actions bot.

🔗 **Live Demo:** [https://billion-grid.vercel.app/](https://billion-grid.vercel.app/)  
📂 **Repository:** [github.com/homayounmmdy/billion-grid](https://github.com/homayounmmdy/billion-grid)

---

## ✨ Key Features

- 🚀 **High-Performance Canvas Rendering:** Uses HTML5 `<canvas>` with advanced viewport culling and coordinate math. **Zero DOM elements** are used for grid squares, ensuring smooth 60fps panning and zooming even at a 1-billion scale.
- 🤖 **Automated GitHub Bot:** Claims are processed entirely through GitHub. Users create an Issue, and a GitHub Action bot parses, validates, and opens a Pull Request automatically.
- 🔒 **Strict CI Validation:** GitHub Actions enforce the "One Square Per User" rule and prevent coordinate collisions before any code is merged.
- 🎨 **User Customization:** Users can choose any hex color to represent their claimed territory.
- 🌐 **Zero Backend Infrastructure:** No databases, no API keys to manage, and no server costs. State is elegantly stored as a single `grid-data.json` file.

---

## ⚙️ How It Works (The Architecture)

This project uses a clever, secure, and fully automated workflow to handle user claims without requiring a traditional backend or OAuth login:

1. **Stage:** The user visits the app, pans/zooms the canvas, picks a color, and clicks a square to "stage" it.
2. **Redirect:** The app generates a pre-filled GitHub Issue URL containing the coordinates, color, and the user's desired `UserId`.
3. **Authenticate:** The user is redirected to GitHub. If they aren't logged in, GitHub prompts them to log in (proving their identity natively).
4. **Submit:** The user clicks "Submit new issue".
5. **Automate:** A GitHub Actions workflow (`process-claim.yml`) instantly triggers:
    - Parses the Issue body.
    - Validates that the coordinates are not already taken.
    - Validates that the `UserId` does not already own a square.
    - Appends the new claim to `public/grid-data.json`.
    - Automatically opens a Pull Request via `github-actions[bot]`.
6. **Merge:** The repository owner reviews the automated PR and merges it, making the claim permanent.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, HTML5 Canvas API, Pure CSS
- **Automation:** GitHub Actions, `peter-evans/create-pull-request`
- **Hosting:** Vercel (Static Site)
- **State Management:** In-memory Map + `public/grid-data.json`

---

## 🚀 Getting Started (Local Development)

To run this project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/homayounmmdy/billion-grid.git
   cd billion-grid
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**  
   Navigate to `http://localhost:5173`.

*(Note: Because this project uses a GitHub Issue-driven flow, no environment variables or backend setup is required for local development!)*

---

## 🗺️ How to Claim a Square

1. Go to the [Live Demo](https://billion-grid.vercel.app/).
2. Use your mouse wheel to **zoom** and click-and-drag to **pan** across the grid.
3. Click on an unclaimed (checkered) square to **stage** it.
4. Select your desired **color** from the top bar.
5. Enter your **GitHub Username** when prompted.
6. Click **Submit**. You will be redirected to GitHub to finalize the claim.

---

## 📂 Project Structure

```text
billion-grid/
├── .github/
│   └── workflows/
│       └── process-claim.yml   # The bot that validates issues and creates PRs
├── public/
│   └── grid-data.json          # The single source of truth for all claimed squares
├── src/
│   ├── App.jsx                 # Main layout, state, and GitHub Issue redirection logic
│   ├── CanvasGrid.jsx          # Core HTML5 Canvas rendering, pan, zoom, and culling math
│   ├── mockApi.js              # Local in-memory data handling and validation
│   └── App.css                 # Clean, modern, pure CSS styling
├── vite.config.js              # Vite configuration with local dev middleware
└── package.json
```

---

## 🛡️ Security & Validation

The integrity of the grid is protected by multiple layers of validation:
- **Frontend Check:** Prevents staging or submitting coordinates that are already visually marked as claimed.
- **CI Validation:** The GitHub Action strictly checks `public/grid-data.json` on the `main` branch to ensure:
    1. The requested `(X, Y)` coordinates are not already in the file.
    2. The requested `UserId` does not already have an entry in the file.
- **Bot Attribution:** All PRs are created by `github-actions[bot]`, ensuring the repository owner's personal account is not used for automated actions.

---

## 🤝 Contributing

Contributions are welcome! If you find a bug or have an idea for a new feature (like grid statistics or a mini-map), please open an Issue or submit a Pull Request.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

--- 

*Built with ❤️ and a lot of Canvas math.*
