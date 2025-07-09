FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git and build dependencies
RUN apk add --no-cache git gcc musl-dev sqlite-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM alpine:latest

# Install ca-certificates and sqlite
RUN apk --no-cache add ca-certificates sqlite

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/main .

# Create uploads directory
RUN mkdir -p uploads/avatars uploads/posts

# Copy migrations
COPY --from=builder /app/pkg/db/migrations ./pkg/db/migrations

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./main"]