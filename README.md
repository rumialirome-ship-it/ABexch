# A-BABA EXCHANGE - Deployment Guide

This guide provides step-by-step instructions to deploy the A-BABA EXCHANGE application on a Virtual Private Server (VPS) running Ubuntu with Nginx.

## Prerequisites

Before you begin, ensure you have the following:
- A VPS running Ubuntu 20.04 or later.
- A domain name (e.g., `abexch.live`) pointed to your VPS's IP address.
- SSH access to your VPS with `sudo` privileges.
- Node.js (v18 or later) and npm installed on your server.
- Git installed on your server.
- Nginx installed (`sudo apt install nginx`).
- PM2, a process manager for Node.js, installed globally (`sudo npm install -g pm2`).

---

### 🚨 IMPORTANT SECURITY NOTICE 🚨

**NEVER** hard-code API keys, passwords, or any other secrets directly into your source code or commit them to a Git repository.

The best practice is to use **environment variables**. The backend application is configured to read secrets from `process.env`. On your server, you will create a `.env` file to manage these variables. This file **must not** be committed to your repository.

---

## Deployment Process Overview

The deployment involves four main parts:
1.  **Setting up Environment Variables:** Securely configuring your backend.
2.  **Deploying the Backend:** Running the Node.js/Express API server using PM2.
3.  **Building and Deploying the Frontend:** Placing the static React application files where Nginx can serve them.
4.  **Configuring Nginx:** Setting up Nginx to serve the frontend and act as a reverse proxy to route API requests to the backend.

### Step 1: Set Up Environment Variables

On your server, you need to create a `.env` file inside the `backend` directory. This file will hold all your production-specific configuration and secrets.

1.  **Navigate to the backend directory:**
    ```bash
    cd <your_repository_folder>/backend
    ```

2.  **Create the `.env` file from the example:**
    A `.env.example` file is provided as a template. Copy it to create your local `.env` configuration file.
    ```bash
    cp .env.example .env
    ```

3.  **Edit the `.env` file:**
    Open the file in a text editor like `nano` and add your production values.
    ```bash
    nano .env
    ```
    It is **critical** that you set the following variables:
    - `JWT_SECRET`: You must generate a strong, random secret. Use this command in your terminal to create one, then copy the output into the file:
      ```bash
      openssl rand -base64 32
      ```
    - `CORS_ORIGIN`: This must be the exact URL of your frontend application (e.g., `https://abexch.live`).

### Step 2: Deploy the Backend

Now, we'll set up and run the backend API server.

1.  **SSH into your server:**
    ```bash
    ssh your_username@your_server_ip
    ```

2.  **Clone your repository:**
    If you haven't already, clone your project onto the server.
    ```bash
    git clone <your_repository_url>
    cd <your_repository_folder>
    ```

3.  **Install backend dependencies:**
    Navigate to the `backend` directory and install the required Node.js packages.
    ```bash
    cd backend
    npm install
    ```

4.  **Build the backend code:**
    The backend is written in TypeScript and needs to be compiled into JavaScript.
    ```bash
    npm run build
    ```
    This creates a `dist` directory with the compiled `.js` files.

5.  **Run the backend with PM2:**
    PM2 will manage your backend process, keeping it running continuously and restarting it if it crashes. `dotenv` will automatically load the `.env` file we created.
    ```bash
    pm2 start dist/server.js --name "ababa-backend"
    ```
    Your backend is now running on `http://localhost:3001`. This port does not conflict with your other application on port 5000.

6.  **Verify the backend is running:**
    ```bash
    pm2 list
    # You should see 'ababa-backend' with a status of 'online'.
    # You can view logs with: pm2 logs ababa-backend
    ```

7.  **Enable PM2 to start on server reboot:**
    ```bash
    pm2 startup
    # Follow the instructions provided by the command to complete setup.
    pm2 save
    ```

### Step 3: Build and Deploy the Frontend

The frontend needs to be "built" into static HTML, CSS, and JavaScript files that Nginx can serve directly. Since the project doesn't have a root `package.json` with a build script, you will need a tool like `esbuild` to bundle the application.

