import Foundation
import Combine

@MainActor
final class VisualizationViewModel: ObservableObject {
    @Published private(set) var steps: [VisualizationStep] = []
    @Published private(set) var currentStepIndex = 0
    @Published private(set) var isPlaying = false

    private var playbackTask: Task<Void, Never>?

    let topic: Topic

    init(topic: Topic) {
        self.topic = topic
        loadVisualization()
    }

    var currentStep: VisualizationStep? {
        guard steps.indices.contains(currentStepIndex) else { return nil }
        return steps[currentStepIndex]
    }

    var canStepBackward: Bool {
        currentStepIndex > 0
    }

    var canStepForward: Bool {
        currentStepIndex < steps.count - 1
    }

    var progress: Double {
        guard steps.count > 1 else { return steps.isEmpty ? 0 : 1 }
        return Double(currentStepIndex) / Double(steps.count - 1)
    }

    func loadVisualization() {
        stop()
        guard let simulator = AlgorithmSimulatorFactory.make(for: topic.visualization) else {
            steps = []
            currentStepIndex = 0
            return
        }

        steps = simulator.generateSteps()
        currentStepIndex = 0
    }

    func reset() {
        stop()
        currentStepIndex = 0
    }

    func stepBackward() {
        stop()
        guard canStepBackward else { return }
        currentStepIndex -= 1
    }

    func stepForward() {
        stop()
        guard canStepForward else { return }
        currentStepIndex += 1
    }

    func togglePlayback() {
        isPlaying ? stop() : play()
    }

    func play() {
        guard canStepForward else { return }
        isPlaying = true
        playbackTask?.cancel()
        playbackTask = Task {
            while !Task.isCancelled, canStepForward {
                try? await Task.sleep(for: .milliseconds(850))
                guard !Task.isCancelled else { break }
                currentStepIndex += 1
                if !canStepForward {
                    stop()
                }
            }
        }
    }

    func stop() {
        isPlaying = false
        playbackTask?.cancel()
        playbackTask = nil
    }

    deinit {
        playbackTask?.cancel()
    }
}
