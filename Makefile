# Crawl-Term: Star Wars Perspective Terminal Emulator
# Makefile

BINARY_NAME ?= crawlterm
APP_NAME    ?= CrawlTerm.app
MAIN_PKG    ?= .
GO          ?= go

PORT        ?= 8765

# Native macOS Cocoa + WebKit desktop window.
CGO_ENABLED ?= 1
LDFLAGS     ?= -s -w

.PHONY: all build run app update test coverage fmt vet tidy clean install kill help

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

## Compile the binary (CGO + Cocoa/WebKit on macOS)
build:
	@echo "==> Building $(BINARY_NAME)..."
	CGO_ENABLED=$(CGO_ENABLED) $(GO) build -ldflags="$(LDFLAGS)" -o $(BINARY_NAME) $(MAIN_PKG)
	@echo "==> Built: ./$(BINARY_NAME)"

## Build and run as a native desktop app
run: build
	@echo "==> Running $(BINARY_NAME)..."
	./$(BINARY_NAME) -port $(PORT)

## Build CrawlTerm.app macOS application bundle
app:
	@./scripts/build-app.sh

## Install/update CrawlTerm.app in /Applications
update: app
	@echo "Installing/updating /Applications/$(APP_NAME)..."
	@rm -rf /Applications/$(APP_NAME)
	@cp -R $(APP_NAME) /Applications/
	@/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f /Applications/$(APP_NAME) >/dev/null 2>&1 || true
	@echo "==> /Applications/$(APP_NAME) updated. Launch with: open -a CrawlTerm"

## Kill running crawlterm processes and free the port
kill:
	@PIDS=$$(pgrep -f 'CrawlTerm\.app/Contents/MacOS/CrawlTerm|/crawlterm$$|^\./crawlterm' 2>/dev/null || true); \
	PORT_PIDS=$$(lsof -tiTCP:$(PORT) -sTCP:LISTEN 2>/dev/null || true); \
	ALL=$$(echo "$$PIDS $$PORT_PIDS" | tr ' ' '\n' | sort -u | grep -v '^$$' || true); \
	if [ -n "$$ALL" ]; then echo "Stopping: $$ALL"; kill $$ALL 2>/dev/null || true; sleep 1; \
	  for p in $$ALL; do kill -0 $$p 2>/dev/null && kill -9 $$p 2>/dev/null || true; done; \
	  echo "Stopped."; else echo "No CrawlTerm process found on port $(PORT)."; fi

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
	CGO_ENABLED=$(CGO_ENABLED) $(GO) install -ldflags="$(LDFLAGS)" $(MAIN_PKG)

## Remove compiled binary, app bundle, and test artifacts
clean:
	@echo "==> Cleaning build artifacts..."
	rm -f $(BINARY_NAME) $(BINARY_NAME).exe coverage.out coverage.html
	rm -rf $(APP_NAME)
	@echo "==> Done."
