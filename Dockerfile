# Uses Microsoft's official Playwright image, which already has Chromium
# AND all its OS-level dependencies preinstalled and matched to the
# playwright version this code uses (1.56.0) — PDF export (src/export.js)
# launches Chromium, and that only works reliably in a container that has
# these system libraries; the plain node:22 image does not.
FROM mcr.microsoft.com/playwright:v1.56.0-noble

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev playwright@1.56.0 docx@9.7.1 pdf-lib@1.17.1

COPY . .

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "bin/start.js"]
