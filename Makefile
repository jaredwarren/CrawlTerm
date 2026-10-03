# Crawl-Term: Star Wars Perspective Terminal Emulator
# Makefile

BINARY_NAME ?= crawlterm
MAIN_PKG    ?= .
GO          ?= go

PORT        ?= 8765

# Go build flags (optimizations, version metadata if needed)
LDFLAGS ?= -s -w

.PHONY: all build run test coverage fmt vet tidy clean install kill help

# Default target
all: build

## Display this help message
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk '/^[a-zA-Z\-_0-9]+:/ { \
		helpMessage = match(lastLine, /^## (.*)/); \
		if (helpMessage) { \
			helpCommand = substr($$1, 0, index($$1, ":")-1); \
			helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
			printf "  \033[36m%-15s\033[0m %s\n", helpCommand, helpMessage; \
		} \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST)

## Compile the binary
build:
	@echo "==> Building $(BINARY_NAME)..."
	$(GO) build -ldflags="$(LDFLAGS)" -o $(BINARY_NAME) $(MAIN_PKG)
	@echo "==> Built: ./$(BINARY_NAME)"

## Build and run crawl-term
run: build
	@echo "==> Running $(BINARY_NAME)..."
	./$(BINARY_NAME)

## Kill running crawlterm processes and free the port
kill:
	@echo "==> Stopping running $(BINARY_NAME) processes..."
	@-pkill -f "$(BINARY_NAME)" 2>/dev/null && echo "==> Terminated $(BINARY_NAME) processes." || echo "==> No running $(BINARY_NAME) processes found."
	@-if lsof -ti :$(PORT) >/dev/null 2>&1; then \
		echo "==> Freeing port $(PORT)..."; \
		kill -9 $$(lsof -ti :$(PORT)) 2>/dev/null || true; \
	fi
	@echo "==> Done."

## Run unit tests
test:
	@echo "==> Running tests..."
	$(GO) test -v ./...

## Run tests with code coverage report
coverage:
	@echo "==> Generating test coverage..."
	$(GO) test -coverprofile=coverage.out ./...
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "==> Coverage report written to coverage.html"

## Run go fmt on source code
fmt:
	@echo "==> Formatting code..."
	$(GO) fmt ./...

## Run go vet linter
vet:
	@echo "==> Running go vet..."
	$(GO) vet ./...

## Prune and resolve go.mod dependencies
tidy:
	@echo "==> Tidying module dependencies..."
	$(GO) mod tidy

## Install binary into GOPATH/bin
install:
	@echo "==> Installing to GOPATH/bin..."
	$(GO) install -ldflags="$(LDFLAGS)" $(MAIN_PKG)

## Remove compiled binary and test artifacts
clean:
	@echo "==> Cleaning build artifacts..."
	rm -f $(BINARY_NAME) $(BINARY_NAME).exe coverage.out coverage.html
	@echo "==> Done."
