# Deploying both apps to Render (one public link each)

This makes both `assessment-processing` and `candidate-assessment` reachable
from a real `https://...` link, so you (and candidates) can open them from
any browser — not just from inside this chat session. After the one-time
setup below, you never touch a terminal again: future changes are just me
editing the code and pushing, and Render rebuilds automatically.

**What I already prepared:** `Dockerfile` in each project, and
`render.yaml` at the top level that tells Render how to run both services
and wire them together (the API key and internal URL are connected
automatically — you don't type or copy either one).

**Honest caveat:** I could not actually run `docker build` on these
Dockerfiles myself — this sandbox has no Docker daemon available (see
`docs/ARCHITECTURE_DECISION.md` for the general pattern of saying so
rather than assuming). The image, package versions, and build steps match
exactly what's already verified working in this session, and
`mcr.microsoft.com/playwright:v1.56.0-noble` is Microsoft's own official,
documented base image for this Playwright version — but the Render build
itself will be the first time this exact Dockerfile runs end to end.
**Also important:** the `npm install` block I hit earlier only applies to
*this* sandbox's network policy — Render's own build servers can reach
npmjs.org normally, so the Docker build step will install packages fine.

## Step 1 — Get the code onto GitHub

You need a GitHub account (free) and a new empty repository.

1. Go to github.com → sign in (or create an account) → **New repository**.
   Name it anything (e.g. `ocean-assessment-system`). Leave it **empty**
   (don't check "Add a README").
2. Download and unzip the file I'm about to send you.
3. On the new repo's page, click **"uploading an existing file"** (shown
   on an empty repo's page) and drag in the **contents** of the unzipped
   folder (both project folders, `render.yaml`, `DEPLOY.md`,
   `work-mindset-assessment-engine.js`) — GitHub's web uploader accepts
   dragging folders in directly. Commit the upload.
   - If you're comfortable with a terminal instead:
     `git init && git add . && git commit -m "initial" && git branch -M main && git remote add origin <your repo URL> && git push -u origin main`

## Step 2 — Deploy on Render

1. Go to render.com → **sign up** (choosing "Sign up with GitHub" is
   easiest — it connects your account in the same step).
2. Click **New +** → **Blueprint**.
3. Select the repository you just created. Render will find `render.yaml`
   automatically and show both services it's about to create.
4. Click **Apply** (or **Create New Resources**). Render builds both
   Docker images — expect this to take several minutes the first time
   (the Playwright base image is large).
5. When both services show status **Live**, open
   `assessment-processing`'s service page → copy its URL, and open
   `candidate-assessment`'s service page → copy its URL. Those are your
   two permanent links.

## Step 3 — Get the dashboard link

1. On `assessment-processing`'s Render page, go to the **Environment**
   tab and find `SEED_API_KEY` — Render generated a real random value for
   it automatically.
2. Your recruiter dashboard is:
   `<assessment-processing URL>/dashboard?key=<that SEED_API_KEY value>`
3. Your candidate form is just `<candidate-assessment URL>/` — share that
   link directly with candidates.

That's it — no terminal needed again after this. To change anything later,
tell me what to change; I'll edit the code and push, and Render redeploys
on its own.

## Making data durable (optional, for real use beyond a first test)

Both services currently store data as a SQLite file **with no persistent
Disk attached** (Render's free plan doesn't support Disks). This means
**all submissions and reports are wiped every time the service restarts
or redeploys** — fine for a first live test, not fine for real candidate
data. To fix: upgrade `assessment-processing` to Render's Starter plan,
add a **Disk** (Render dashboard → service → Disks → Add Disk) mounted at
`/app/data`, and redeploy — no code change needed, `src/db.js` already
writes there.

## If something doesn't deploy cleanly

Paste me the error from Render's build/deploy logs and I'll fix the
Dockerfile or code — I can't see your Render dashboard myself.
