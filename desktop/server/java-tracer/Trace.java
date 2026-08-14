package codeviz;

import java.util.*;
import java.io.*;

public class Trace {
    private static final List<Map<String, Object>> steps = new ArrayList<>();
    private static final StringBuilder capturedOutput = new StringBuilder();
    private static final PrintStream originalOut = System.out;
    private static boolean installed = false;
    private static boolean failed = false;
    private static String failureMessage = null;

    public static void fail(String error) {
        failed = true;
        failureMessage = error;
    }

    public static void install() {
        if (installed) return;
        installed = true;
        System.setOut(new PrintStream(new OutputStream() {
            private final StringBuilder buffer = new StringBuilder();

            @Override
            public void write(int b) {
                char c = (char) b;
                buffer.append(c);
                if (c == '\n') {
                    flushBuffer();
                }
            }

            @Override
            public void flush() {
                flushBuffer();
            }

            private void flushBuffer() {
                if (buffer.length() == 0) return;
                String text = buffer.toString();
                if (text.endsWith("\n")) {
                    text = text.substring(0, text.length() - 1);
                }
                if (!text.isEmpty()) {
                    if (capturedOutput.length() > 0) capturedOutput.append('\n');
                    capturedOutput.append(text);
                    originalOut.println(text);
                }
                buffer.setLength(0);
            }
        }, true));
    }

    public static void record(int line, Object... nameValuePairs) {
        Map<String, Object> step = new LinkedHashMap<>();
        step.put("step", steps.size() + 1);
        step.put("line", line);
        step.put("message", "Executing line " + line);

        List<Map<String, String>> variables = new ArrayList<>();
        for (int i = 0; i + 1 < nameValuePairs.length; i += 2) {
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("name", String.valueOf(nameValuePairs[i]));
            entry.put("value", serialize(nameValuePairs[i + 1]));
            variables.add(entry);
        }

        step.put("variables", variables);
        step.put("output", capturedOutput.toString());
        steps.add(step);
    }

    public static void emitResult(boolean success, String error) {
        if (!success) {
            fail(error);
        }
        emitResult();
    }

    public static void emitResult() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("success", !failed);
        payload.put("steps", steps);
        payload.put("finalOutput", capturedOutput.toString());
        payload.put("visualizationLevel", "full");
        if (failed) {
            payload.put("error", failureMessage);
        }
        originalOut.println("__CODEVIZ_JSON__" + toJson(payload));
    }

    private static String serialize(Object value) {
        if (value == null) return "null";
        if (value instanceof int[]) return Arrays.toString((int[]) value);
        if (value instanceof long[]) return Arrays.toString((long[]) value);
        if (value instanceof double[]) return Arrays.toString((double[]) value);
        if (value instanceof boolean[]) return Arrays.toString((boolean[]) value);
        if (value instanceof char[]) return new String((char[]) value);
        if (value instanceof Object[]) return Arrays.deepToString((Object[]) value);
        if (value instanceof Collection<?>) return value.toString();
        if (value instanceof Map<?, ?>) return value.toString();
        if (value instanceof Queue<?>) return value.toString();
        if (value instanceof Set<?>) return value.toString();
        if (value.getClass().isArray()) return Arrays.deepToString((Object[]) value);
        return String.valueOf(value);
    }

    @SuppressWarnings("unchecked")
    private static String toJson(Object value) {
        if (value == null) return "null";
        if (value instanceof String) return "\"" + escape((String) value) + "\"";
        if (value instanceof Number || value instanceof Boolean) return String.valueOf(value);
        if (value instanceof Map<?, ?> map) {
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (!first) sb.append(',');
                first = false;
                sb.append(toJson(String.valueOf(entry.getKey()))).append(':').append(toJson(entry.getValue()));
            }
            return sb.append('}').toString();
        }
        if (value instanceof List<?> list) {
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (Object item : list) {
                if (!first) sb.append(',');
                first = false;
                sb.append(toJson(item));
            }
            return sb.append(']').toString();
        }
        return toJson(String.valueOf(value));
    }

    private static String escape(String input) {
        return input
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }
}
