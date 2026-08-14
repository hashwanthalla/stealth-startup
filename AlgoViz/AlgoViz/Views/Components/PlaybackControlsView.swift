import SwiftUI

struct PlaybackControlsView: View {
    @ObservedObject var viewModel: VisualizationViewModel

    var body: some View {
        VStack(spacing: 16) {
            ProgressView(value: viewModel.progress)
                .tint(.accentColor)

            HStack(spacing: 20) {
                Button(action: viewModel.reset) {
                    Image(systemName: "arrow.counterclockwise")
                }
                .buttonStyle(ControlButtonStyle())

                Button(action: viewModel.stepBackward) {
                    Image(systemName: "backward.fill")
                }
                .buttonStyle(ControlButtonStyle())
                .disabled(!viewModel.canStepBackward)

                Button(action: viewModel.togglePlayback) {
                    Image(systemName: viewModel.isPlaying ? "pause.fill" : "play.fill")
                        .font(.title2)
                }
                .buttonStyle(PrimaryControlButtonStyle())
                .disabled(viewModel.steps.isEmpty)

                Button(action: viewModel.stepForward) {
                    Image(systemName: "forward.fill")
                }
                .buttonStyle(ControlButtonStyle())
                .disabled(!viewModel.canStepForward)
            }

            if let step = viewModel.currentStep {
                Text("Step \(viewModel.currentStepIndex + 1) of \(viewModel.steps.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(step.message)
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 4)
            }
        }
        .padding(20)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

private struct ControlButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.title3)
            .frame(width: 44, height: 44)
            .background(Color(.secondarySystemBackground))
            .clipShape(Circle())
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

private struct PrimaryControlButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: 56, height: 56)
            .background(Color.accentColor)
            .foregroundStyle(.white)
            .clipShape(Circle())
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}
