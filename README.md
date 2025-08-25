# AI-Enhanced Test Case Generator

A full-stack application that leverages artificial intelligence to automatically generate comprehensive test cases for code snippets and API endpoints. The system uses Hugging Face Code Models to analyze source code and produce unit tests, integration tests, and edge cases while providing coverage analysis.

## Features

- **Automated Test Generation**: AI-powered generation of unit and integration tests
- **Code Analysis**: Deep understanding of code structure and functionality  
- **Coverage Analysis**: Identification of untested code paths and edge cases
- **Multiple Test Types**: Support for various testing frameworks and patterns
- **Real-time Processing**: Fast test generation with live feedback
- **Export Capabilities**: Generate test files in popular formats

## Technology Stack

### Backend
- Node.js 18+ with Express.js
- Hugging Face Transformers for AI integration
- MongoDB/PostgreSQL for data storage
- JWT authentication
- Babel Parser for AST analysis

### Frontend  
- React 18+ with Redux Toolkit
- Material-UI for components
- Monaco Editor for code editing
- Axios for API communication

## Project Structure

```
ai-test-generator/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── services/        # Business logic layer
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utility functions
│   │   └── config/          # Configuration files
│   ├── tests/               # Backend tests
│   └── package.json
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   └── styles/          # CSS/SCSS files
│   ├── public/              # Static assets
│   └── package.json
├── shared/                  # Shared types and utilities
└── docs/                    # Documentation
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB or PostgreSQL
- Hugging Face API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-test-generator
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend  
npm install
```

4. Set up environment variables:
```bash
# Backend (.env)
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend (.env)
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

5. Start the development servers:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm start
```

## Development

- Backend runs on `http://localhost:3001`
- Frontend runs on `http://localhost:3000`
- API documentation available at `http://localhost:3001/api-docs`

## License

MIT License - see LICENSE file for details.