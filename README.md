# A-BABA Exchange

A-BABA Exchange is a modern web application for an online betting platform. It features a sleek, dark-themed UI and facilitates 2-Digit and 1-Digit games with a multi-role system for Admins, Dealers, and Users.

This guide provides instructions for deploying the application to a Virtual Private Server (VPS).

## Deployment to VPS

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
-   **esbuild:** A fast JavaScript bundler for building the frontend.
    ```bash
    sudo npm install -g esbuild
    ```

### 2. Clone the Repository

Clone your project's source code onto the VPS.

```bash
git clone <your-repository-url>
cd <your-project-directory>
```

### 3. Build the Frontend

The React frontend needs to be compiled into static JavaScript files.

1.  **Build the application:**
    ```bash
    # This command bundles the frontend code into a single file
    esbuild index.tsx --bundle --outfile=dist/bundle.js --loader:.tsx=tsx --define:process.env.NODE_ENV='\"production\"' --minify
    ```
    This creates a `dist/bundle.js` file.

2.  **Update `index.html` to use the built file:**
    Open the `index.html` file for editing.
    ```bash
    nano index.html
    ```
    -   Find the line at the bottom: `<script type="module" src="/index.tsx"></script>`
    -   **Replace it with:** `<script src="/bundle.js" defer></script>`
    -   Save the file (in `nano`, press `CTRL+X`, then `Y`, then `Enter`).

### 4. Set Up the Backend Application

Navigate to the backend directory and install its dependencies.

```bash
cd backend
npm install
```

### 5. Set Up the Backend Database (PostgreSQL)

Log in to PostgreSQL to create a dedicated database and user for the application.

1.  **Access the PostgreSQL command line:**
    ```bash
    sudo -u postgres psql
    ```

2.  **Execute the following SQL commands.** Replace `'your_strong_password'` with a secure password.
    ```sql
    CREATE DATABASE ababa_db;
    CREATE USER ababa_user WITH ENCRYPTED PASSWORD 'your_strong_password';
    GRANT ALL PRIVILEGES ON DATABASE ababa_db TO ababa_user;
    \q
    ```

3.  **Import the database schema.** Run this command from your project's root directory. It will create all the necessary tables.
    ```bash
    sudo -u postgres psql -d ababa_db -f backend/db/schema.sql
    ```
    This command is **safe to run multiple times**. It will create all required tables and ensure a default **admin** user exists. If you ever forget the admin password, running this script again will reset it.

    The default login credentials for the admin are:
    -   **Username:** `admin`
    -   **PIN:** `Admin@123`

    **Security Warning:** You should log in and change this default password immediately after deployment.

### 6. Configure Environment Variables

Create a `.env` file inside the `backend` directory. This file stores sensitive configuration details.

```bash
# Still inside the 'backend' directory
nano .env
```

Paste the following content into the file, **replacing the placeholder values with your actual domain and database credentials**.

```env
# Backend Server Port
PORT=3001

# Frontend URL for CORS (use https after setting up SSL)
CORS_ORIGIN=http://your_domain.com

# PostgreSQL Database Connection URL
# Use the database credentials you created in Step 5.
DATABASE_URL="postgresql://ababa_user:your_strong_password@localhost:5432/ababa_db"
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
    ```bash
    # Go back to the project root
    cd .. 
    
    # Create a directory for your site
    sudo mkdir -p /var/www/your_domain.com
    
    # Copy the necessary frontend files
    sudo cp index.html dist/bundle.js /var/www/your_domain.com/
    ```

2.  **Create an Nginx configuration file:**
    ```bash
    sudo nano /etc/nginx/sites-available/your_domain.com
    ```

3.  **Paste the following configuration.** This serves your frontend and forwards API requests to your backend on port 3001.
    ```nginx
    server {
        listen 80;
        server_name your_domain.com www.your_domain.com;

        root /var/www/your_domain.com;
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
    sudo ln -s /etc/nginx/sites-available/your_domain.com /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

At this point, you should be able to access your site at `http://your_domain.com`.

#### B. Adding SSL with Let's Encrypt (HTTPS)

1.  **Install Certbot:**
    ```bash
    sudo apt update
    sudo apt install certbot python3-certbot-nginx -y
    ```

2.  **Run Certbot.** It will automatically obtain a certificate and update your Nginx configuration for HTTPS.
    ```bash
    sudo certbot --nginx -d your_domain.com -d www.your_domain.com
    ```
    Follow the on-screen prompts, choosing to **redirect all HTTP traffic to HTTPS**. Your site will now be secure and accessible at `https://your_domain.com`. Remember to update your `CORS_ORIGIN` in the `.env` file to use `https`.

### 9. Managing the Application

Here are some useful PM2 commands:

-   **List running processes:** `pm2 list`
-   **View real-time logs:** `pm2 logs ababa-backend`
-   **Restart the application:** `pm2 restart ababa-backend`
-   **Stop the application:** `pm2 stop ababa-backend`
