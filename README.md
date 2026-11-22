# Tic Tac Toe (井字棋)

A simple, large-print Tic Tac Toe game in Chinese for elderly users. Play against the computer (Easy / Normal / Hard), on a 3×3, 4×4 or 5×5 board. You are X (blue), the computer is O (red). Plain HTML, CSS and JavaScript — no frameworks, no build step, no backend.

Files: `index.html`, `style.css`, `script.js`, `README.md`

To try it on your own computer first, just double-click `index.html`.

---

## 1. Put the files on GitHub

1. Sign in at https://github.com (create a free account if you do not have one).
2. Click the **+** at the top right, then **New repository**.
3. Type a name, for example `tic-tac-toe`. Choose **Public**. Click **Create repository**.
4. On the new page, click **uploading an existing file**.
5. Drag in all four files: `index.html`, `style.css`, `script.js`, `README.md`. (Drag the files themselves, not a folder around them — `index.html` must be at the top level.)
6. Scroll down and click **Commit changes**.

## 2. Deploy on Render (free Static Site)

1. Sign in at https://render.com (you can sign in with your GitHub account).
2. Click **New** > **Static Site**.
3. Click **Connect** next to your `tic-tac-toe` GitHub repository. (If it is not listed, click **Configure account** and allow Render to see the repository.)
4. Fill in the form:
   - **Name:** anything you like, for example `tic-tac-toe`
   - **Branch:** `main`
   - **Build Command:** leave this **blank**
   - **Publish Directory:** type a single dot: `.`
5. Click **Create Static Site**.
6. Wait about a minute. When it says **Live**, click the address near the top (it looks like `https://tic-tac-toe-xxxx.onrender.com`). That is your game. Share this link with anyone.

## 3. Update the game later

1. Open your repository on GitHub.
2. Click the file you want to change (for example `script.js`).
3. Click the **pencil icon** (Edit), make your change, then click **Commit changes**.
4. Render notices the change and redeploys by itself. After a minute or so, refresh the game page to see the update.

---

## Notes

- The player's choices (level, board size) are saved on their own device.
- Once the page has loaded, the game needs no internet connection.
