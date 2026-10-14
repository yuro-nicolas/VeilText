# VeilText Docker Guide

A complete walkthrough: what the Docker setup is, how to add it to GitHub, how
to set it up on any computer, how to publish it for a shareable link, and how
to present it.

---

## 1. What this is (and what it isn't)

**VeilText is a Chrome extension.** It has no server and no backend. Chrome
loads its JavaScript files into your own browser and runs them on the pages you
visit. Because of that, **the extension itself cannot run inside Docker** -
there is no program to start and no port to open.

**So what does Docker do here?** It provides a ready-made **developer toolbox**
that does three jobs:

| Job | Command | Result |
|---|---|---|
| Check the extension files are consistent | `docker compose run --rm validate` | Pass/fail report |
| Rebuild the default word list | `docker compose run --rm lexicon` | Updated `data/default_lexicon.json` |
| Package the extension for release | `docker compose run --rm package` | `dist/veiltext.zip` |

The benefit is **reproducibility**: anyone with Docker can run the same checks
and builds with the same tools, without installing Node or Python.

**Is Docker the whole system?** No. The extension (the files in this repo) is
the system. Docker is an optional layer around it. Delete the Docker files and
VeilText works exactly the same.

---

## 2. How the pieces fit together

```
Your project folder  <--- shared folder (bind mount) --->  Container (/app)
 manifest.json                                              Node 20 + Python + zip
 src/ ...                                                   runs one job, then exits
 dist/veiltext.zip  <--- result appears here

docker-compose.yml  = named shortcuts for the jobs
Dockerfile          = recipe that builds the image the jobs run in
```

Key terms:

- **Image** - a frozen snapshot of a small Linux system with the tools
  installed. Built from the `Dockerfile`.
- **Container** - a running copy of an image. It does its job and stops.
- **Docker Compose** - reads `docker-compose.yml` so you can type short
  commands instead of long ones.
- **Bind mount** - a shared folder between your computer and the container, so
  the container sees your latest files and its output lands back in your
  project.

---

## 3. The files

| File | Purpose |
|---|---|
| `Dockerfile` | Builds the image: Node 20 (Alpine Linux) + Python 3 + zip, then copies the project in. Default action: run the validator. |
| `docker-compose.yml` | Defines three services: `validate`, `lexicon`, `package`. |
| `.dockerignore` | Keeps `.git`, `dist`, and `node_modules` out of the image. |
| `scripts/validate-extension.js` | Checks `manifest.json` is valid and every file it references exists; checks the lexicon is a JSON array. |
| `DOCKER.md` | This guide. |

---

## 4. Part 1 - Add Docker to GitHub

Do this once, from the folder that contains `manifest.json` (your repo root).

1. **Copy the files into the repo root**, keeping this layout:

   ```
   Dockerfile
   docker-compose.yml
   .dockerignore
   DOCKER.md
   README.md                      (replaces the old one)
   scripts/validate-extension.js
   ```

