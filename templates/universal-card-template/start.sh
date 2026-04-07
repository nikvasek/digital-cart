#!/bin/bash

# Скрипт быстрого запуска проекта Digital Business Card Platform

echo "🚀 Starting Digital Business Card Platform..."
echo ""

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и повторите попытку."
    exit 1
fi

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js 18+ и повторите попытку."
    exit 1
fi

# 1. Запуск PostgreSQL
echo "📦 Starting PostgreSQL..."
docker-compose up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# 2. Настройка Backend
echo ""
echo "🔧 Setting up Backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    
    # Автоматическая настройка DATABASE_URL для локальной разработки
    echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/digital_cards" >> .env
    echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
fi

if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

echo "🗄️  Running database migrations..."
npm run db:migrate

echo "🌱 Seeding database with test data..."
npm run db:seed

echo "▶️  Starting backend server..."
npm run dev &
BACKEND_PID=$!

cd ..

# 3. Настройка Frontend
echo ""
echo "🎨 Setting up Frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "▶️  Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

cd ..

# 4. Вывод информации
echo ""
echo "============================================"
echo "✅ Digital Business Card Platform is running!"
echo "============================================"
echo ""
echo "📍 URLs:"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:3000"
echo "  Database:  localhost:5432"
echo ""
echo "🔑 Test credentials:"
echo "  Email:     admin@example.com"
echo "  Password:  admin123"
echo ""
echo "🎯 Test card:"
echo "  http://localhost:5173/paulline-ferreira"
echo ""
echo "============================================"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Ожидание завершения
wait
