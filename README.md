# 🚀 StoryVoyage - AI-Powered Children's Story Generator

> **Inspired by the Kaggle Banana Competition** - Bringing the power of AI and computer vision to create magical, personalized children's stories with stunning illustrations.

## 🌟 Overview

StoryVoyage is an innovative AI-powered platform that creates personalized children's stories with beautiful illustrations. Built for the Nano Banana Hackathon, this application combines the latest in AI technology (Google Gemini 2.5 Flash) with educational features, accessibility support, and advanced visual storytelling capabilities.

### 🎯 Key Features

- **🎨 AI-Generated Illustrations**: Create stunning, consistent character illustrations using Google Gemini 2.5 Flash Image
- **📚 Personalized Stories**: Generate custom stories based on child's interests, age, and reading level
- **🌍 Global Adventures**: Explore cities around the world through immersive storytelling
- **♿ Accessibility First**: Built-in support for dyslexia, visual impairments, and different reading levels
- **📖 Educational Content**: Interactive quizzes, vocabulary builders, and cultural learning
- **🎭 Advanced Storytelling**: Character consistency, style fusion, and batch illustration processing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key
- Supabase account (optional, for cloud storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/storyvoyage.git
   cd storyvoyage
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your API keys to `.env.local`:
   ```env
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎨 How It Works

### 1. Story Creation
- **Step 1**: Enter basic information (child's name, age, destination city)
- **Step 2**: Add interests and select reading level
- **Step 3**: Customize the storyteller persona
- **Step 4**: Generate your magical story with AI

### 2. Advanced Illustration System
- **Character Consistency**: Maintains the same character appearance across all pages
- **Style Options**: Realistic, cartoon, watercolor, and sketch styles
- **Batch Processing**: Generate all illustrations simultaneously
- **Edit Mode**: Modify existing illustrations while maintaining continuity

### 3. Educational Features
- **Comprehension Quizzes**: Age-appropriate questions with explanations
- **Vocabulary Builder**: Interactive word learning with definitions
- **Cultural Facts**: Learn about different cities and cultures
- **Activity Suggestions**: Hands-on learning activities

### 4. Accessibility Features
- **Alt Text Generation**: Detailed image descriptions for screen readers
- **Reading Level Adaptation**: Simplified text versions for different abilities
- **Dyslexia Support**: Specialized formatting and color coding
- **Audio Descriptions**: Screen reader optimized content

## 🛠️ Technical Architecture

### Frontend
- **Next.js 15** with React 19
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Radix UI** components
- **Framer Motion** for animations

### Backend
- **Next.js API Routes** for serverless functions
- **Google Gemini 2.5 Flash** for AI text and image generation
- **Supabase** for database and real-time features
- **Zod** for API validation

### Key APIs
- `/api/generate` - Story generation
- `/api/advanced-illustrate` - Advanced image generation
- `/api/batch-illustrate` - Batch illustration processing
- `/api/educational-features` - Learning content generation
- `/api/accessibility-features` - Accessibility support
- `/api/social-features` - Sharing and community features

## 🎯 Use Cases

### For Parents
- Create personalized bedtime stories
- Educational content tailored to your child's interests
- Bonding through story creation and reading

### For Educators
- Generate curriculum-specific stories
- Create accessible content for diverse learners
- Interactive learning materials

### For Therapists
- Stories for children with learning differences
- Emotional support through personalized narratives
- Visual and textual accessibility features

## 🌍 Global Impact

StoryVoyage promotes:
- **Cultural Understanding**: Stories set in cities worldwide
- **Educational Equity**: Accessible content for all learning styles
- **Language Learning**: Vocabulary building and comprehension
- **Creativity**: Encouraging imagination and storytelling

## 🔧 Development

### Project Structure
```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── create/         # Story creation page
│   └── read/           # Story reading page
├── components/         # Reusable UI components
├── hooks/             # Custom React hooks
└── lib/               # Utility functions and configurations
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Kaggle Community** for the Nano Banana Hackathon platform
- **Google** for the Gemini AI API
- **Supabase** for the database infrastructure
- **Open Source Community** for the amazing tools and libraries

## 🔗 Links

- [Live Demo](https://storyvoyage.vercel.app)
- [Kaggle Competition](https://www.kaggle.com/competitions/banana)
- [Documentation](https://docs.storyvoyage.com)
- [Support](https://github.com/yourusername/storyvoyage/issues)

## 📊 Competition Alignment

This project addresses the Kaggle Banana Competition's focus on:
- **Innovation**: First-of-its-kind character consistency in AI storytelling
- **Technical Excellence**: Advanced API integration and batch processing
- **Real-world Impact**: Educational and accessibility features
- **User Experience**: Intuitive design and smooth interactions

---

**Built with ❤️ for the Nano Banana Hackathon**

*Creating magical stories, one adventure at a time.*