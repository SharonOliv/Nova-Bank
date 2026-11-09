FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY . .
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENV JAVA_TOOL_OPTIONS="-Duser.timezone=Asia/Kolkata"
CMD ["sh", "-c", "java -Xmx256m -XX:+UseSerialGC -Dserver.port=${PORT:-8081} -jar app.jar"]