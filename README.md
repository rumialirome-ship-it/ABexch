# A-BABA Exchange: VPS Deployment Guide

This is a streamlined guide for deploying the A-BABA Exchange application to a production environment on an Ubuntu 22.04 VPS for the domain `abexch.live`.

> **🔒 Security First:** Never commit secret keys, passwords, or other sensitive credentials directly into your source code. Always use the `backend/.env` file, which is ignored by Git.

### **Prerequisites**

Before starting, ensure you have:

*   **An Ubuntu 22.04 VPS.**
*   **SSH Access** as a user with `sudo` privileges.
*   The domain **`abexch.live`** (and `www.abexch.live`) with its DNS "A" records pointing to your VPS's public IP address.

---

### **Step 1: Prepare Your Server**

First, install all the necessary software on your VPS. Run these commands one by one.

```bash
# Update your package list
sudo apt update && sudo apt upgrade -y

# Install Git, Nginx, and PostgreSQL
sudo apt install git nginx postgresql postgresql-contrib -y

# Install Node.js Version Manager (nvm) and the latest LTS Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install --lts

# Install PM2 globally to manage the backend process
npm install pm2 -g
```
> **Note:** You may need to close and reopen your terminal session for the `nvm` command to become available.

---

### **Step 2: Set Up the Database**

Here, we'll create a dedicated database and a user for the application.

1.  **Log in to PostgreSQL:**
    ```bash
    sudo -i -u postgres
    psql
    ```

2.  **Run the following SQL commands inside the `psql` shell.** Create a secure password and save it for Step 4.

    ```sql
    CREATE DATABASE ababa_db;
    CREATE USER ababa_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';
    GRANT ALL PRIVILEGES ON DATABASE ababa_db TO ababa_user;
    \q
    exit
    ```

---

### **Step 3: Deploy the Application Code**

Clone the project from your repository and build the necessary files.

```bash
# Clone your project's repository onto the VPS
git clone <your-repository-url> abexch

# Navigate into the project's root directory
cd abexch

# Install frontend dependencies and build the static files
npm install
npm run build

# Navigate to the backend and install its dependencies
cd backend
npm install
```

---

### **Step 4: Configure the Backend**

Create a `.env` file to securely store your application's secrets.

1.  **Create the `.env` file:**
    ```bash
    # Make sure you are in the /backend directory
    nano .env
    ```

2.  **Paste the following content.**
    *   Replace `your_strong_password_here` with the password you created in Step 2.
    *   Add your Gemini `API_KEY`.

    ```env
    # Backend Server Port
    PORT=3001

    # Frontend URL for CORS. We'll add 'https' later.
    CORS_ORIGIN=http://www.abexch.live

    # PostgreSQL Database Connection URL
    DATABASE_URL="postgresql://ababa_user:your_strong_password_here@localhost:5432/ababa_db"
    
    # Your Google Gemini API Key
    API_KEY="your_gemini_api_key_here"
    ```
    Save the file by pressing `CTRL+X`, then `Y`, then `Enter`.

3.  **Set up the database tables:**
    This command reads your new `.env` file to connect to the database and create all the necessary tables.
    ```bash
    # This creates a default admin: (Username: admin, PIN: Admin@123)
    npm run db:setup
    ```

---

### **Step 5: Run the Backend with PM2**

Compile the backend's TypeScript code and start the server using PM2, which will keep it running continuously.

```bash
# Make sure you are in the /backend directory

# Build the TypeScript code into JavaScript
npm run build

# Start the application with PM2
pm2 start dist/server.js --name "ababa-backend"

# Save the process list to automatically restart on server reboot
pm2 save
```

---

### **Step 6: Configure the Nginx Web Server**

Configure Nginx to show your frontend to the world and securely communicate with your backend.

1.  **Prepare the Web Directory and Copy Files:**
    ```bash
    # Create the directory where the live site will be stored
    sudo mkdir -p /var/www/abexch.live
    
    # Navigate back to the project's root directory
    cd /var/www/html/ABexch/abexch # Adjust path if you cloned elsewhere
    
    # Copy the built frontend files to the live site directory
    sudo cp index.html /var/www/abexch.live/
    sudo cp -r dist /var/www/abexch.live/
    ```

2.  **Create an Nginx Configuration File:**
    ```bash
    sudo nano /etc/nginx/sites-available/abexch.live
    ```

3.  **Paste the following configuration.** It is already configured for your domain.
    ```nginx
    server {
        listen 80;
        server_name abexch.live www.abexch.live;

        root /var/www/abexch.live;
        index index.html;

        # Forward all requests starting with /api/ to your backend server
        location /api/ {
            proxy_pass http://localhost:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # This allows React Router to handle page refreshes correctly
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
    ```

4.  **Enable the Site and Restart Nginx:**
    ```bash
    # Link the config to the 'sites-enabled' directory to activate it
    sudo ln -s /etc/nginx/sites-available/abexch.live /etc/nginx/sites-enabled/
    
    # Test your Nginx configuration for syntax errors
    sudo nginx -t
    
    # Restart Nginx to apply the new configuration
    sudo systemctl restart nginx
    ```

Your site should now be accessible at `http://www.abexch.live`. The final step is to add SSL.

---

### **Step 7: Secure with SSL (HTTPS)**

We will use Let's Encrypt to get a free SSL certificate.

1.  **Install Certbot:**
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```

2.  **Run Certbot.** It will automatically obtain a certificate and update your Nginx configuration.
    ```bash
    sudo certbot --nginx -d abexch.live -d www.abexch.live
    ```
    Follow the on-screen prompts. When asked, **choose the option to redirect all HTTP traffic to HTTPS**.

3.  **Final `.env` Update:**
    Now that your site is secure, you must update the backend configuration to accept requests from the HTTPS URL.

    ```bash
    # Navigate back to the backend directory
    cd /var/www/html/ABexch/abexch/backend # Adjust path if needed
    nano .env
    ```

    Change `CORS_ORIGIN` to use `https`:
    ```env
    # Before: CORS_ORIGIN=http://www.abexch.live
    # After:
    CORS_ORIGIN=https://www.abexch.live
    ```
    Save the file, then restart the backend for the change to take effect:
    ```bash
    pm2 restart ababa-backend
    ```

**Deployment is complete!** Your application is now live and secure at `https://www.abexch.live`.

---

### **Managing the Application**

Use these PM2 commands to manage your running backend process.

-   **View real-time logs:** `pm2 logs ababa-backend`
-   **Restart the app after changes:** `pm2 restart ababa-backend`
-   **List all running apps:** `pm2 list`
-   **Stop the app:** `pm2 stop ababa-backend`

### **Troubleshooting**

-   **502 Bad Gateway:** Your backend is likely not running. Check `pm2 logs ababa-backend` for errors. A common error is an incorrect `DATABASE_URL` in the `.env` file.
-   **CORS Error in Browser Console:** The `CORS_ORIGIN` in your `backend/.env` file does not exactly match `https://www.abexch.live`. Remember to run `pm2 restart ababa-backend` after changing it.
-   **404 Not Found on Page Refresh:** Your Nginx `location /` block is misconfigured. Ensure the `try_files $uri $uri/ /index.html;` line is present in `/etc/nginx/sites-available/abexch.live`.
