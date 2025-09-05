package cmd

import (
	"bytes"
	"testing"
)

func TestVersionCommand(t *testing.T) {
	buf := new(bytes.Buffer)
	rootCmd.SetOut(buf)
	rootCmd.SetArgs([]string{"version"})
	
	if err := rootCmd.Execute(); err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	
	if len(buf.String()) == 0 {
		t.Error("Expected version output")
	}
}
