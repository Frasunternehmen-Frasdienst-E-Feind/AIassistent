//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/exec"
)

func showMessage(title, text string) { fmt.Fprintf(os.Stderr, "%s: %s\n", title, text) }

func openBrowser(url string) error { return exec.Command("xdg-open", url).Start() }

func fixedDrives() []string { return nil }
