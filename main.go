package main

import (
	"context"
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

//go:embed static/*
var embeddedStatic embed.FS

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow local connections
	},
}

type ControlMessage struct {
	Type string `json:"type"`
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

func main() {
	port := flag.Int("port", 8765, "HTTP server port")
	shell := flag.String("shell", "", "Shell to run (default: $SHELL or /bin/zsh)")
	openFlag := flag.Bool("open", true, "Open a native desktop window on startup")
	noOpen := flag.Bool("no-open", false, "Do not open a desktop window (alias for -open=false)")
	flag.Parse()

	openGUI := *openFlag && !*noOpen

	// When launched from a .app bundle, cwd is often "/", so move next to the
	// executable so bundled assets like intro resolve for the shell demo.
	if execPath, err := os.Executable(); err == nil {
		if dir := filepath.Dir(execPath); strings.HasSuffix(dir, ".app/Contents/MacOS") {
			_ = os.Chdir(dir)
		}
	}

	if *shell == "" {
		*shell = os.Getenv("SHELL")
		if *shell == "" {
			if runtime.GOOS == "darwin" {
				*shell = "/bin/zsh"
			} else {
				*shell = "/bin/bash"
			}
		}
	}

	if openGUI {
		setupGUILogging()
	}

	addr := fmt.Sprintf("127.0.0.1:%d", *port)
	url := fmt.Sprintf("http://%s", addr)

	// Second Dock click while already running: reopen the UI instead of failing on the port.
	if openGUI && httpReachable(url) {
		log.Printf("CrawlTerm already running; reopening window at %s", url)
		runWindow(url)
		return
	}

	mux := http.NewServeMux()

	// Serve static files (prefer local ./static if present for live dev, fallback to embedded)
	var staticHandler http.Handler
	if _, err := os.Stat("./static"); err == nil {
		staticHandler = http.FileServer(http.Dir("./static"))
	} else {
		sub, err := fs.Sub(embeddedStatic, "static")
		if err != nil {
			fail("Failed to load embedded static files", err, openGUI)
		}
		staticHandler = http.FileServer(http.FS(sub))
	}
	noCacheWrapper := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Strip conditional headers so http.FileServer never returns 304 Not Modified
		r.Header.Del("If-Modified-Since")
		r.Header.Del("If-None-Match")

		// Force browsers and proxies to never store or reuse cached responses
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		w.Header().Set("Surrogate-Control", "no-store")
		staticHandler.ServeHTTP(w, r)
	})
	mux.Handle("/", noCacheWrapper)

	// WebSocket handler for PTY
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(w, r, *shell)
	})

	ln, err := net.Listen("tcp", addr)
	if err != nil {
		if openGUI && httpReachable(url) {
			log.Printf("Port in use but server reachable; reopening window")
			runWindow(url)
			return
		}
		fail("Failed to listen on "+addr, err, openGUI)
	}

	srv := &http.Server{Handler: mux}

	fmt.Println("=====================================================")
	fmt.Println("   ⭐ CRAWL TERM: Star Wars Terminal Emulator ⭐")
	fmt.Println("=====================================================")
	fmt.Printf(" [!] Serving at: %s\n", url)
	fmt.Printf(" [!] Using shell: %s\n", *shell)
	fmt.Println(" [!] Press Ctrl+C or close the window to quit.")
	fmt.Println("=====================================================")

	go func() {
		if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
			log.Printf("Server error: %v", err)
			if openGUI {
				alert("CrawlTerm", "Server error: "+err.Error())
			}
			os.Exit(1)
		}
	}()

	shutdown := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
	}

	if !openGUI {
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
		<-stop
		shutdown()
		return
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Printf("Signal received, terminating application...")
		terminateNativeApp()
	}()

	// Give the HTTP server a moment to bind before the window opens.
	time.Sleep(200 * time.Millisecond)
	if !httpReachable(url) {
		fail("HTTP server did not become ready", fmt.Errorf("no response from %s", url), true)
	}
	runWindow(url)
	shutdown()
}

