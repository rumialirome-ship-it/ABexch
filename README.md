# A-BABA EXCHANGE

A visually striking, modern web application for the A-BABA EXCHANGE online betting platform. It features a neon-inspired UI and facilitates 2-Digit and 1-Digit games with a multi-role system for Admins, Dealers, and Users.

---

## Technology Stack

-   **Frontend:** React, TypeScript, Tailwind CSS, React Router
-   **Backend:** Node.js, Express, TypeScript
-   **Process Manager:** PM2
-   **Web Server / Reverse Proxy:** Nginx

---

## Project Structure

```
.
├── backend/
│   ├── dist/                 # Compiled JavaScript output
│   ├── node_modules/         # Backend dependencies
│   ├── .env.example          # Environment variable template
│   ├── .env                  # (Git-ignored) Local/Production environment variables
│   ├── db.ts                 # In-memory database logic and business rules
│   ├── package.json          # Backend npm dependencies and scripts
│   ├── server.ts             # Express server setup and API routes
│   └── tsconfig.json         # TypeScript configuration for the backend
├── assets/
│   └── ...                   # SVG logos and other static assets
├── components/
│   └── ...                   # Shared React components (UI, layout, etc.)
├── contexts/
│   └── ...                   # React context providers (Auth, Notifications)
├── pages/
│   └── ...                   # Top-level page components for each route
├── services/
│   ├── api.ts                # Frontend functions for making API calls
│   └── realtime.ts           # Frontend service for polling backend state
├── types/
│   └── index.ts              # Shared TypeScript types and enums
├── utils/
│   └── formatters.ts         # Utility functions for formatting data
├── App.tsx                   # Main React application component with routing
├── index.html                # The single HTML page for the SPA
├── index.tsx                 # Entry point for the React application
└── README.md                 # This file
```

---

## 1. Local Development Setup

