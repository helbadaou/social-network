package utils

func PrepareAvatarURL(path string) string {
	if path == "" {
		return ""
	}
	return AbsoluteURL(path)
}
