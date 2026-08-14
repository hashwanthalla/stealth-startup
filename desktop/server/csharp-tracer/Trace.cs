using System;
using System.Collections.Generic;
using System.Text;

namespace Codeviz;

public static class Trace
{
    private static readonly List<Dictionary<string, object>> Steps = new();
    private static readonly StringBuilder CapturedOutput = new();
    private static readonly TextWriter OriginalOut = Console.Out;
    private static bool installed;
    private static bool failed;
    private static string? failureMessage;

    public static void Install()
    {
        if (installed) return;
        installed = true;
        Console.SetOut(new Writer(OriginalOut, CapturedOutput));
    }

    public static void Fail(string error)
    {
        failed = true;
        failureMessage = error;
    }

    public static void Record(int line, params object[] nameValuePairs)
    {
        var step = new Dictionary<string, object>
        {
            ["step"] = Steps.Count + 1,
            ["line"] = line,
            ["message"] = $"Executing line {line}",
            ["variables"] = BuildVariables(nameValuePairs),
            ["output"] = CapturedOutput.ToString(),
        };
        Steps.Add(step);
    }

    public static void EmitResult()
    {
        var payload = new Dictionary<string, object>
        {
            ["success"] = !failed,
            ["visualizationLevel"] = "full",
            ["finalOutput"] = CapturedOutput.ToString(),
            ["steps"] = Steps,
        };
        if (failed) payload["error"] = failureMessage ?? "Runtime error";
        OriginalOut.WriteLine("__CODEVIZ_JSON__" + SerializePayload(payload));
    }

    private static string SerializePayload(Dictionary<string, object> payload)
    {
        var stepsJson = new StringBuilder("[");
        for (int i = 0; i < Steps.Count; i++)
        {
            if (i > 0) stepsJson.Append(',');
            var step = Steps[i];
            stepsJson.Append("{\"step\":").Append(step["step"]).Append(",\"line\":").Append(step["line"])
                .Append(",\"message\":\"").Append(Escape(step["message"]?.ToString() ?? ""))
                .Append("\",\"variables\":").Append(SerializeVariables((List<Dictionary<string, string>>)step["variables"]))
                .Append(",\"output\":\"").Append(Escape(CapturedOutput.ToString())).Append("\"}");
        }
        stepsJson.Append(']');
        return "{\"success\":" + (!failed ? "true" : "false") + ",\"visualizationLevel\":\"full\",\"finalOutput\":\"" +
               Escape(CapturedOutput.ToString()) + "\",\"steps\":" + stepsJson + (failed ? ",\"error\":\"" + Escape(failureMessage ?? "") + "\"" : "") + "}";
    }

    private static string SerializeVariables(List<Dictionary<string, string>> vars)
    {
        var json = new StringBuilder("[");
        for (int i = 0; i < vars.Count; i++)
        {
            if (i > 0) json.Append(',');
            json.Append("{\"name\":\"").Append(Escape(vars[i]["name"])).Append("\",\"value\":\"")
                .Append(Escape(vars[i]["value"])).Append("\"}");
        }
        json.Append(']');
        return json.ToString();
    }

    private static string Escape(string input) =>
        input.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "\\r");

    private static List<Dictionary<string, string>> BuildVariables(object[] pairs)
    {
        var vars = new List<Dictionary<string, string>>();
        for (int i = 0; i + 1 < pairs.Length; i += 2)
        {
            vars.Add(new Dictionary<string, string>
            {
                ["name"] = Convert.ToString(pairs[i]) ?? "",
                ["value"] = Serialize(pairs[i + 1]),
            });
        }
        return vars;
    }

    private static string Serialize(object? value)
    {
        if (value is null) return "null";
        if (value is Array array)
        {
            var items = new List<string>();
            foreach (var item in array) items.Add(Convert.ToString(item) ?? "");
            return "[" + string.Join(", ", items) + "]";
        }
        if (value is System.Collections.IEnumerable enumerable and not string)
        {
            var items = new List<string>();
            foreach (var item in enumerable) items.Add(Convert.ToString(item) ?? "");
            return "[" + string.Join(", ", items) + "]";
        }
        return Convert.ToString(value) ?? "";
    }

    private sealed class Writer : TextWriter
    {
        private readonly TextWriter inner;
        private readonly StringBuilder captured;

        public Writer(TextWriter inner, StringBuilder captured)
        {
            this.inner = inner;
            this.captured = captured;
        }

        public override Encoding Encoding => inner.Encoding;

        public override void Write(char value) => inner.Write(value);

        public override void Write(string? value)
        {
            if (string.IsNullOrEmpty(value)) return;
            inner.Write(value);
            captured.Append(value);
        }

        public override void WriteLine(string? value)
        {
            inner.WriteLine(value);
            if (!string.IsNullOrEmpty(value))
            {
                if (captured.Length > 0) captured.Append('\n');
                captured.Append(value);
            }
        }
    }
}
