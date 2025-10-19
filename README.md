# A-BABA Exchange

A-BABA Exchange is a modern web application for an online betting platform. It features a sleek, dark-themed UI and facilitates 2-Digit and 1-Digit games with a multi-role system for Admins, Dealers, and Users.

This guide provides comprehensive instructions for deploying the application to a production environment on a Virtual Private Server (VPS).

## Application Architecture Overview

Understanding the application's structure is key to a successful deployment. This is a secure, standard setup for modern web applications.

1.  **Frontend (React):** The user interface built with React. This code is compiled into static files (`index.html`, `bundle.js`) that run in the user's web browser. It makes API calls to its own server at relative paths (e.g., `/api/login`).

2.  **Nginx (Web Server & Reverse Proxy):** Nginx serves two critical functions:
    *   **Serves Static Files:** It delivers the frontend's `index.html` and `bundle.js` files to the user.
    *   **Acts as a Gateway:** When it receives a request starting with `/api/`, it securely forwards (proxies) that request to the backend Node.js server, which is not exposed to the public internet.

3.  **Backend (Node.js / Express):** The secure "engine" of the application.
    *   It runs internally, typically on port `3001`, and only accepts connections from Nginx.
    *   It securely connects to the PostgreSQL database.
    *   **It is the only part of the application that handles sensitive data** like database credentials and any external API keys, which are stored in an untracked `.env` file.

This architecture ensures that no secret keys or credentials are ever exposed in the frontend code.

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

### Step 3: Build the Frontend

The frontend is built using `esbuild`. Install the dependencies and run the build script from the **project's root directory**.

```bash
# Install root-level dependencies (like esbuild)
npm install

# Build the frontend code
npm run build
```

This creates a single file at `dist/bundle.js`, which `index.html` is already configured to use.

### Step 4: Database Configuration (PostgreSQL)

Here, we'll create a dedicated database and user for the application.

1.  **Switch to the `postgres` User:**
    To perform database setup, you must become the `postgres` system user.

    ```bash
    # Your prompt should be something like: user@vps:~$
    sudo su - postgres
    ```

2.  **Create the Database and User:**
    Your command prompt will now look like `postgres@vps:~$`. Start the PostgreSQL interactive terminal.

    ```bash
    psql
    ```

    Your prompt will change again to `postgres=#`. Execute the following SQL commands. **Replace `'your_strong_password'` with a secure password you create and save.**

    ```sql
    CREATE DATABASE ababa_db;
    CREATE USER ababa_user WITH ENCRYPTED PASSWORD 'your_strong_password';
    GRANT ALL PRIVILEGES ON DATABASE ababa_db TO ababa_user;
    \q
    ```
    The `\q` command exits `psql`.

3.  **Create Tables by Importing the Schema:**
    You are now back in the `postgres` user's shell. Run the command below to create the application's tables. You must provide the **full, absolute path** to the `schema.sql` file.

    > **Tip:** In another terminal, navigate to your project's `backend/src/db` directory and run `pwd` to get the correct full path.

    ```bash
    # Replace the path with the actual location of your project
    psql -d ababa_db -f /home/user/your-project-directory/backend/src/db/schema.sql
    ```

    This script creates all tables and also ensures a default **admin** user exists with the following credentials:
    -   **Username:** `admin`
    -   **PIN:** `Admin@123`

4.  **Return to Your User:**
    ```bash
    exit
    ```

### Step 5: Backend Configuration

Now, configure and run the backend server.

1.  **Navigate to the Backend Directory and Install Dependencies:**
    ```bash
    cd backend
    npm install
    ```

2.  **Create the Environment File (`.env`):**
    This file stores your secret credentials.

    ```bash
    nano .env
    ```

    Paste the following content into the file, replacing the placeholder values with your actual settings.

    ```env
    # Backend Server Port (should not be changed)
    PORT=3001

    # Frontend URL for CORS. This MUST match your domain EXACTLY.
    # We will set it to HTTP for now and change it to HTTPS after adding SSL.
    CORS_ORIGIN=http://your-domain.com

    # PostgreSQL Database Connection URL
    # Use the database credentials you created in Step 4.
    DATABASE_URL="postgresql://ababa_user:your_strong_password@localhost:5432/ababa_db"

    # (Optional) Google Gemini API Key for any AI features
    # This is required if the application integrates with Google's AI services.
    GEMINI_API_KEY="your_google_gemini_api_key_here"
    ```
    Save the file (`CTRL+X`, then `Y`, then `Enter`).

3.  **Build and Run with PM2:**
    Compile the TypeScript code and start the server using the PM2 process manager.

    ```bash
    # Build the TypeScript code into JavaScript
    npm run build

    # Start the application with PM2
    pm2 start dist/server.js --name "ababa-backend"

    # Save the process list to automatically restart on server reboot
    pm2 save
    ```

### Step 6: Web Server Configuration (Nginx)

Configure Nginx to serve the frontend and act as a reverse proxy for the backend.

1.  **Prepare the Web Directory:**
    Create a directory to hold your static frontend files. **Replace `your-domain.com` with your actual domain.**

    ```bash
    # Create the directory
    sudo mkdir -p /var/www/your-domain.com
    
    # Copy the frontend files into it (run from your project's root directory)
    sudo cp index.html dist/bundle.js /var/www/your-domain.com/
    ```

2.  **Create an Nginx Configuration File:**
    ```bash
    sudo nano /etc/nginx/sites-available/your-domain.com
    ```

3.  **Paste the following configuration.** Remember to replace all instances of `your-domain.com`.
    ```nginx
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;

        root /var/www/your-domain.com;
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
    Your site is now secure. The final step is to update the `.env` file to reflect this.

    ```bash
    # Navigate to the backend directory
    cd backend
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

For development or testing, you can populate the database with sample data.

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