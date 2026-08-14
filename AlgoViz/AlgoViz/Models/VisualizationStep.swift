import Foundation

enum StepHighlight: Hashable {
    case compare(Int, Int)
    case active(Int)
    case sorted(Int)
    case found(Int)
    case range(Int, Int)
    case none
}

struct VisualizationStep: Identifiable, Hashable {
    let id = UUID()
    let values: [Int]
    let message: String
    let highlights: Set<Int>
    let highlightKind: StepHighlight

    init(
        values: [Int],
        message: String,
        highlights: Set<Int> = [],
        highlightKind: StepHighlight = .none
    ) {
        self.values = values
        self.message = message
        self.highlights = highlights
        self.highlightKind = highlightKind
    }
}
