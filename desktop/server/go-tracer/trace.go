package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type variable struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type step struct {
	Step      int        `json:"step"`
	Line      int        `json:"line"`
	Message   string     `json:"message"`
	Variables []variable `json:"variables"`
	Output    string     `json:"output"`
}

var (
	traceSteps []step
	traceOut   strings.Builder
	origStdout = os.Stdout
	traceFailed  bool
	traceMsg   string
)

func traceInstall() {}

func traceRecord(line int, pairs ...any) {
	vars := make([]variable, 0)
	for i := 0; i+1 < len(pairs); i += 2 {
		vars = append(vars, variable{Name: fmt.Sprint(pairs[i]), Value: traceSerialize(pairs[i+1])})
	}
	traceSteps = append(traceSteps, step{
		Step: len(traceSteps) + 1, Line: line, Message: fmt.Sprintf("Executing line %d", line),
		Variables: vars, Output: traceOut.String(),
	})
}

func traceLog(text string) {
	if traceOut.Len() > 0 {
		traceOut.WriteByte('\n')
	}
	traceOut.WriteString(text)
	fmt.Fprintln(origStdout, text)
}

func setTraceFail(message string) {
	traceFailed = true
	traceMsg = message
}

func traceEmit() {
	payload := map[string]any{
		"success": !traceFailed, "visualizationLevel": "full", "finalOutput": traceOut.String(), "steps": traceSteps,
	}
	if traceFailed {
		payload["error"] = traceMsg
	}
	encoded, _ := json.Marshal(payload)
	fmt.Fprintf(origStdout, "__CODEVIZ_JSON__%s\n", encoded)
}

func traceSerialize(value any) string {
	switch typed := value.(type) {
	case []int:
		parts := make([]string, len(typed))
		for i, v := range typed {
			parts[i] = fmt.Sprint(v)
		}
		return "[" + strings.Join(parts, ", ") + "]"
	default:
		return fmt.Sprint(value)
	}
}
