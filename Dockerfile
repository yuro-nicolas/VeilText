# Developer tooling image for VeilText.
# This does NOT run the extension (Chrome does that); it validates, rebuilds
# the lexicon for, and packages it. See the "Docker" section of README.md.
FROM node:20-alpine

RUN apk add --no-cache python3 zip

WORKDIR /app
COPY . .

# Default action: validate the extension files.
CMD ["node", "scripts/validate-extension.js"]
