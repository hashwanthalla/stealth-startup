#ifndef CODEVIZ_TRACE_H
#define CODEVIZ_TRACE_H

#include <stdio.h>

#ifdef __cplusplus
extern "C" {
#endif

void codeviz_install(void);
void codeviz_record(int line, int pair_count, ...);
void codeviz_fail(const char *message);
void codeviz_emit(void);
char *codeviz_int(long long value);
char *codeviz_string(const char *value);

#ifdef __cplusplus
}
#endif

#endif
