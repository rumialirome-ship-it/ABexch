# A-BABA Exchange

A-BABA Exchange is a modern web application for an online betting platform. It features a sleek, dark-themed UI and facilitates 2-Digit and 1-Digit games with a multi-role system for Admins, Dealers, and Users.

This guide provides instructions for deploying the application to a Virtual Private Server (VPS).

## Understanding the Application Architecture

It's important to understand how the different parts of this application work together. This is a secure and standard setup for modern web applications.

1.  **Frontend (React):** This is the user interface that runs in the user's browser. It is built into static files (`index.html`, `bundle.js`). It **does not contain any secret API keys**. When it needs data, it makes requests to its own server at a relative path, like `/api/login`.

2.  **Nginx (Web Server & Reverse Proxy):** Nginx has two jobs:
    *   It serves the static frontend files to the user.
    *   It acts as a gateway. When it receives a request for `/api/...`, it intelligently forwards (proxies) that request to your backend server running internally on port 3001.

3.  **Backend (Node.js / Express):** This is the secure "engine" of your application.
    *   It listens on port 3001 for requests from Nginx.
    *   It connects to the PostgreSQL database.
    *   **This is where all secret API keys would be stored** (in the `backend/.env` file). If you needed to connect to an external service (like a payment gateway or SMS provider), the backend code would securely use the key from the `.env` file.

This setup ensures that no sensitive information is ever exposed in the frontend code that users can see.

---

## Deployment to VPS

> **🔒 Security Best Practice:** Never commit secret keys, passwords, or other sensitive credentials directly into your source code (e.g., in `.js`, `.ts`, or `README.md` files). Always use environment variables, as described in Step 6.

Follow these steps to get your application running in a production environment on a Linux-based VPS (e.g., Ubuntu).

### 1. Prerequisites on the VPS

Ensure you have the following software installed on your server.

-   **Git:** For cloning the repository.
-   **Node.js & npm:** (Version 16.x or newer is recommended).
-   **PM2:** A process manager for Node.js to keep your application running.
    ```bash
    sudo npm install pm2 -g
    ```
-   **Nginx:** A web server and reverse proxy.
    ```bash
    sudo apt update && sudo apt install nginx -y
    ```
-   **PostgreSQL Server:** The database for the application.
    ```bash
    sudo apt update && sudo apt install postgresql postgresql-contrib -y
    ```

### 2. Clone the Repository

Clone your project's source code onto the VPS.

```bash
git clone <your-repository-url>
cd <your-project-directory>
```

### 3. Build the Frontend

The React frontend is built using a local version of `esbuild` managed by `npm`.

1.  **Install frontend dependencies:**
    From the project's root directory, run:
    ```bash
    npm install
    ```

2.  **Build the application:**
    ```bash
    npm run build
    ```
    This command bundles the frontend into a single file at `dist/bundle.js`. The `index.html` file is already configured to use this bundle, so no manual changes are needed.

### 4. Set Up the Backend Application

Navigate to the backend directory and install its dependencies.

```bash
cd backend
npm install
```

### 5. Set Up the Backend Database (PostgreSQL)

Log in to PostgreSQL to create a dedicated database and user for the application.

1.  **Switch to the `postgres` user:**
    To perform database operations, first switch to the `postgres` system user.

    ```bash
    # Your prompt should look something like: root@vps:~#
    sudo su - postgres
    ```
    > **Note:** Make sure there is a space between `su`, `-`, and `postgres`.

2.  **Create the Database and User:**
    After running the command above, your prompt will change. Now, start the PostgreSQL command-line tool.

    ```bash
    # Your prompt should now look like: postgres@vps:~$
    psql
    ```
    Execute the following SQL commands inside the `psql` prompt. Replace `'your_strong_password'` with a secure password.

    ```sql
    -- Your prompt will now be: postgres=#
    CREATE DATABASE ababa_db;
    CREATE USER ababa_user WITH ENCRYPTED PASSWORD 'your_strong_password';
    GRANT ALL PRIVILEGES ON DATABASE ababa_db TO ababa_user;
    \q
    ```
    The `\q` command will exit `psql` and return you to the `postgres` user's shell.

3.  **Import the Database Schema:**
    While still in the `postgres` user's shell, run the following command to create the application's tables. **Use the full path** to your `schema.sql` file.

    ```bash
    # Ensure you are still the postgres user (postgres@vps:~$)
    # Replace the path with the actual location of your project
    psql -d ababa_db -f /path/to/your/project/backend/src/db/schema.sql
    ```
    This command is **safe to run multiple times**. It creates all required tables and ensures a default **admin** user exists. If you ever forget the admin password, running this script again will reset it.

    The default login credentials for the admin are:
    -   **Username:** `admin`
    -   **PIN:** `Admin@123`

    **Security Warning:** You should log in and change this default password immediately after deployment.

4.  **Return to the root user:**
    Once the schema is imported, you can return to your original shell:
    ```bash
    exit
    ```

### 6. Configure Environment Variables

Create a `.env` file inside the `backend` directory. This file stores sensitive configuration details and is the **correct place for your API keys**.

```bash
# Still inside the 'backend' directory
nano .env
```

Paste the following content into the file, **replacing the placeholder values with your actual database credentials**.