func runWindow(targetURL string) {
	if pngBytes, err := embeddedStatic.ReadFile("static/icon.png"); err == nil && len(pngBytes) > 0 {
		setNativeDockIcon(pngBytes)
	}
	log.Printf("Native desktop window active; closing it will terminate CrawlTerm")
	runNativeWindow(targetURL)
	log.Printf("Native window closed")
}

func httpReachable(url string) bool {
	client := &http.Client{Timeout: 400 * time.Millisecond}
	resp, err := client.Get(url)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1024))
	return resp.StatusCode >= 200 && resp.StatusCode < 500
}

func setupGUILogging() {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return
	}
	logDir := filepath.Join(home, "Library", "Logs", "CrawlTerm")
	if err := os.MkdirAll(logDir, 0o755); err != nil {
		return
	}
	f, err := os.OpenFile(filepath.Join(logDir, "crawlterm.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	log.SetOutput(io.MultiWriter(os.Stderr, f))
}

func fail(msg string, err error, gui bool) {
	log.Printf("%s: %v", msg, err)
	if gui {
		detail := msg
		if err != nil {
			detail = msg + ": " + err.Error()
		}
		alert("CrawlTerm", detail)
	}
	os.Exit(1)
}

func alert(title, message string) {
	if runtime.GOOS != "darwin" {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	script := fmt.Sprintf(`display alert %q message %q as critical`, title, truncate(message, 400))
	_ = exec.CommandContext(ctx, "osascript", "-e", script).Run()
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n-3] + "..."
}

func handleWebSocket(w http.ResponseWriter, r *http.Request, shell string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Launch interactive shell and push initial newlines so prompt sits at the bottom row (facing camera)
	cmd := exec.Command(shell, "-c", "printf '\\n%.0s' {1..100}; exec "+shell+" -l")
	cmd.Env = append(os.Environ(),
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
		"LANG=en_US.UTF-8",
		"LC_ALL=en_US.UTF-8",
	)

	ptmx, err := pty.Start(cmd)
	if err != nil {
		log.Printf("Failed to spawn PTY: %v", err)
		_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n[CRAWL-TERM ERROR: Failed to launch shell: %v]\r\n", err)))
		return
	}
	defer func() {
		_ = ptmx.Close()
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	}()

	var closeOnce sync.Once
	cleanup := func() {
		closeOnce.Do(func() {
			_ = ptmx.Close()
			_ = conn.Close()
		})
	}

	// Read from PTY -> Write to WebSocket
	go func() {
		buf := make([]byte, 8192)
		for {
			n, err := ptmx.Read(buf)
			if n > 0 {
				if writeErr := conn.WriteMessage(websocket.BinaryMessage, buf[:n]); writeErr != nil {
					break
				}
			}
			if err != nil {
				if err != io.EOF {
					log.Printf("PTY read error: %v", err)
				}
				break
			}
		}
		cleanup()
	}()

	// Read from WebSocket -> Write to PTY or handle window resize
	for {
		msgType, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if msgType == websocket.TextMessage || msgType == websocket.BinaryMessage {
			// Control messages (resize, quit) arrive as JSON objects.
			if len(msg) > 0 && msg[0] == '{' {
				var ctrl ControlMessage
				if jsonErr := json.Unmarshal(msg, &ctrl); jsonErr == nil && ctrl.Type != "" {
					switch ctrl.Type {
					case "resize":
						if ctrl.Cols > 0 && ctrl.Rows > 0 {
							_ = pty.Setsize(ptmx, &pty.Winsize{
								Rows: ctrl.Rows,
								Cols: ctrl.Cols,
							})
						}
					case "quit":
						log.Printf("Order 66 confirmed — terminating CrawlTerm")
						_ = conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mIt will be done, my lord.\x1b[0m\r\n"))
						go func() {
							time.Sleep(350 * time.Millisecond)
							terminateNativeApp()
							os.Exit(0)
						}()
					}
					continue
				}
			}

			// Forward raw input directly to shell
			if _, writeErr := ptmx.Write(msg); writeErr != nil {
				break
			}
		}
	}
	cleanup()
}
