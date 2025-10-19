# A-BABA Exchange

A-BABA Exchange is a modern web application for an online betting platform. It features a sleek, dark-themed UI and facilitates 2-Digit and 1-Digit games with a multi-role system for Admins, Dealers, and Users.

This guide provides comprehensive instructions for deploying the application to a production environment on a Virtual Private Server (VPS).

## Application Architecture Overview

Understanding the application's structure is key to a successful deployment. This is a secure, standard setup for modern web applications.

1.  **Frontend (React):** The user interface built with React. This code is compiled into static files (`index.html`, `bundle.js`) that run in the user's web browser. It makes API calls to its own server at relative paths (e.g., `/api/login`).

2.  **Nginx (Web Server & Reverse Proxy):** Nginx serves two critical functions:
    *   **Serves Static Files:** It delivers the frontend's `index.html` and `bundle.js` files to the user from `/var/www/html/ABexch`.
    *   **Acts as a Gateway:** When it receives a request starting with `/api/`, it securely forwards (proxies) that request to the backend Node.js server, which is not exposed to the public internet.

3.  **Backend (Node.js / Express):** The secure "engine" of the application.
    *   It runs internally, typically on port `3001`, and only accepts connections from Nginx.
    *   It securely connects to the PostgreSQL database.
    *   **It is the only part of the application that handles sensitive data** like database credentials and any external API keys, which are stored in an untracked `.env` file.

This architecture ensures that no secret keys or credentials are ever exposed in the frontend code.

---

## Local Development Setup

For developing on your local machine, the frontend and backend run as separate processes.

1.  **Backend Setup:**
    *   Navigate to the `backend` directory: `cd backend`
    *   Install dependencies: `npm install`
    *   Create a `.env` file from the example: `cp .env.example .env`
    *   **Edit `.env`:**
        *   Set up a local PostgreSQL database and update `DATABASE_URL`.
        *   Verify that `CORS_ORIGIN` is set to your frontend's development URL (e.g., `http://localhost:5000`).
    *   Run the database setup script (see Step 4 in Deployment Guide for creating the database and user, then run `npm run db:setup`).
    *   Start the backend development server: `npm run dev`
    *   The backend will now be running on `http://localhost:3001`.

