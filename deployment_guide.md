# Deploying QuantumChat to Production

To test QuantumChat with your friend across the internet, you'll need to deploy both the frontend and the backend. 

**Important Note on Netlify:** Netlify only hosts static files and "serverless functions", which **do not support long-running WebSocket connections** (Socket.io). Therefore, you must deploy your Node.js backend to a service like **Render** or **Railway**, and your Vite React frontend to **Netlify** or **Vercel**.

Here is the step-by-step guide to deploying your application for free:

---

## 1. Deploy the Backend (Socket.io Server) to Render

Render is a free platform that perfectly supports Node.js WebSockets.

1. Create a GitHub repository and push your `ranchat` folder to it.
2. Go to [Render.com](https://render.com/) and sign up.
3. Click **New +** and select **Web Service**.
4. Connect your GitHub account and select your `ranchat` repository.
5. Configure the deployment:
   - **Name**: `quantumchat-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
6. Click **Create Web Service**. 
7. Once deployed, Render will give you a backend URL (e.g., `https://quantumchat-backend.onrender.com`). Copy this URL.

---

## 2. Update the Frontend Configuration

Before deploying the frontend to Netlify, you must tell it to connect to your live Render backend instead of `localhost:3001`.

1. Open `src/services/socket.js`.
2. Change the hardcoded `http://localhost:3001` to use an environment variable:

```javascript
import { io } from 'socket.io-client';

let socket = null;

// Use the production URL if available, otherwise fallback to localhost for local dev
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function getSocket() {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}
```

3. Commit and push this change to your GitHub repository.

---

## 3. Deploy the Frontend to Netlify

Now you can deploy the React app to Netlify.

1. Go to [Netlify.com](https://www.netlify.com/) and log in with GitHub.
2. Click **Add new site** > **Import an existing project** and select your GitHub repository.
3. Configure the build settings:
   - **Base directory**: Leave blank (/)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Click **Show advanced** > **New variable**.
5. Add the environment variable for your backend:
   - Key: `VITE_BACKEND_URL`
   - Value: `https://quantumchat-backend.onrender.com` *(Replace this with your actual Render URL from Step 1)*
6. Click **Deploy site**.

### Fixing Netlify Routing
Since this is a React Router app (Single Page Application), you need to tell Netlify to redirect all routes to `index.html`. 

1. Create a new file in your `public` folder named `_redirects` (no file extension).
2. Add this exact line to the file:
   `/*    /index.html   200`
3. Push to GitHub, which will auto-trigger a new Netlify deployment.

---

## 4. Test with Your Friend! 🚀

Once both the Render backend and Netlify frontend are "Live":
1. Open your Netlify URL (e.g., `https://quantumchat.netlify.app`).
2. Send the exact same link to your friend.
3. Have one person select the "Developers" category and start chatting, while the other does the same. You'll instantly connect via P2P WebRTC!
