# ports used by the app
# 5173 - Vite
# 3000 - Node.js backend
# 5050 - Agent server

# 6333 - Qdrant (run `docker run -d --name qdrant -p 6333:6333 qdrant/qdrant` to start it)
# 7000 - Embedding tool
# 7010 - RAG tool
# 8001 - CALCULATOR tool
# 8002 - CALENDAR tool
# 11434 - Ollama

# check if a port is already in use, 1-1023 are reserved ports
# sudo ss -tuln | grep 8002

#!/usr/bin/env bash
set -e

# -------- free ports ----------
for port in 3000 5050 5173 5174 7000 7010 8001 8002 6333; do
  fuser -k "$port"/tcp &>/dev/null || true
done

# -------- ensure fresh Qdrant ---
if docker ps -a --format '{{.Names}}' | grep -q '^qdrant$'; then
  echo "Removing old Qdrant container..."
  docker rm -f qdrant
fi
docker run -d --rm --name qdrant -p 6333:6333 qdrant/qdrant

# -------- ensure Duckling is running ---
# if docker ps -a --format '{{.Names}}' | grep -q '^duckling$'; then
#   echo "Removing old Duckling container..."
#   docker rm -f duckling
# fi
# docker run -d --rm --name duckling -p 8000:8000 rasa/duckling:latest

# ---------- backend ---------------
(cd backend            && nodemon server.js &)

# ---------- embedding -------------
uvicorn backend.agents.embedding:app    --port 7000 &

# ---------- RAG --------------------
uvicorn backend.agents.rag:app     --port 7010 &

# ---------- Ollama -----------------
pgrep -f "ollama serve" >/dev/null || ollama serve &
ollama run deepseek-r1:latest &

# ---------- tools ------------------
uvicorn backend.agents.tools.calculator_tool:app --port 8001 &
uvicorn backend.agents.tools.calendar_tool:app   --port 8002 &

# ---------- agent server -----------
uvicorn backend.agents.agent_server:app  --port 5050 &

# ---------- frontend ---------------
(cd frontend           && npm run dev &)

wait
