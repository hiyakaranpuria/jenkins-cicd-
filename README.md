# URL Shortener — CI/CD Pipeline with Jenkins

A Node.js URL shortener app with a fully automated CI/CD pipeline using Jenkins, GitHub Webhooks, ngrok, Docker, and Docker Hub.

---

## How It Works

```
Developer pushes code to GitHub
        ↓
GitHub sends webhook to ngrok public URL
        ↓
ngrok tunnels the request to local Jenkins (port 8080)
        ↓
Jenkins pulls latest code from GitHub
        ↓
Jenkins runs: Install → Test → Build Docker Image → Push to Docker Hub → Deploy
        ↓
Docker image live on Docker Hub + container running locally
```

---

## Project Structure

```
├── src/
│   ├── app.js            # Express URL shortener app
│   └── app.test.js       # Node built-in test runner tests
├── public/
│   └── index.html        # Frontend UI
├── Dockerfile            # Container definition
├── Jenkinsfile           # CI/CD pipeline definition
├── package.json          # Node dependencies and scripts
└── .gitignore
```

---

## Pipeline Stages

| Stage | What Happens |
|-------|-------------|
| **Checkout** | Jenkins pulls latest code from GitHub |
| **Install Dependencies** | Runs `npm install` |
| **Test** | Runs 10 automated tests on a dynamic port |
| **Build Docker Image** | Builds image tagged with build number and `latest` |
| **Push to Docker Hub** | Pushes both tags to `hiya855/url-shortener` |
| **Deploy** | Stops old container, runs new one on port 3000 |

---

## Setup Guide

### 1. Prerequisites

- Jenkins installed and running on `http://localhost:8080`
- Docker Desktop installed and running
- Node.js 18+ installed
- Git installed
- ngrok installed

---

### 2. Expose Local Jenkins via ngrok

Jenkins runs locally — GitHub needs a public URL to send webhook events. ngrok creates a secure tunnel from a public URL to your local machine.

**Install ngrok:**
```powershell
winget install ngrok.ngrok
```

**Add your auth token** (get it from https://dashboard.ngrok.com):
```powershell
ngrok config add-authtoken your-auth-token-here
```

**Start the tunnel pointing to Jenkins port:**
```powershell
ngrok http 8080
```

You will see output like:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:8080
```

Copy the `https://` URL — this is your public Jenkins URL.

> **Note:** On the free ngrok plan, this URL changes every time you restart ngrok. Update the GitHub webhook URL whenever you restart ngrok.

---

### 3. Configure Jenkins URL

Go to **Manage Jenkins → System → Jenkins URL** and set it to your ngrok URL:
```
https://abc123.ngrok-free.app/
```

Enable proxy compatibility to fix CSRF issues with webhooks.
Go to **Manage Jenkins → Script Console** and run:
```groovy
import jenkins.model.Jenkins
import hudson.security.csrf.DefaultCrumbIssuer

Jenkins.instance.setCrumbIssuer(new DefaultCrumbIssuer(true))
Jenkins.instance.save()
println "Done"
```

---

### 4. Add GitHub Webhook

1. Go to your GitHub repo → **Settings → Webhooks → Add webhook**
2. Fill in:

| Field | Value |
|-------|-------|
| Payload URL | `https://abc123.ngrok-free.app/github-webhook/` |
| Content type | `application/json` |
| Secret | leave blank |
| SSL verification | Enable |
| Events | Just the push event |

3. Click **Add webhook** — you should see a green tick ✅ after GitHub sends the ping.

---

### 5. Create Docker Hub Access Token

Never use your Docker Hub password directly. Use a scoped access token instead.

1. Log in to [https://hub.docker.com](https://hub.docker.com)
2. Go to **Account Settings → Personal Access Tokens**
3. Click **Generate New Token**
4. Set:
   - Token name: `jenkins-token`
   - Access permissions: **Read, Write, Delete**
5. Copy the token — it is shown only once

---

### 6. Add Docker Hub Credentials to Jenkins

Jenkins needs your Docker Hub credentials to push images securely.

1. Go to **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**
2. Fill in:

| Field | Value |
|-------|-------|
| Kind | Username with password |
| Username | `hiya855` (your Docker Hub username) |
| Password | paste the access token from step 5 |
| ID | `dockerhub-credentials` |
| Description | Docker Hub credentials |

3. Click **Save**

> The ID `dockerhub-credentials` must match exactly what is referenced in the Jenkinsfile.

---

### 7. Configure Jenkins Pipeline Job

1. Create a new **Pipeline** job in Jenkins
2. Under **Build Triggers** → check **GitHub hook trigger for GITScm polling**
3. Under **Pipeline**:
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: `https://github.com/hiyakaranpuria/jenkins-cicd-.git`
   - Branch: `*/main`
4. Click **Save**

---

### 8. Trigger the Pipeline

Every `git push` to the `main` branch now automatically triggers the full pipeline:

```powershell
git add .
git commit -m "your message"
git push origin main
```

Watch Jenkins run through all stages. Once complete, the Docker image is live on Docker Hub at:
```
https://hub.docker.com/r/hiya855/url-shortener
```

---

## Running Locally

```powershell
npm install
npm start
```

App runs at `http://localhost:3000`

**Run tests:**
```powershell
node --test src/app.test.js
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/shorten` | Shorten a URL |
| `GET` | `/:shortCode` | Redirect to original URL |
| `GET` | `/api/all` | List all shortened URLs |
| `GET` | `/api/health` | Health check |
| `DELETE` | `/api/delete/:shortCode` | Delete a short URL |

---

## Docker

**Pull and run from Docker Hub:**
```powershell
docker pull hiya855/url-shortener:latest
docker run -d -p 3000:3000 hiya855/url-shortener:latest
```
