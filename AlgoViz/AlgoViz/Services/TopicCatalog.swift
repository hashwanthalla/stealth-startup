import Foundation

enum TopicCatalog {
    static let all: [Topic] = [
        Topic(
            id: "bubble-sort",
            title: "Bubble Sort",
            subtitle: "Compare and swap neighbors",
            category: .sorting,
            difficulty: .beginner,
            visualization: .bubbleSort,
            overview: "Bubble sort repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order.",
            complexity: "Time: O(n²) · Space: O(1)"
        ),
        Topic(
            id: "binary-search",
            title: "Binary Search",
            subtitle: "Divide the search space",
            category: .searching,
            difficulty: .beginner,
            visualization: .binarySearch,
            overview: "Binary search finds a target value in a sorted array by repeatedly halving the search interval.",
            complexity: "Time: O(log n) · Space: O(1)"
        ),
        Topic(
            id: "array-basics",
            title: "Array Basics",
            subtitle: "Indexed collections",
            category: .arrays,
            difficulty: .beginner,
            visualization: .comingSoon,
            overview: "Learn how arrays store elements in contiguous memory with constant-time index access.",
            complexity: "Access: O(1) · Insert: O(n)"
        ),
        Topic(
            id: "linked-list",
            title: "Linked List",
            subtitle: "Nodes and pointers",
            category: .linkedLists,
            difficulty: .intermediate,
            visualization: .comingSoon,
            overview: "Linked lists connect nodes through references, making insertions efficient at known positions.",
            complexity: "Access: O(n) · Insert: O(1)"
        ),
        Topic(
            id: "binary-tree",
            title: "Binary Tree",
            subtitle: "Hierarchical structure",
            category: .trees,
            difficulty: .intermediate,
            visualization: .comingSoon,
            overview: "Binary trees organize data hierarchically with at most two children per node.",
            complexity: "Traversal: O(n)"
        ),
        Topic(
            id: "bfs",
            title: "Breadth-First Search",
            subtitle: "Explore level by level",
            category: .graphs,
            difficulty: .advanced,
            visualization: .comingSoon,
            overview: "BFS visits graph nodes layer by layer using a queue.",
            complexity: "Time: O(V + E)"
        )
    ]

    static func topics(for category: TopicCategory) -> [Topic] {
        all.filter { $0.category == category }
    }
}
