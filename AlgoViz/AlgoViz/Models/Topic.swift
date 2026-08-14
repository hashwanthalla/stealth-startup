import Foundation

enum VisualizationKind: String, Codable {
    case bubbleSort
    case binarySearch
    case comingSoon
}

struct Topic: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let category: TopicCategory
    let difficulty: Difficulty
    let visualization: VisualizationKind
    let overview: String
    let complexity: String

    enum Difficulty: String, CaseIterable {
        case beginner
        case intermediate
        case advanced

        var title: String {
            rawValue.capitalized
        }
    }

    var isAvailable: Bool {
        visualization != .comingSoon
    }
}
