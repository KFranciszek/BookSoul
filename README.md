# BookSoul - AI-Powered Book Recommendation System

BookSoul is an intelligent book recommendation platform that uses advanced AI psychology to match readers with their perfect books. The system analyzes user preferences, emotional states, and reading psychology to provide highly personalized book recommendations.

## 🌟 Features

### 🧠 AI Psychology Engine
- **Multi-Agent AI System**: 5 specialized AI agents working together
- **Psychological Profiling**: Deep analysis of reading psychology and emotional needs
- **Personalized Matching**: Books matched to your current mood and life situation

### 📚 Three Recommendation Modes
1. **Quick Match (2-3 mins)**: Fast, essential recommendations
2. **CineMatch™ (30-60 secs)**: Film-inspired book matching
3. **Deep Analysis (7-12 mins)**: Comprehensive psychological profiling

### 🚀 Performance Optimized
- **Optimized AI Pipeline**: 75-85% faster processing
- **Intelligent Caching**: 30-minute cache with smart invalidation
- **Parallel Processing**: Concurrent AI requests with rate limiting
- **Production Ready**: Full monitoring and error handling

### 🔒 Privacy & Security
- **Anonymous Data Processing**: No personal data stored
- **GDPR Compliant**: User consent and data protection
- **Secure API**: Rate limiting and input validation
- **Error Monitoring**: Sentry integration for reliability

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── contexts/           # React context providers
├── services/           # API services
├── utils/              # Utility functions
└── types/              # TypeScript definitions
```

### Backend (Node.js + Express)
```
server/
├── agents/             # AI agent implementations
├── services/           # Business logic services
├── routes/             # API route handlers
├── middleware/         # Express middleware
├── utils/              # Server utilities
└── data/               # Data management
```

### AI Agent Pipeline
1. **ProfilerAgent**: Analyzes user psychology and emotional state
2. **CuratorAgent**: Generates complete book recommendations using AI
3. **FilterAgent**: Applies content filters and safety checks
4. **EvaluatorAgent**: Validates and scores book matches
5. **PresenterAgent**: Finalizes personalized descriptions

## 🚀 Deployment

### Render Deployment (Recommended)

The application is configured for easy deployment on Render with the included `render.yaml` configuration.

#### Prerequisites
1. **OpenAI API Key**: Required for AI recommendations
2. **Supabase Project**: Optional, falls back to in-memory storage
3. **Sentry DSN**: Optional, for error monitoring

#### Environment Variables
```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo

# Optional (Supabase)
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional (Monitoring)
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=production

# Production Settings
NODE_ENV=production
PORT=10000
```

#### Deployment Steps
1. **Fork/Clone** this repository
2. **Connect to Render**: Link your GitHub repository
3. **Set Environment Variables**: Add required variables in Render dashboard
4. **Deploy**: Render will automatically build and deploy both frontend and backend

### Manual Deployment

#### Backend Deployment
```bash
# Install dependencies
npm install

# Set environment variables
export OPENAI_API_KEY="your_key_here"
export NODE_ENV="production"

# Start production server
npm start
```

#### Frontend Deployment
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Serve static files (dist/ folder)
```

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Local Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd booksoul
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. **Start development servers**
```bash
# Start both frontend and backend
npm run dev:full

# Or start separately
npm run dev      # Frontend (port 5173)
npm run server   # Backend (port 3001)
```

### Available Scripts

```bash
npm run dev          # Start frontend development server
npm run server       # Start backend development server
npm run dev:full     # Start both frontend and backend
npm run build        # Build frontend for production
npm run preview      # Preview production build
npm start            # Start production server
```

## 📊 Performance Monitoring

### Built-in Analytics
- **Request Performance**: Response time tracking
- **Cache Hit Rates**: Caching effectiveness monitoring
- **User Satisfaction**: Rating distribution analysis
- **System Health**: AI service availability monitoring

### Monitoring Endpoints
```bash
GET /health                              # System health check
GET /api/recommendations/status          # AI service status
GET /api/recommendations-optimized/performance  # Performance metrics
POST /api/recommendations-optimized/clear-cache # Clear caches
```

## 🔧 Configuration

### AI Configuration
```javascript
// OpenAI settings
OPENAI_MODEL=gpt-3.5-turbo    # AI model to use
OPENAI_API_KEY=sk-...         # Your OpenAI API key

// Performance settings
RATE_LIMIT_MAX_REQUESTS=100   # Requests per window
RATE_LIMIT_WINDOW_MS=900000   # Rate limit window (15 min)
```

### Database Configuration
```javascript
// Supabase (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

// Falls back to in-memory storage if not configured
```

## 🧪 Testing

### Manual Testing
1. **Health Check**: Visit `/health` endpoint
2. **AI Service**: Test recommendation generation
3. **Performance**: Monitor response times
4. **Error Handling**: Test with invalid inputs

### Performance Testing
- **Standard Pipeline**: ~10-30 seconds per recommendation
- **Optimized Pipeline**: ~5-15 seconds per recommendation
- **Cache Hit**: <1 second response time

## 🔍 Troubleshooting

### Common Issues

#### "AI service unavailable"
- Check OpenAI API key configuration
- Verify API key has sufficient credits
- Ensure internet connectivity

#### "Database connection failed"
- Supabase credentials may be incorrect
- Application will fall back to in-memory storage
- Check Supabase project status

#### Slow performance
- Enable optimized pipeline (`/api/recommendations-optimized/generate`)
- Check cache hit rates
- Monitor OpenAI API response times

### Debug Mode
Set `LOG_LEVEL=DEBUG` for detailed logging in development.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Check the troubleshooting section
- Review the configuration documentation
- Monitor system health endpoints
- Check Sentry for error reports (if configured)

---

**BookSoul** - Discover your perfect book match through AI psychology 📚✨