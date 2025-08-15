FROM golang:1.23.0-alpine AS builder

ENV CGO_ENABLED=1
RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod tidy

COPY . .
RUN go build -o main .

FROM alpine:3.18
RUN apk add --no-cache sqlite-libs

WORKDIR /app
COPY --from=builder /app/main .
COPY --from=builder /app/db/migrations ./db/migrations

EXPOSE 8080
CMD ["./main"]