Follow these instructions to run the application on your local machine for development and testing.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [npm](https://www.npmjs.com/) (usually included with Node.js)

### Backend Setup

1.  **Navigate to the Backend Directory:**
    ```bash
    cd backend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Set Up Environment Variables:**
    Copy the example environment file to create your local configuration.
    ```bash
    cp .env.example .env
    ```
    Now, open the newly created `.env` file and configure the variables for your local setup.
    ```ini
    # .env
    PORT=3001
    NODE_ENV=development
    JWT_SECRET=your_super_secret_local_key # Generate a random string
    CORS_ORIGIN=http://localhost:8080 # Or your frontend's local address
    ```
    *Note: `JWT_SECRET` can be any random string for local development.*

4.  **Run the Backend Development Server:**
    This command uses `nodemon` to automatically restart the server whenever you make changes to the code.
    ```bash
    npm run dev
    ```
    The backend API will be running at `http://localhost:3001`.

### Frontend Setup

The frontend is a static application that makes calls to the backend API.

1.  **Navigate to the Project Root:**
    If you are in the `backend` directory, go back to the root.
    ```bash
    cd ..
    ```

2.  **Serve the Frontend:**
    You need a simple static file server to serve `index.html`. The easiest way is using the `serve` package.
    ```bash
    # Install serve globally if you don't have it
    # sudo npm install -g serve

    # Serve the current directory on port 8080 (or any other port)
    serve -l 8080
    ```

3.  **Access the Application:**
    Open your web browser and navigate to **`http://localhost:8080`**. The application should load, and it will be able to communicate with your backend running on port 3001.

---

## 2. Production Deployment Guide

This guide provides step-by-step instructions to deploy the application on a Virtual Private Server (VPS) running Ubuntu with Nginx.

### Prerequisites

-   A VPS running Ubuntu 20.04 or later.
-   A domain name (e.g., `abexch.live`) pointed to your VPS's IP address.
-   SSH access to your VPS with `sudo` privileges.
-   Git installed (`sudo apt install git`).
-   Node.js (v18+) and npm installed.
-   Nginx installed (`sudo apt install nginx`).
-   PM2 installed globally (`sudo npm install -g pm2`).

### Step 1: Set Up Environment Variables

On your server, create a secure `.env` file inside the `backend` directory.

1.  **Navigate to the backend directory:**
    ```bash
    cd <your_repository_folder>/backend
    ```

2.  **Create the `.env` file:**
    ```bash
    cp .env.example .env
    ```

3.  **Edit the `.env` file (`nano .env`) and set your production values:**

    ```ini
    # The port your Node.js app will run on. Nginx will forward requests to this port.
    PORT=3001

    # Set the environment to production.
    NODE_ENV=production

    # A strong, unique secret for signing JSON Web Tokens (JWT).
    # Generate one with: openssl rand -base64 32
    JWT_SECRET=paste_your_strong_random_secret_here

    # CRITICAL: This is a security feature. Set it to your exact frontend domain.
    # This tells the backend to only accept API requests from your website.
    CORS_ORIGIN=https://abexch.live
    ```

### Step 2: Deploy the Backend with PM2

1.  **Clone your repository** on the server if you haven't already.
2.  **Install backend dependencies:**
    ```bash
    cd <your_repository_folder>/backend
    npm install
    ```
3.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```
4.  **Start the server with PM2:**
    This command starts your app, names the process "ababa-backend", and ensures it restarts automatically.
    ```bash
    pm2 start dist/server.js --name "ababa-backend"
    ```
5.  **Verify and Save the Process:**
    ```bash
    pm2 list          # Check that 'ababa-backend' is online
    pm2 startup       # Generates a command to run, enabling PM2 on server boot
    # (run the generated command)
    pm2 save          # Saves the current process list for reboot
    ```

### Step 3: Build and Deploy the Frontend

1.  **Install `esbuild` globally on your server:**
    ```bash
    sudo npm install -g esbuild
    ```
2.  **Navigate to the project root directory.**
3.  **Build the frontend application:**
    This bundles your React app into a single production-ready JavaScript file.
    ```bash
    esbuild index.tsx --bundle --outfile=dist/bundle.js --loader:.tsx=tsx --define:process.env.NODE_ENV='\"production\"' --minify
    ```
4.  **Update `index.html` to use the bundle:**
    Open `index.html` and change the final `<script>` tag:
    -   **From:** `<script type="module" src="/index.tsx"></script>`
    -   **To:**   `<script src="/bundle.js" defer></script>`
5.  **Move the build files to the Nginx web root:**
    ```bash
    # Create the directory for your site
    sudo mkdir -p /var/www/abexch.live/html

    # Copy the necessary files
    sudo cp index.html /var/www/abexch.live/html/
    sudo cp dist/bundle.js /var/www/abexch.live/html/
    ```

### Step 4: Configure Nginx as a Reverse Proxy

1.  **Create a new Nginx configuration file:**
    ```bash
    sudo nano /etc/nginx/sites-available/abexch.live
    ```
2.  **Paste the following configuration.** Comments explain each part.
    ```nginx
    server {
        listen 80;
        server_name abexch.live www.abexch.live;

        # This block is for initial setup and SSL certificate generation.
        # It will redirect all HTTP traffic to HTTPS once SSL is enabled.
        location / {
            return 310 https://$host$request_uri;
        }
    }

    server {
        # This is the main server block for your application.
        # Update this to 'listen 443 ssl http2;' after setting up SSL.
        listen 443 ssl http2;
        server_name abexch.live www.abexch.live;

        # --- SSL Configuration (Certbot will manage this) ---
        # ssl_certificate /etc/letsencrypt/live/abexch.live/fullchain.pem;
        # ssl_certificate_key /etc/letsencrypt/live/abexch.live/privkey.pem;
        # include /etc/letsencrypt/options-ssl-nginx.conf;
        # ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

        # Path to your static frontend files.
        root /var/www/abexch.live/html;
        index index.html;

        # --- Reverse Proxy for API Calls ---
        # This rule forwards any request starting with /api/ to your backend server.
        location /api/ {
            proxy_pass http://localhost:3001/api/; # Note the trailing slash
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
        }

        # --- Rule for the React Single-Page Application ---
        # This ensures that refreshing a page like /user/dashboard works correctly.
        # It tries to find a file, then a directory, and if not found, falls back to index.html.
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
    ```
3.  **Enable the site and restart Nginx:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/abexch.live /etc/nginx/sites-enabled/
    sudo nginx -t          # Test configuration for errors
    sudo systemctl restart nginx
    ```

### Step 5: Secure with SSL (Let's Encrypt)

1.  **Ensure your firewall allows HTTPS traffic:**
    ```bash
    sudo ufw allow 'Nginx Full'
    ```
2.  **Install Certbot:**
    ```bash
    sudo apt update
    sudo apt install certbot python3-certbot-nginx
    ```
3.  **Obtain and install the SSL certificate:**
    Certbot will automatically edit your Nginx config.
    ```bash
    sudo certbot --nginx -d abexch.live -d www.abexch.live
    ```
    When prompted, choose to **redirect all HTTP traffic to HTTPS**.

---

## 3. API Endpoint Documentation

All endpoints are prefixed with `/api`.

### Public Routes

| Method | Endpoint         | Description                               |
| :----- | :--------------- | :---------------------------------------- |
| `POST` | `/login`         | Authenticates a user, dealer, or admin.   |
| `GET`  | `/results`       | Fetches all declared draw results.        |

### User Routes

| Method | Endpoint                 | Description                               |
| :----- | :----------------------- | :---------------------------------------- |
| `GET`  | `/users/:userId/bets`    | Fetches the bet history for a user.       |
| `GET`  | `/users/:userId/transactions` | Fetches the transaction history for a user. |
| `POST` | `/bets`                  | Places one or more new bets.              |

### Dealer Routes (Requires Dealer Auth)

| Method | Endpoint                         | Description                               |
| :----- | :------------------------------- | :---------------------------------------- |
| `GET`  | `/dealer/users`                  | Gets all users managed by the dealer.     |
| `POST` | `/dealer/users`                  | Creates a new user under the dealer.      |
| `POST` | `/dealer/users/:userId/credit`   | Adds credit to a user's wallet.           |
| `GET`  | `/dealer/bets`                   | Fetches all bets placed by the dealer's users. |
| `POST` | `/dealer/top-up`                 | Submits a wallet top-up request to the admin. |
| `GET`  | `/dealer/commissions/pending`    | Gets pending commissions for the dealer.  |

### Admin Routes (Requires Admin Auth)

| Method | Endpoint                         | Description                               |
| :----- | :------------------------------- | :---------------------------------------- |
| `GET`  | `/admin/users`                   | Gets all users on the platform.           |
| `GET`  | `/admin/dealers`                 | Gets all dealers on the platform.         |
| `POST` | `/admin/dealers`                 | Creates a new dealer.                     |
| `POST` | `/admin/users/:userId/credit`    | Adds credit directly to a user's wallet.  |
| `POST` | `/admin/dealers/:dealerId/credit` | Adds credit to a dealer's wallet.         |
| `POST` | `/admin/draws`                   | Declares winning numbers and settles bets. |
| `GET`  | `/admin/commissions/pending`     | Gets all pending commissions.             |
| `POST` | `/admin/commissions/:id/approve` | Approves a specific commission.           |
| `GET`  | `/admin/prizes/pending`          | Gets all pending prize payouts.           |
| `POST` | `/admin/prizes/:id/approve`      | Approves a specific prize payout.         |
| `GET`  | `/admin/top-ups/pending`         | Gets all pending dealer top-up requests.  |
| `POST` | `/admin/top-ups/:id/approve`     | Approves a specific top-up request.       |
| `POST` | `/admin/debit`                   | Debits funds from a user/dealer's wallet. |

### Universal Authenticated Routes

| Method | Endpoint         | Description                   |
| :----- | :--------------- | :---------------------------- |
| `GET`  | `/users/:userId` | Fetches details for any user. |
