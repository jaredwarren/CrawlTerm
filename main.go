package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"sync"

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

type ResizeMessage struct {
	Type string `json:"type"`
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

func main() {
	port := flag.Int("port", 8765, "HTTP server port")
	shell := flag.String("shell", "", "Shell to run (default: $SHELL or /bin/zsh)")
	noOpen := flag.Bool("no-open", false, "Do not automatically open the browser")
	flag.Parse()

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

	// Serve static files (prefer local ./static if present for live dev, fallback to embedded)
	var staticHandler http.Handler
	if _, err := os.Stat("./static"); err == nil {
		staticHandler = http.FileServer(http.Dir("./static"))
	} else {
		sub, err := fs.Sub(embeddedStatic, "static")
		if err != nil {
			log.Fatalf("Failed to load embedded static files: %v", err)
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
	http.Handle("/", noCacheWrapper)

	// WebSocket handler for PTY
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(w, r, *shell)
	})

	addr := fmt.Sprintf("127.0.0.1:%d", *port)
	url := fmt.Sprintf("http://%s", addr)

	fmt.Println("=====================================================")
	fmt.Println("   ⭐ CRAWL TERM: Star Wars Terminal Emulator ⭐")
	fmt.Println("=====================================================")
	fmt.Printf(" [!] Serving at: %s\n", url)
	fmt.Printf(" [!] Using shell: %s\n", *shell)
	fmt.Println(" [!] Press Ctrl+C to terminate.")
	fmt.Println("=====================================================")

	if !*noOpen && runtime.GOOS == "darwin" {
		go func() {
			_ = exec.Command("open", url).Start()
		}()
	}

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
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
			// Check if message is a JSON resize event
			if len(msg) > 0 && msg[0] == '{' {
				var resize ResizeMessage
				if jsonErr := json.Unmarshal(msg, &resize); jsonErr == nil && resize.Type == "resize" {
					if resize.Cols > 0 && resize.Rows > 0 {
						_ = pty.Setsize(ptmx, &pty.Winsize{
							Rows: resize.Rows,
							Cols: resize.Cols,
						})
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
