package outgoing

type PlayerDisconnect struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}
