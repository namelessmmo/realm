package incoming

import "github.com/namelessmmo/realm/pkg/server/client"

type IncomingPacket interface {
	Handle(client *client.Client) error
}
