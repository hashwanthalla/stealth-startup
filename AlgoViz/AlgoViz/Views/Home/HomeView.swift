import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    header

                    ForEach(viewModel.topicsByCategory, id: \.0) { category, topics in
                        VStack(alignment: .leading, spacing: 12) {
                            Label(category.title, systemImage: category.icon)
                                .font(.title3.weight(.semibold))
                                .foregroundStyle(category.color)

                            LazyVGrid(
                                columns: [GridItem(.flexible()), GridItem(.flexible())],
                                spacing: 14
                            ) {
                                ForEach(topics) { topic in
                                    if topic.isAvailable {
                                        NavigationLink(value: topic) {
                                            TopicCard(topic: topic)
                                        }
                                        .buttonStyle(.plain)
                                    } else {
                                        TopicCard(topic: topic)
                                            .opacity(0.72)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("AlgoViz")
            .navigationDestination(for: Topic.self) { topic in
                VisualizationDetailView(topic: topic)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Learn DSA visually")
                .font(.largeTitle.bold())

            Text("Step through algorithms and data structures with interactive animations. \(viewModel.availableCount) lessons ready, \(viewModel.totalCount) planned.")
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 8)
    }
}

#Preview {
    HomeView()
}
