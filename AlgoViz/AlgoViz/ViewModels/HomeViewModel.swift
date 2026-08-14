import Foundation

@MainActor
final class HomeViewModel: ObservableObject {
    @Published private(set) var topicsByCategory: [(TopicCategory, [Topic])] = []

    init() {
        topicsByCategory = TopicCategory.allCases.map { category in
            (category, TopicCatalog.topics(for: category))
        }
    }

    var availableCount: Int {
        TopicCatalog.all.filter(\.isAvailable).count
    }

    var totalCount: Int {
        TopicCatalog.all.count
    }
}