1.  **Install `esbuild` globally (if not already installed):**
    ```bash
    sudo npm install -g esbuild
    ```

2.  **Navigate to the project root directory:**
    ```bash
    # From the 'backend' directory
    cd .. 
    ```

3.  **Build the frontend application:**
    Run the following command to bundle `index.tsx` into a single JavaScript file named `bundle.js`.
    ```bash
    esbuild index.tsx --bundle --outfile=dist/bundle.js --loader:.tsx=tsx --define:process.env.NODE_ENV='\"production\"'
    ```
    This will create a `dist` directory containing your `bundle.js` file.

4.  **Update `index.html` to use the bundle:**
    You need to change the script tag in `index.html` to load the bundled file instead of the source `tsx` file.
    Open `index.html` and change the last script tag from:
    `<script type="module" src="/index.tsx"></script>`
    to:
    `<script src="/bundle.js"></script>`

5.  **Move the build files to the Nginx web root:**
    Create a directory for your site and copy the necessary static files into it.
    ```bash
    # Create the directory
    sudo mkdir -p /var/www/abexch.live/html

    # Copy the modified index.html and the bundled JS
    sudo cp index.html /var/www/abexch.live/html/
    sudo cp dist/bundle.js /var/www/abexch.live/html/
    ```

### Step 4: Configure Nginx

Nginx will serve your frontend files and forward any API requests (those starting with `/api`) to your backend server running on port 3001.

1.  **Create a new Nginx configuration file:**
    ```bash
    sudo nano /etc/nginx/sites-available/abexch.live
    ```

2.  **Paste the following configuration into the file.** This configuration handles both serving the static frontend and reverse-proxying API calls.

    ```nginx
    server {
        listen 80;
        server_name abexch.live www.abexch.live;

        # Redirect all HTTP traffic to HTTPS (recommended after setting up SSL)
        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        # If you set up SSL, change this line to: listen 443 ssl;
        listen 443 ssl http2;
        server_name abexch.live www.abexch.live;

        # SSL Configuration (Certbot will manage this)
        # ssl_certificate /etc/letsencrypt/live/abexch.live/fullchain.pem;
        # ssl_certificate_key /etc/letsencrypt/live/abexch.live/privkey.pem;
        # include /etc/letsencrypt/options-ssl-nginx.conf;
        # ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

        # Path to your frontend files
        root /var/www/abexch.live/html;
        index index.html;

        # Location block for the API reverse proxy
        # This forwards any request starting with /api/ to your backend server.
        location /api/ {
            proxy_pass http://localhost:3001/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_cache_bypass $http_upgrade;
        }

        # Location block to serve the static frontend files (React SPA)
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
    ```

3.  **Enable the site and test the configuration:**
    ```bash
    # Create a symbolic link to enable the site
    sudo ln -s /etc/nginx/sites-available/abexch.live /etc/nginx/sites-enabled/

    # Test for syntax errors
    sudo nginx -t
    ```
    If the test is successful, restart Nginx.

4.  **Restart Nginx to apply the changes:**
    ```bash
    sudo systemctl restart nginx
    ```

### Step 5: Set up SSL with Let's Encrypt (Highly Recommended)

1.  **Install Certbot:**
    ```bash
    sudo apt update
    sudo apt install certbot python3-certbot-nginx
    ```

2.  **Obtain and install the SSL certificate:**
    Certbot will automatically edit your Nginx configuration file to install the certificate and set up HTTPS.
    ```bash
    sudo certbot --nginx -d abexch.live -d www.abexch.live
    ```
    Follow the on-screen prompts. Choose the option to **redirect all HTTP traffic to HTTPS**.

3.  **Verify auto-renewal:**
    Certbot sets up a cron job to automatically renew your certificate. You can test it with:
    ```bash
    sudo certbot renew --dry-run
    ```

---

**Congratulations!** Your A-BABA EXCHANGE application should now be live, secure, and accessible at `https://abexch.live`.
