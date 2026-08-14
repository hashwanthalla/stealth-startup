#ifndef CODEVIZ_TRACE_WRAP_H
#define CODEVIZ_TRACE_WRAP_H

#include "trace.h"

int codeviz_printf(const char *format, ...);
#define printf codeviz_printf

#endif
