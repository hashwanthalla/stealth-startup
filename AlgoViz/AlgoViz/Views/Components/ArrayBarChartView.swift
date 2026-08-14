import SwiftUI

struct ArrayBarChartView: View {
    let values: [Int]
    let highlights: Set<Int>
    let highlightKind: StepHighlight

    private var maxValue: Int {
        max(values.max() ?? 1, 1)
    }

    var body: some View {
        GeometryReader { geometry in
            HStack(alignment: .bottom, spacing: 10) {
                ForEach(Array(values.enumerated()), id: \.offset) { index, value in
                    VStack(spacing: 8) {
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(barColor(for: index))
                            .frame(
                                height: max(24, CGFloat(value) / CGFloat(maxValue) * (geometry.size.height - 36))
                            )
                            .overlay {
                                if highlights.contains(index) {
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .strokeBorder(Color.white.opacity(0.9), lineWidth: 2)
                                }
                            }
                            .animation(.spring(response: 0.35, dampingFraction: 0.8), value: values)
                            .animation(.easeInOut(duration: 0.2), value: highlights)

                        Text("\(value)")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
        .frame(height: 220)
    }

    private func barColor(for index: Int) -> Color {
        if highlights.contains(index) {
            switch highlightKind {
            case .found:
                return .green
            case .sorted:
                return .mint
            case .compare, .active, .range:
                return .orange
            case .none:
                return .accentColor
            }
        }

        return Color.accentColor.opacity(0.55)
    }
}

#Preview {
    ArrayBarChartView(
        values: [64, 34, 25, 12, 22, 11, 90],
        highlights: [1, 2],
        highlightKind: .compare(1, 2)
    )
    .padding()
}