```env
# Backend Server Port
PORT=3001

# Frontend URL for CORS. This MUST use https once SSL is configured.
CORS_ORIGIN=https://abexch.live

# PostgreSQL Database Connection URL
# Use the database credentials you created in Step 5.
DATABASE_URL="postgresql://ababa_user:your_strong_password@localhost:5432/ababa_db"

# --- API KEY CONFIGURATION ---
# This is the correct and secure place for any external API keys.
# Do NOT store keys in the README or any other source code file.
#
# If your application needs to connect to an external API (e.g., for SMS, payments, etc.),
# uncomment the line below and paste your key. You will also need to update the backend code to
# read this variable using `process.env.EXTERNAL_API_KEY`.
#
# EXTERNAL_API_KEY="paste_your_api_key_here"
```

Save the file (in `nano`, press `CTRL+X`, then `Y`, then `Enter`).

### 7. Build and Start the Backend with PM2

Now, build the TypeScript backend and start it using PM2.

```bash
# This assumes you are already in the 'backend' directory

# Build the TypeScript code into JavaScript
npm run build

# Start the application with PM2
pm2 start dist/server.js --name "ababa-backend"

# Save the process list to restart on server reboot
pm2 save
```

Your backend is now running. It's only accessible directly via port 3001. The next step is to configure Nginx to make it accessible through your domain.

### 8. Configure Nginx and Secure with SSL

#### A. Copy Frontend Files and Configure Nginx

1.  **Create a web directory and copy frontend files:**
    From your project's root directory:
    ```bash
    # Create a directory for your site
    sudo mkdir -p /var/www/abexch.live
    
    # Copy the necessary frontend files
    sudo cp index.html dist/bundle.js /var/www/abexch.live/
    ```

2.  **Create an Nginx configuration file:**
    ```bash
    sudo nano /etc/nginx/sites-available/abexch.live
    ```

3.  **Paste the following configuration.** This serves your frontend and forwards API requests to your backend on port 3001.
    ```nginx
    server {
        listen 80;
        server_name abexch.live www.abexch.live;

        root /var/www/abexch.live;
        index index.html;

        # Forward API requests to your backend
        location /api/ {
            proxy_pass http://localhost:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Handle client-side routing for React
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
    ```

4.  **Enable the site and restart Nginx:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/abexch.live /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

At this point, you should be able to access your site at `http://abexch.live`.

#### B. Adding SSL with Let's Encrypt (HTTPS)

1.  **Install Certbot:**
    ```bash
    sudo apt update
    sudo apt install certbot python3-certbot-nginx -y
    ```

2.  **Run Certbot.** It will automatically obtain a certificate and update your Nginx configuration for HTTPS.
    ```bash
    sudo certbot --nginx -d abexch.live -d www.abexch.live
    ```
    Follow the on-screen prompts, choosing to **redirect all HTTP traffic to HTTPS**. Your site will now be secure and accessible at `https://abexch.live`. Remember to update your `CORS_ORIGIN` in the `.env` file to use `https`.

### 9. Managing the Application

Here are some useful PM2 commands:

-   **List running processes:** `pm2 list`
-   **View real-time logs:** `pm2 logs ababa-backend`
-   **Restart the application:** `pm2 restart ababa-backend`
-   **Stop the application:** `pm2 stop ababa-backend`

### 10. Troubleshooting

#### Diagnosing "Nothing Happens" or Data Not Loading

If the application loads but data seems to be missing or actions don't work, follow these steps to find the problem.

1.  **Check the Backend Logs First**
    This is the most important step. Check if your backend is running and if it has any errors.
    ```bash
    pm2 logs ababa-backend
    ```
    Look for any red error messages, especially related to the database connection. If the logs say the app is crashing or in a restart loop, you must fix the error there first.

2.  **Check the Browser's Developer Console**
    -   Open your website in Chrome or Firefox.
    -   Press `F12` to open the Developer Tools.
    -   Click on the **"Console"** tab. Look for any red error messages.
    -   Click on the **"Network"** tab. Refresh the page or try to log in. Look for any rows that are red. Click on them to see the error.
        -   **CORS Error:** If you see an error about `Cross-Origin Request Blocked`, it means your `CORS_ORIGIN` in `backend/.env` is wrong. It must exactly match the URL in your browser bar (`https://abexch.live`). After changing it, you must restart the backend: `pm2 restart ababa-backend`.
        -   **502 Bad Gateway:** This means Nginx cannot talk to your backend. This usually happens if the backend isn't running. Check the PM2 logs from step 1.
        -   **404 Not Found:** This could mean your Nginx `location /api/` block is misconfigured.

3.  **Check Nginx Logs**
    If you suspect a problem with Nginx (like a 502 error), check its error log for more details:
    ```bash
    sudo tail -f /var/log/nginx/error.log
    ```

#### Error: `EADDRINUSE: address already in use :::3001`

This common error means another process is already using port 3001.

**Solution:**

1.  First, ensure any existing PM2 process for the app is stopped and deleted to get a clean start:
    ```bash
    pm2 stop ababa-backend
    pm2 delete ababa-backend
    ```

2.  Find the process that is still using the port:
    ```bash
    sudo lsof -i :3001
    ```
    This command will show you the process ID (PID) using the port.

3.  Stop the process using its PID. Replace `<PID>` with the number from the previous command's output.
    ```bash
    sudo kill -9 <PID>
    ```

4.  Now, you can safely restart your backend application with PM2 from within the `backend` directory:
    ```bash
    pm2 start dist/server.js --name "ababa-backend"
    pm2 save # Don't forget to save the process list
    ```
