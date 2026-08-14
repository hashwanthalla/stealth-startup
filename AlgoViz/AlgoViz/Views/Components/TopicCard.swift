import SwiftUI

struct TopicCard: View {
    let topic: Topic

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(topic.difficulty.title)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(topic.category.color.opacity(0.15))
                    .foregroundStyle(topic.category.color)
                    .clipShape(Capsule())

                Spacer()

                if topic.isAvailable {
                    Image(systemName: "play.circle.fill")
                        .foregroundStyle(topic.category.color)
                } else {
                    Text("Soon")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }

            Text(topic.title)
                .font(.headline)
                .foregroundStyle(.primary)

            Text(topic.subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(topic.category.color.opacity(0.15), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.04), radius: 8, y: 4)
    }
}

#Preview {
    TopicCard(topic: TopicCatalog.all[0])
        .padding()
        .background(Color(.systemGroupedBackground))
}
