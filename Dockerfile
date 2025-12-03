# ==========================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================
FROM node:20 AS frontend
WORKDIR /app/frontend

# Copy package files first for better caching
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Copy source code and build
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Backend (Spring Boot)
# ==========================================
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Copy built frontend assets to Spring Boot static resources
# This puts the React app (index.html, assets) where Spring Boot can serve it
COPY --from=frontend /app/frontend/dist ./src/main/resources/static

# Build the JAR, skipping tests to speed up deployment
RUN mvn clean package -DskipTests

# ==========================================
# Stage 3: Run Application
# ==========================================
FROM eclipse-temurin:21-jdk
WORKDIR /app

# Copy the built JAR from the build stage
COPY --from=build /app/target/blackroom-0.0.1-SNAPSHOT.jar app.jar

# Expose the port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-Xmx384m", "-jar", "app.jar"]