2.  **Frontend Setup:**
    *   Navigate to the project's root directory.
    *   Install dependencies: `npm install`
    *   Start the frontend development server: `npm run dev`
    *   `esbuild` will watch for file changes and rebuild automatically. Serve the `index.html` file using a simple static server (like VS Code's Live Server extension) on the port specified in your backend `.env` file's `CORS_ORIGIN` (e.g., port 5000).

---

## Deployment Guide

> **🔒 Security First:** Never commit secret keys, passwords, or other sensitive credentials directly into your source code. Always use environment variables as described in Step 5.

### Before You Begin: Prerequisites

Before starting, ensure you have the following:

*   **A Linux VPS:** An Ubuntu 20.04 or newer server is recommended.
*   **SSH Access:** You should be able to connect to your VPS as a user with `sudo` privileges.
*   **A Domain Name:** A registered domain (e.g., `your-domain.com`) with its DNS "A" record pointing to your VPS's public IP address.

### Step 1: Server Setup

First, install all the necessary software on your VPS.

```bash
# Update your package list
sudo apt update && sudo apt upgrade -y

# Install Git, Nginx, and PostgreSQL
sudo apt install git nginx postgresql postgresql-contrib -y

# Install Node.js (we'll use nvm for easy version management)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
nvm install --lts
nvm use --lts

# Install PM2 globally to manage the backend process
npm install pm2 -g
```

### Step 2: Get the Application Code

Clone your project's repository onto the VPS.

```bash
git clone <your-repository-url>
cd <your-project-directory>
```

### Step 3: Build the Frontend Application

The frontend is built using `esbuild`. This command compiles all the React/TypeScript source code into a single, efficient JavaScript file (`dist/bundle.js`) that browsers can run.

Run this command from the **project's root directory**.

```bash
# Install root-level dependencies (like esbuild)
npm install

# Build the frontend code
npm run build
```

### Step 4: Database Configuration (PostgreSQL)

Here, we'll create a dedicated database and user for the application, then run a simple command to set up all the necessary tables.

1.  **Create the Database and User (One-Time Setup):**
    First, you need to access the PostgreSQL shell to create the database and a user for it. You only need to do this part once.

    ```bash
    # Become the 'postgres' superuser
    sudo -i -u postgres
    
    # Enter the psql command-line tool
    psql
    ```

    Now, inside `psql` (your prompt will be `postgres=#`), run these commands. **Create a secure password and save it for Step 5.**

    ```sql
    CREATE DATABASE ababa_db;
    CREATE USER ababa_user WITH ENCRYPTED PASSWORD 'your_strong_password';
    GRANT ALL PRIVILEGES ON DATABASE ababa_db TO ababa_user;
    
    -- Exit psql and the postgres user shell
    \q
    exit
    ```

2.  **Run the Automatic Setup Script:**
    With the database and user ready, you can now run a simple command that will automatically create all the required tables for the application.

    First, **make sure you have created your `.env` file** in the `backend` directory as described in Step 5, because the script needs it to connect to the database.

    Then, from the `backend` directory, run:
    ```bash
    # Navigate to the backend directory
    cd /path/to/your-project/backend
    
    # Run the setup script
    npm run db:setup
    ```

    You should see messages confirming the connection and that the schema was created successfully. This process creates all tables and ensures a default **admin** user exists with the credentials: **Username:** `admin`, **PIN:** `Admin@123`.

### Step 5: Backend Configuration

Now, configure and run the backend server.

1.  **Install Backend Dependencies:**
    If you are not already there, navigate to the backend directory and install its dependencies.
    ```bash
    # If not already there: cd /path/to/your-project/backend
    npm install
    ```

2.  **Create the Environment File (`.env`):**
    This file stores your secret credentials. It is crucial that this file is **never** committed to Git.

    ```bash
    nano .env
    ```

    Paste the following content, replacing the placeholder values with your actual settings.

    ```env
    # Backend Server Port (do not change unless necessary)
    PORT=3001

    # Frontend URL for CORS. This MUST match your domain EXACTLY.
    # Set to HTTP for now; we'll change it to HTTPS after adding SSL.
    CORS_ORIGIN=http://your-domain.com

    # PostgreSQL Database Connection URL
    # Use the database credentials you created in Step 4.
    DATABASE_URL="postgresql://ababa_user:your_strong_password@localhost:5432/ababa_db"
    
    # Your Google Gemini API Key
    API_KEY="your_gemini_api_key_here"
    ```
    Save the file (`CTRL+X`, then `Y`, then `Enter`).

3.  **Build and Run with PM2:**
    Compile the TypeScript code and start the server using the PM2 process manager, which keeps it running in the background.

    ```bash
    # Build the TypeScript code into JavaScript
    npm run build

    # Start the application with PM2
    pm2 start dist/server.js --name "ababa-backend"

    # Save the process list to automatically restart on server reboot
    pm2 save
    ```

### Step 6: Web Server Configuration (Nginx)

Configure Nginx to serve the frontend from `/var/www/html/ABexch` and act as a reverse proxy for the backend.

1.  **Prepare the Web Directory:**
    Create the directory and copy your static frontend files into it. **Run these commands from your project's root directory.**

    ```bash
    # Create the directory
    sudo mkdir -p /var/www/html/ABexch
    
    # Copy the built frontend files
    sudo cp index.html dist/bundle.js /var/www/html/ABexch/
    ```

2.  **Create an Nginx Configuration File:**
    ```bash
    sudo nano /etc/nginx/sites-available/your-domain.com
    ```

3.  **Paste the following configuration.** Remember to replace all instances of `your-domain.com` and verify the `root` path.
    ```nginx
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;

        root /var/www/html/ABexch; # <-- IMPORTANT: Use the new path here
        index index.html;

        # Forward all requests starting with /api/ to your backend server
        location /api/ {
            proxy_pass http://localhost:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # This allows React Router to handle all other routes
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
    ```

4.  **Enable the Site and Restart Nginx:**
    ```bash
    # Link the config to the 'sites-enabled' directory
    sudo ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/
    
    # Test for syntax errors
    sudo nginx -t
    
    # Restart Nginx to apply changes
    sudo systemctl restart nginx
    ```

Your site should now be accessible at `http://your-domain.com`.

### Step 7: Secure with SSL (Let's Encrypt)

1.  **Install Certbot:**
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```

2.  **Run Certbot.** It will automatically obtain a certificate and update your Nginx configuration.
    ```bash
    sudo certbot --nginx -d your-domain.com -d www.your-domain.com
    ```
    Follow the on-screen prompts. When asked, choose the option to **redirect all HTTP traffic to HTTPS**.

3.  **Final `.env` Update:**
    Your site is now secure. The final step is to update the backend's `.env` file to accept requests from the HTTPS URL.

    ```bash
    # Navigate to the backend directory
    cd /path/to/your-project/backend
    nano .env
    ```

    Change `CORS_ORIGIN` to use `https`:
    ```env
    # Before: CORS_ORIGIN=http://your-domain.com
    # After:
    CORS_ORIGIN=https://your-domain.com
    ```
    Save the file, then restart the backend for the change to take effect:
    ```bash
    pm2 restart ababa-backend
    ```

**Deployment is complete!** You can now access your application at `https://your-domain.com`.

### Optional: Seeding the Database

For development or testing, you can populate the database with sample data. **Make sure you have configured your `backend/.env` file first.**

1.  **Ensure you are in the `backend` directory.**
2.  **Run the seed script:**
    ```bash
    npm run db:seed
    ```
    This adds a sample admin, dealer, and user.

### Managing the Application

-   **List running apps:** `pm2 list`
-   **View real-time logs:** `pm2 logs ababa-backend`
-   **Restart the app:** `pm2 restart ababa-backend`
-   **Stop the app:** `pm2 stop ababa-backend`

### Troubleshooting

-   **502 Bad Gateway:** Your backend is likely not running. Check `pm2 logs ababa-backend` for errors.
-   **Data Not Loading / CORS Error:** The `CORS_ORIGIN` in your `backend/.env` file does not exactly match the URL in your browser (`https://your-domain.com`). Remember to restart the backend with `pm2 restart ababa-backend` after changing it.
-   **Database Connection Error:** Check the `DATABASE_URL` in `backend/.env`. Ensure the username, password, and database name are correct and that the PostgreSQL service is running (`sudo systemctl status postgresql`).
-   **404 Not Found on Page Refresh:** This usually means your Nginx `location /` block is misconfigured. Ensure the `try_files $uri $uri/ /index.html;` line is present.