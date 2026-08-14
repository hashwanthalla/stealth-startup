#include "trace.h"

#include <stdarg.h>
#include <stdlib.h>
#include <string.h>

#define CODEVIZ_MAX_STEPS 2000
#define CODEVIZ_MAX_VARS 48
#define CODEVIZ_MAX_OUTPUT 65536
#define CODEVIZ_JSON_MARKER "__CODEVIZ_JSON__"

typedef struct {
  int line;
  int var_count;
  char *names[CODEVIZ_MAX_VARS];
  char *values[CODEVIZ_MAX_VARS];
} CodevizStep;

static CodevizStep steps[CODEVIZ_MAX_STEPS];
static int step_count = 0;
static char output_buffer[CODEVIZ_MAX_OUTPUT];
static size_t output_len = 0;
static int failed = 0;
static char fail_message[512];
static int installed = 0;

static void append_output(const char *text) {
  size_t len = strlen(text);
  if (output_len + len + 2 >= CODEVIZ_MAX_OUTPUT) return;
  if (output_len > 0) output_buffer[output_len++] = '\n';
  memcpy(output_buffer + output_len, text, len);
  output_len += len;
  output_buffer[output_len] = '\0';
  fputs(text, stdout);
  fputc('\n', stdout);
}

static void json_escape(const char *input, char *out, size_t out_size) {
  size_t j = 0;
  for (size_t i = 0; input[i] != '\0' && j + 2 < out_size; i++) {
    char c = input[i];
    if (c == '"' || c == '\\') {
      out[j++] = '\\';
      if (j + 1 >= out_size) break;
      out[j++] = c;
      continue;
    }
    if (c == '\n') {
      out[j++] = '\\';
      if (j + 1 >= out_size) break;
      out[j++] = 'n';
      continue;
    }
    if (c == '\r') {
      out[j++] = '\\';
      if (j + 1 >= out_size) break;
      out[j++] = 'r';
      continue;
    }
    if (c == '\t') {
      out[j++] = '\\';
      if (j + 1 >= out_size) break;
      out[j++] = 't';
      continue;
    }
    out[j++] = c;
  }
  out[j] = '\0';
}

void codeviz_install(void) {
  if (installed) return;
  installed = 1;
}

char *codeviz_int(long long value) {
  char *buffer = (char *)malloc(32);
  if (!buffer) return (char *)"";
  snprintf(buffer, 32, "%lld", value);
  return buffer;
}

char *codeviz_string(const char *value) {
  if (!value) return codeviz_int(0);
  char *buffer = (char *)malloc(strlen(value) + 1);
  if (!buffer) return (char *)"";
  strcpy(buffer, value);
  return buffer;
}

void codeviz_record(int line, int pair_count, ...) {
  if (step_count >= CODEVIZ_MAX_STEPS) return;
  CodevizStep *step = &steps[step_count++];
  step->line = line;
  step->var_count = pair_count;

  va_list args;
  va_start(args, pair_count);
  for (int i = 0; i < pair_count && i < CODEVIZ_MAX_VARS; i++) {
    const char *name = va_arg(args, const char *);
    const char *value = va_arg(args, const char *);
    step->names[i] = strdup(name ? name : "");
    step->values[i] = strdup(value ? value : "");
  }
  va_end(args);
}

void codeviz_fail(const char *message) {
  failed = 1;
  snprintf(fail_message, sizeof(fail_message), "%s", message ? message : "Runtime error");
}

void codeviz_emit(void) {
  FILE *out = stdout;
  fprintf(out, "%s{", CODEVIZ_JSON_MARKER);
  fprintf(out, "\"success\":%s,", failed ? "false" : "true");
  fprintf(out, "\"visualizationLevel\":\"full\",");
  fprintf(out, "\"finalOutput\":\"");
  char escaped[CODEVIZ_MAX_OUTPUT * 2];
  json_escape(output_buffer, escaped, sizeof(escaped));
  fprintf(out, "%s\",", escaped);
  if (failed) {
    char err[1024];
    json_escape(fail_message, err, sizeof(err));
    fprintf(out, "\"error\":\"%s\",", err);
  }
  fprintf(out, "\"steps\":[");
  for (int i = 0; i < step_count; i++) {
    CodevizStep *step = &steps[i];
    if (i > 0) fprintf(out, ",");
    fprintf(out, "{\"step\":%d,\"line\":%d,\"message\":\"Executing line %d\",\"variables\":[", i + 1, step->line, step->line);
    for (int j = 0; j < step->var_count; j++) {
      char name[256];
      char value[1024];
      json_escape(step->names[j], name, sizeof(name));
      json_escape(step->values[j], value, sizeof(value));
      if (j > 0) fprintf(out, ",");
      fprintf(out, "{\"name\":\"%s\",\"value\":\"%s\"}", name, value);
    }
    fprintf(out, "],\"output\":\"");
    json_escape(output_buffer, escaped, sizeof(escaped));
    fprintf(out, "\"}");
  }
  fprintf(out, "]}\n");
}

int codeviz_printf(const char *format, ...) {
  char buffer[2048];
  va_list args;
  va_start(args, format);
  vsnprintf(buffer, sizeof(buffer), format, args);
  va_end(args);
  append_output(buffer);
  return (int)strlen(buffer);
}
