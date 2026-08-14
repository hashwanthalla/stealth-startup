import Foundation

protocol AlgorithmSimulator {
    var initialValues: [Int] { get }
    func generateSteps() -> [VisualizationStep]
}

enum AlgorithmSimulatorFactory {
    static func make(for kind: VisualizationKind, values: [Int]? = nil) -> AlgorithmSimulator? {
        switch kind {
        case .bubbleSort:
            return BubbleSortSimulator(values: values ?? [64, 34, 25, 12, 22, 11, 90])
        case .binarySearch:
            return BinarySearchSimulator(
                values: values ?? [11, 12, 22, 25, 34, 64, 90],
                target: 25
            )
        case .comingSoon:
            return nil
        }
    }
}
