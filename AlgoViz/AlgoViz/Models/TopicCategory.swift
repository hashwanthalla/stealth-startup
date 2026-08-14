import SwiftUI

enum TopicCategory: String, CaseIterable, Identifiable, Codable {
    case arrays
    case sorting
    case searching
    case linkedLists
    case trees
    case graphs

    var id: String { rawValue }

    var title: String {
        switch self {
        case .arrays: "Arrays"
        case .sorting: "Sorting"
        case .searching: "Searching"
        case .linkedLists: "Linked Lists"
        case .trees: "Trees"
        case .graphs: "Graphs"
        }
    }

    var icon: String {
        switch self {
        case .arrays: "square.grid.3x3.fill"
        case .sorting: "arrow.up.arrow.down"
        case .searching: "magnifyingglass"
        case .linkedLists: "link"
        case .trees: "tree.fill"
        case .graphs: "point.3.connected.trianglepath.dotted"
        }
    }

    var color: Color {
        switch self {
        case .arrays: .blue
        case .sorting: .purple
        case .searching: .orange
        case .linkedLists: .teal
        case .trees: .green
        case .graphs: .pink
        }
    }
}