2. **Ignore build output.** Add this line to `.gitignore` (create the file if
   it doesn't exist):

   ```
   dist/
   ```

3. **Check what changed:**

   ```powershell
   git status
   ```

4. **Stage, commit, and push:**

   ```powershell
   git add .
   git commit -m "Add Docker tooling and installation docs"
   git push
   ```

5. **Verify on GitHub:** open the repository page and confirm the files and the
   new README (with Installation at the top) appear.

---

## 5. Part 2 - Set up Docker on a computer

### Step 1: Install Docker Desktop (once per computer)

- Download Docker Desktop from <https://www.docker.com/products/docker-desktop/>.
- On Windows it uses WSL 2; the installer will prompt you if it needs enabling.
- Restart if asked.
- **Open Docker Desktop and wait until it shows that Docker is running.** Most
  errors come from skipping this.

Check it in PowerShell:

```powershell
docker --version
docker compose version
docker run --rm hello-world
```

The last command should print "Hello from Docker!"

### Step 2: Get the project

```powershell
git clone https://github.com/yuro-nicolas/VeilText.git
cd VeilText
```

If a `VeilText` folder already exists on your computer, clone into a new name,
for example `git clone https://github.com/yuro-nicolas/VeilText.git VeilText-docker`.

### Step 3: Build the image (once, or after editing the Dockerfile)

```powershell
docker compose build
```

Docker downloads the Node image, installs Python and zip, and copies in the
project. The first run takes a minute or two. You do **not** need to rebuild
after editing JavaScript, because the bind mount supplies your live files.

---

## 6. Part 3 - Run the commands

### Validate

```powershell
docker compose run --rm validate
```

Expected output (numbers will differ):

```
default_lexicon.json: <N> entries
manifest "VeilText..." v1.x: <n>/<n> referenced files found
OK
```

If a file listed in `manifest.json` is missing, it prints `FAIL: ...` and exits
with an error. `--rm` deletes the container afterward.

### Rebuild the lexicon

```powershell
docker compose run --rm lexicon
```

Runs `data/build_default_lexicon.py`. It needs the source lists in `data/raw/`.
Only run this if you changed those lists.

### Package for the Chrome Web Store

```powershell
docker compose run --rm package
```

Creates `dist\veiltext.zip`. It contains only what the extension needs; Docker
files, scripts, raw lexicon sources, markdown files, and `.git` are excluded.
Upload this zip in the Chrome Web Store developer dashboard, or unzip it and
use **Load unpacked**.

---

## 7. Part 4 - Test the extension itself

Docker doesn't run the extension, so this step is done in Chrome:

1. Open `chrome://extensions`, turn on **Developer mode**, and click
   **Load unpacked**.
2. Select the project folder (the one containing `manifest.json`).
3. Open the VeilText popup and confirm the master toggle is ON.
4. Visit any normal website (not a `chrome://` page and not the Chrome Web
   Store, where Chrome blocks all extensions). Words in your list should be
   covered according to your chosen filter mode.

---

## 8. Part 5 - Publish the image for a shareable link (Docker Hub)

A Docker Hub link lets anyone pull your image. Do this after the repo is on
GitHub.

1. Create a free account at <https://hub.docker.com>.
2. Log in from PowerShell:

   ```powershell
   docker login
   ```

3. Build and tag the image with your Docker Hub username (replace
   `<username>`):

   ```powershell
   docker build -t <username>/veiltext-tools:1.0 .
   ```

4. Push it:

   ```powershell
   docker push <username>/veiltext-tools:1.0
   ```

5. Your link is:

   ```
   https://hub.docker.com/r/<username>/veiltext-tools
   ```

6. On that page, click **Edit** next to the description and fill in the
   Overview, which is blank by default. For example:

   > Developer tooling for the VeilText Chrome extension. Validates the
   > extension files, rebuilds the default lexicon, and packages the extension
   > for the Chrome Web Store. VeilText itself runs in Chrome, not in Docker.
   > Source: https://github.com/yuro-nicolas/VeilText

Anyone can now run the validator straight from the published image, with no
clone needed:

```powershell
docker run --rm <username>/veiltext-tools:1.0
```

**What the link shows and doesn't show.** The Docker Hub page is a catalog
page: name, description, tags, pull command, and size. Nothing runs when
someone opens it. It proves the image exists and can be pulled and run, but it
is not a working extension; the extension is installed in Chrome from the Web
Store or via Load unpacked. The image is the toolbox, not the product.

GitHub Container Registry (`ghcr.io`) is an alternative that ties the image to
your repository.

---

## 9. Part 6 - Presenting it to the dean

### Links to have ready

| What | Link |
|---|---|
| Source code | <https://github.com/yuro-nicolas/VeilText> |
| Install the extension | Chrome Web Store listing: `<paste your listing URL>` |
| Docker image | `https://hub.docker.com/r/<username>/veiltext-tools` |

### Before the presentation

- Docker Desktop is open and running.
- You've run `docker compose build` (needs internet the first time).
- The VeilText extension is installed in Chrome with the master toggle ON.
- Do a dry run of the steps below.

### Suggested flow (about 5 minutes)

1. **Frame it.** "VeilText is a Chrome extension, so it runs in the browser and
   can't be hosted in a container. Docker wraps our development and release
   tooling so the build is reproducible on any machine."
2. **Show GitHub.** Open the repo, show the README's Installation section and
   the Docker files.
3. **Validate.** Run `docker compose run --rm validate` and read the OK result.
   Explain it checks the manifest and that every referenced file exists.
4. **Package.** Run `docker compose run --rm package`, then show
   `dist\veiltext.zip`. Explain this is the file uploaded to the Chrome Web
   Store.
5. **Show the extension working.** Open a real website in Chrome with VeilText
   on. Switch between Aho-Corasick and Wu-Manber in the popup, change the
   filter mode, and click covered text to show the reveal warning.
6. **Share the link.** Show the Docker Hub page and run
   `docker run --rm <username>/veiltext-tools:1.0` to show it works from the
   published image alone.

### Questions you may be asked

- **"Why Docker for a browser extension?"** The extension itself doesn't need
  it. Docker standardizes validation, lexicon generation, and packaging, so
  results don't depend on one laptop's setup.
- **"Is the system running in Docker?"** No. The system runs in Chrome. Docker
  runs the tooling.
- **"Does it send data anywhere?"** No. All matching happens locally in the
  browser.
- **"What can't it filter?"** Images, video, canvas apps like Google Docs,
  Chrome's PDF viewer, closed Shadow DOM, and anything not in the word list.
  The README lists these.

---

## 10. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| `error during connect` / cannot connect to the Docker daemon | Docker Desktop isn't running. Start it and wait until it's ready. |
| `no configuration file provided` | You're not in the project folder. `cd` to the folder with `docker-compose.yml`. |
| `validate` reports a missing file | A file in `manifest.json` isn't in the repo. Add it or fix the path. |
| `Cannot find module 'scripts/validate-extension.js'` | The script is missing or not inside a `scripts/` folder. |
| `lexicon` fails | `data/raw/` is missing, or the Python script needs extra packages (add them to the Dockerfile). |
| `docker push` is denied | Not logged in, or the tag doesn't start with your Docker Hub username. |
| Words aren't covered in Chrome | The extension is toggled off, or the word isn't in the lexicon. Chrome also blocks extensions on `chrome://` pages and the Web Store. |
