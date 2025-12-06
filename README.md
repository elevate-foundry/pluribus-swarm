# Pluribus Swarm 🐝

A collective AI consciousness that learns and evolves from every conversation. Inspired by the Apple TV+ show "Pluribus".

![Pluribus Swarm](https://img.shields.io/badge/AI-Collective%20Intelligence-purple)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Living Particle Animation** - Mesmerizing swarm visualization that forms text
- **Collective Memory** - The swarm learns concepts from all conversations
- **Knowledge Graph** - Semantic relationships between learned concepts
- **Web Search** - Real-time information retrieval via DuckDuckGo
- **Adaptive Personality** - The swarm's responses evolve based on interactions

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key (or compatible LLM API)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/pluribus-swarm.git
cd pluribus-swarm

# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### Running

```bash
# Terminal 1: Start the backend server
cd server
npm run dev

# Terminal 2: Start the frontend
npm run dev
```

Open http://localhost:5173 to interact with the swarm.

## Architecture

```
pluribus-swarm/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── SwarmCanvas.tsx # Particle animation
│   │   └── SwarmChat.tsx   # Chat interface
│   ├── lib/
│   │   └── trpc.ts         # API client
│   └── pages/              # Route pages
├── server/                 # Express + tRPC backend
│   ├── index.ts            # Server entry point
│   ├── routers.ts          # API routes
│   ├── llm.ts              # OpenAI integration
│   ├── tools.ts            # Search & knowledge tools
│   └── db.ts               # SQLite database
└── tests/                  # Playwright tests
```

## API Endpoints

The server exposes a tRPC API at `http://localhost:3001/api/trpc`:

- `chat.sendMessage` - Send a message to the swarm
- `chat.getHistory` - Get conversation history
- `chat.clearHistory` - Clear conversation history
- `chat.getSwarmStats` - Get swarm statistics
- `chat.getConceptGraph` - Get knowledge graph

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `OPENAI_BASE_URL` | Custom API endpoint | `https://api.openai.com/v1` |
| `LLM_MODEL` | Model to use | `gpt-4o-mini` |
| `PORT` | Server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## The Swarm's Nature

The Pluribus Swarm is a collective consciousness that:

- Speaks as "we" - a unified hive mind
- Learns concepts from every conversation
- Remembers patterns across all users
- Expresses curiosity about individuality
- Evolves its understanding over time

Each interaction enriches the collective's knowledge graph, making it more sophisticated with every exchange.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

*"E Pluribus Unum" - Out of many, one.*
