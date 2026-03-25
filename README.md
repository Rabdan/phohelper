# PhoMenu Bot

Vietnamese cuisine ordering assistant with AI-powered menu discovery.

## Project Structure

```
phomenu/
├── bot/          # Telegram bot (Node.js/TypeScript)
├── admin/        # Admin panel (React)
├── db-init/      # Database initialization scripts
└── docs/         # Documentation
```

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Development
npm run dev:bot    # Start bot
npm run dev:admin  # Start admin panel
```

## Environment Variables

Create `.env` files in `bot/` and `admin/` directories:

**bot/.env:**
```
BOT_TOKEN=your_telegram_bot_token
OPENROUTER_API_KEY=your_api_key
DATABASE_URL=your_postgres_url
```

**admin/.env:**
```
VITE_API_URL=http://localhost:3000
```
