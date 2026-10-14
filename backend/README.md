# NutriVision AI - Java Spring Boot Backend

Production REST API for food recognition and USDA nutrition analysis.

## Features
- **Food Recognition (`POST /api/food/recognize`)**: Multimodal AI food identification (Google Gemini 1.5/2.0 Flash Vision), returns detected candidates and confidence scores.
- **USDA Food Search (`GET /api/nutrition/search`)**: Real-time integration with USDA FoodData Central.
- **Nutrient Calculation (`POST /api/nutrition/calculate`)**: Implements `nutrient per 100g × quantity (g) / 100` with macro calorie distribution and FDA Daily Values.
- **Health Check (`GET /api/health`)**: Reports operational status and integration availability.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP server port | `8080` |
| `AI_VISION_API_KEY` or `GEMINI_API_KEY` | Google Gemini API key for image recognition | None (returns clear warning if omitted) |
| `USDA_API_KEY` | USDA FoodData Central API key | `DEMO_KEY` (Free key from fdc.nal.usda.gov) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins | `*` (configured for Netlify and localhost) |

## Build and Run Locally

```bash
# Using Maven
mvn clean package
java -jar target/nutrivision-backend-1.0.0.jar

# Or using Docker
docker build -t nutrivision-backend .
docker run -p 8080:8080 -e AI_VISION_API_KEY=your_key -e USDA_API_KEY=your_usda_key nutrivision-backend
```

## Free Cloud Deployment Options

1. **Render (Web Service)**:
   - Connect your GitHub repo.
   - Choose Docker runtime or Java environment.
   - Add environment variables: `AI_VISION_API_KEY`, `USDA_API_KEY`.
2. **Railway**:
   - Deploy from repo with automatic Dockerfile detection.
3. **Heroku / AWS Elastic Beanstalk**:
   - Deploy Dockerfile or Java jar.
