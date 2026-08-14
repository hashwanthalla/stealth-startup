import SwiftUI

struct VisualizationDetailView: View {
    @StateObject private var viewModel: VisualizationViewModel

    init(topic: Topic) {
        _viewModel = StateObject(wrappedValue: VisualizationViewModel(topic: topic))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                overviewCard

                if let step = viewModel.currentStep {
                    ArrayBarChartView(
                        values: step.values,
                        highlights: step.highlights,
                        highlightKind: step.highlightKind
                    )
                    .padding(20)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                }

                PlaybackControlsView(viewModel: viewModel)
            }
            .padding(20)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(viewModel.topic.title)
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear {
            viewModel.stop()
        }
    }

    private var overviewCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label(viewModel.topic.category.title, systemImage: viewModel.topic.category.icon)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(viewModel.topic.category.color)

                Spacer()

                Text(viewModel.topic.difficulty.title)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(.tertiarySystemFill))
                    .clipShape(Capsule())
            }

            Text(viewModel.topic.overview)
                .font(.body)
                .foregroundStyle(.secondary)

            Text(viewModel.topic.complexity)
                .font(.footnote.weight(.medium))
                .foregroundStyle(.primary)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

#Preview {
    NavigationStack {
        VisualizationDetailView(topic: TopicCatalog.all[0])
    }
}
