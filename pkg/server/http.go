package server

import (
	"flag"
	"net/http"

	"github.com/gin-contrib/static"

	"github.com/namelessmmo/realm/pkg/server/client"

	"github.com/gorilla/websocket"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

type Server struct {
	upgrader      websocket.Upgrader
	clientHandler *client.Handler
}

func NewServer() *Server {
	return &Server{
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
	}
}

func (server *Server) Run() {
	hmacString := flag.String("hmac-auth-string", "", "The HMAC String used to sign auth tokens")
	flag.Parse()

	logrus.SetFormatter(&logrus.TextFormatter{
		DisableColors: true,
		FullTimestamp: true,
	})

	if len(*hmacString) == 0 {
		logrus.Fatalf("hmac-auth-string is required")
	}

	server.clientHandler = client.NewClientHandler(*hmacString)
	server.clientHandler.Run()

	r := gin.Default()

	r.Use(static.Serve("/", static.LocalFile("./public/dist", true)))

	r.GET("/ws", func(context *gin.Context) {
		server.handleWebSocket(context)
	})

	_ = r.Run() // listen and serve on 0.0.0.0:8080
}

func (server *Server) handleWebSocket(context *gin.Context) {
	w, r := context.Writer, context.Request

	err := server.clientHandler.HandleClient(w, r, server.upgrader)
	if err != nil {
		context.String(http.StatusInternalServerError, "Error connecting websocket: %s", err.Error())
	}
}
